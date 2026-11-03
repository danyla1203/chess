#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
APPS="$DIR/apps"
NAMESPACE=chess
EXPECTED_CONTEXT="${KUBE_CONTEXT:-docker-desktop}"
STATE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/chess"
source "$DIR/secrets-lib.sh"
TAG_FILE="$STATE_DIR/last-tag"
HOSTS_FILE="$STATE_DIR/last-hosts"
BACKEND_DOCKERFILE="$ROOT/apps/backend/Dockerfile.prod"
FRONTEND_DOCKERFILE="$ROOT/apps/frontend/Dockerfile"
WEB_HOST="${CHESS_WEB_HOST:-chess.localhost}"
API_HOST="${CHESS_API_HOST:-api.chess.localhost}"
PUBLIC_SCHEME="${CHESS_PUBLIC_SCHEME:-http}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"
MIN_DOCKER_MEM=$((8 * 1024 * 1024 * 1024))

TOTAL_STEPS=8
STEP=0
START_TIME=$SECONDS
SKIP_PLATFORM=0
SKIP_BUILD=0
TAG=""

if [ -t 1 ]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  CYAN=$'\033[1;36m'
  RESET=$'\033[0m'
else
  BOLD='' DIM='' RED='' GREEN='' YELLOW='' CYAN='' RESET=''
fi

step() {
  STEP=$((STEP + 1))
  CURRENT="$1"
  printf '\n%s[%d/%d]%s %s%s%s %s(+%ds)%s\n' "$CYAN" "$STEP" "$TOTAL_STEPS" "$RESET" "$BOLD" "$1" "$RESET" "$DIM" "$((SECONDS - START_TIME))" "$RESET"
}

info() { printf '  %s->%s %s\n' "$DIM" "$RESET" "$1"; }
ok() { printf '  %sok%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %swarn%s %s\n' "$YELLOW" "$RESET" "$1" >&2; }

die() {
  printf '\n%serror:%s %s\n' "$RED" "$RESET" "$1" >&2
  if [ -n "${2:-}" ]; then
    printf '%s%s%s\n' "$DIM" "$2" "$RESET" >&2
  fi
  trap - ERR
  exit 1
}

usage() {
  cat <<EOF
Usage: deploy/k8s/up.sh [options]

Installs the platform, builds the images, and deploys the chess services and
the frontend to
the local Docker Desktop Kubernetes cluster.

Options:
  --skip-platform   do not run platform/install.sh (already installed)
  --skip-build      reuse the images from the previous run
  -h, --help        show this help

Environment:
  KUBE_CONTEXT         expected kubectl context (default: docker-desktop)
  CHESS_SECRETS_FILE   KEY=VALUE file for chess-secrets (default: $SECRETS_FILE)
  ROLLOUT_TIMEOUT      per-workload rollout timeout (default: 300s)
  CHESS_WEB_HOST       hostname the frontend HTTPRoute serves (default: chess.localhost)
  CHESS_API_HOST       hostname the browser uses for REST and Socket.IO (default: api.chess.localhost)
  CHESS_PUBLIC_SCHEME  scheme baked into the frontend URLs (default: http)

The NEXT_PUBLIC_* values are inlined into the frontend bundle at build time:
changing the hosts needs a rebuild (no --skip-build).
EOF
}

diagnose() {
  printf '\n%sdiagnostics for namespace %s%s\n' "$BOLD" "$NAMESPACE" "$RESET" >&2
  kubectl -n "$NAMESPACE" get pods -o wide >&2 || true
  printf '\n%slast events%s\n' "$BOLD" "$RESET" >&2
  kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp 2>/dev/null | tail -n 15 >&2 || true
  for workload in core game-svc frontend; do
    printf '\n%slogs: %s%s\n' "$BOLD" "$workload" "$RESET" >&2
    kubectl -n "$NAMESPACE" logs "deploy/$workload" --all-containers --prefix --tail=20 >&2 2>&1 || true
  done
}

on_error() {
  local code=$? line=$1
  trap - ERR
  printf '\n%sfailed at step %d/%d (%s), script line %s, after %ds%s\n' "$RED$BOLD" "$STEP" "$TOTAL_STEPS" "${CURRENT:-unknown}" "$line" "$((SECONDS - START_TIME))" "$RESET" >&2
  if [ "$STEP" -ge 5 ] && command -v kubectl >/dev/null 2>&1; then
    diagnose
  fi
  printf '\nfix the problem and re-run; completed work is skipped or re-applied safely.\n' >&2
  exit "$code"
}

trap 'on_error $LINENO' ERR
trap 'printf "\n%sinterrupted%s\n" "$YELLOW" "$RESET" >&2; exit 130' INT TERM

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-platform) SKIP_PLATFORM=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown option: $1"
      ;;
  esac
  shift
done

wait_for_secret() {
  local name=$1 timeout=${2:-180} waited=0
  while ! kubectl -n "$NAMESPACE" get secret "$name" >/dev/null 2>&1; do
    if [ "$waited" -ge "$timeout" ]; then
      return 1
    fi
    sleep 3
    waited=$((waited + 3))
  done
}

step "Checking prerequisites"
for bin in kubectl helm docker openssl sed; do
  command -v "$bin" >/dev/null 2>&1 || die "$bin is not installed or not on PATH"
done
docker info >/dev/null 2>&1 || die "the Docker daemon is not running" "start Docker Desktop and retry"
kubectl cluster-info >/dev/null 2>&1 || die "cannot reach a Kubernetes cluster" "Docker Desktop -> Settings -> Kubernetes -> Enable Kubernetes, then wait until it shows running"

context="$(kubectl config current-context 2>/dev/null || echo none)"
if [ "$context" != "$EXPECTED_CONTEXT" ]; then
  die "kubectl context is '$context', expected '$EXPECTED_CONTEXT'" "switch with: kubectl config use-context $EXPECTED_CONTEXT   (or set KUBE_CONTEXT=$context to deploy there)"
fi
info "context: $context"

kubectl wait --for=condition=Ready node --all --timeout=60s >/dev/null 2>&1 || die "the cluster nodes are not Ready" "check: kubectl get nodes"

default_sc="$(kubectl get storageclass -o jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].metadata.name}' 2>/dev/null || true)"
[ -n "$default_sc" ] || die "no default StorageClass" "Postgres, Redis and the monitoring stack need persistent volumes"
info "default StorageClass: $default_sc"

[ -f "$BACKEND_DOCKERFILE" ] || die "$BACKEND_DOCKERFILE not found"
[ -f "$FRONTEND_DOCKERFILE" ] || die "$FRONTEND_DOCKERFILE not found"

docker_mem="$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)"
if [ "$docker_mem" -lt "$MIN_DOCKER_MEM" ]; then
  warn "Docker Desktop has $((docker_mem / 1024 / 1024 / 1024)) GiB RAM; the full stack wants 8 GiB or more (Settings -> Resources)"
fi
ok "prerequisites satisfied"

step "Installing the platform"
if [ "$SKIP_PLATFORM" -eq 1 ]; then
  info "skipped (--skip-platform)"
else
  "$DIR/platform/install.sh"
fi
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || die "namespace '$NAMESPACE' does not exist" "run without --skip-platform"
kubectl -n "$NAMESPACE" get cluster.postgresql.cnpg.io postgres >/dev/null 2>&1 || die "Postgres cluster chess/postgres not found" "run without --skip-platform"
kubectl get gatewayclass eg >/dev/null 2>&1 || die "GatewayClass 'eg' not found" "run without --skip-platform"
ok "platform present"

step "Building images"
mkdir -p "$STATE_DIR"
if [ "$SKIP_BUILD" -eq 1 ]; then
  [ -f "$TAG_FILE" ] || die "no previous build recorded" "run without --skip-build"
  TAG="$(cat "$TAG_FILE")"
  info "reusing tag $TAG"
  if [ -f "$HOSTS_FILE" ]; then
    read -r WEB_HOST API_HOST PUBLIC_SCHEME <"$HOSTS_FILE"
    info "frontend was built for $PUBLIC_SCHEME://$WEB_HOST (API $PUBLIC_SCHEME://$API_HOST)"
  fi
else
  TAG="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
  if [ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null || true)" ]; then
    TAG="$TAG-$(date +%s)"
  fi
  info "tag: $TAG"
  info "frontend: $PUBLIC_SCHEME://$WEB_HOST, API: $PUBLIC_SCHEME://$API_HOST"
  docker build -f "$BACKEND_DOCKERFILE" --target runtime -t "chess-backend:$TAG" "$ROOT"
  docker build -f "$BACKEND_DOCKERFILE" --target migrate -t "chess-backend-migrate:$TAG" "$ROOT"
  docker build -f "$FRONTEND_DOCKERFILE" \
    --build-arg "NEXT_PUBLIC_API_HOST=$PUBLIC_SCHEME://$API_HOST" \
    --build-arg "NEXT_PUBLIC_WS_HOST=$PUBLIC_SCHEME://$API_HOST" \
    --build-arg "NEXT_PUBLIC_HOST=$PUBLIC_SCHEME://$WEB_HOST" \
    -t "chess-frontend:$TAG" "$ROOT"
  printf '%s' "$TAG" >"$TAG_FILE"
  printf '%s %s %s\n' "$WEB_HOST" "$API_HOST" "$PUBLIC_SCHEME" >"$HOSTS_FILE"
fi
for image in "chess-backend:$TAG" "chess-backend-migrate:$TAG" "chess-frontend:$TAG"; do
  docker image inspect "$image" >/dev/null 2>&1 || die "image $image not found locally"
done
ok "images chess-backend:$TAG, chess-backend-migrate:$TAG and chess-frontend:$TAG"

step "Creating secrets"
apply_infra_secrets
grep -Eq '^JWT_SECRET=.+' "$SECRETS_FILE" || die "JWT_SECRET is empty in $SECRETS_FILE"
if grep -q '^JWT_SECRET=change-me$' "$SECRETS_FILE"; then
  die "JWT_SECRET is still 'change-me' in $SECRETS_FILE"
fi
app_env="$(mktemp)"
grep -Ev "$INFRA_KEY_PATTERN" "$SECRETS_FILE" >"$app_env"
kubectl -n "$NAMESPACE" create secret generic chess-secrets --from-env-file="$app_env" --dry-run=client -o yaml | kubectl apply -f -
rm -f "$app_env"
ok "secret chess-secrets applied from $SECRETS_FILE"
ok "redis, postgres and grafana credentials applied from $SECRETS_FILE"

step "Deploying services"
manifest="$(kubectl kustomize "$APPS")"
manifest="$(printf '%s\n' "$manifest" | sed \
  -e "s#image: chess-backend-migrate:[^[:space:]]*#image: chess-backend-migrate:$TAG#" \
  -e "s#image: chess-backend:[^[:space:]]*#image: chess-backend:$TAG#" \
  -e "s#image: chess-frontend:[^[:space:]]*#image: chess-frontend:$TAG#" \
  -e "s#^\([[:space:]]*- \)chess\.localhost\$#\1$WEB_HOST#")"
grep -q "image: chess-backend:$TAG" <<<"$manifest" || die "failed to pin the image tag in the rendered manifests"
grep -q "image: chess-frontend:$TAG" <<<"$manifest" || die "failed to pin the frontend image tag in the rendered manifests"
grep -Eq "^[[:space:]]*- ${WEB_HOST//./\\.}\$" <<<"$manifest" || die "failed to set the frontend hostname in the rendered manifests"
printf '%s\n' "$manifest" | kubectl apply -f -
ok "manifests applied"

step "Waiting for database credentials"
info "waiting for secret postgres-app"
wait_for_secret postgres-app 240 || die "secret postgres-app was not created in time" "check: kubectl -n $NAMESPACE get cluster.postgresql.cnpg.io"
kubectl -n "$NAMESPACE" wait --for=condition=Ready cluster.postgresql.cnpg.io/postgres --timeout=300s >/dev/null
ok "postgres ready"

step "Waiting for rollouts"
kubectl -n "$NAMESPACE" rollout status statefulset/redis --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deployment/core --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deployment/game-svc --timeout="$ROLLOUT_TIMEOUT"
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout="$ROLLOUT_TIMEOUT"
ok "redis, core, game-svc and frontend are ready"

step "Finding the gateway address"
address=""
for _ in $(seq 1 20); do
  address="$(kubectl -n "$NAMESPACE" get gateway chess -o jsonpath='{.status.addresses[0].value}' 2>/dev/null || true)"
  [ -n "$address" ] && break
  sleep 3
done
if [ -n "$address" ]; then
  ok "gateway: http://$address"
else
  warn "gateway has no address yet; use the port-forward below"
fi

trap - ERR
printf '\n%sDone in %ds%s\n\n' "$GREEN$BOLD" "$((SECONDS - START_TIME))" "$RESET"
printf 'Pods:\n'
kubectl -n "$NAMESPACE" get pods
printf '\nAccess:\n'
printf '  Frontend:          %s://%s\n' "$PUBLIC_SCHEME" "$WEB_HOST"
printf '  API:               %s://%s/health/ready\n' "$PUBLIC_SCHEME" "$API_HOST"
if [ -n "$address" ]; then
  printf '  API via gateway:   curl http://%s/health/ready\n' "$address"
fi
printf '  API port-forward:  kubectl -n %s port-forward svc/core 9200:80\n' "$NAMESPACE"
printf '  Web port-forward:  kubectl -n %s port-forward svc/frontend 3000:80\n' "$NAMESPACE"
printf '  Grafana:           http://grafana.localhost\n'
printf '  Headlamp:          http://headlamp.localhost\n'
printf '  Grafana password:  kubectl -n monitoring get secret grafana-admin -o jsonpath="{.data.admin-password}" | base64 -d; echo\n'
printf '  Logs:              kubectl -n %s logs -f deploy/core\n' "$NAMESPACE"
