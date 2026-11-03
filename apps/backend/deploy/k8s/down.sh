#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SH="$DIR/platform/install.sh"
NAMESPACE=chess
EXPECTED_CONTEXT="${KUBE_CONTEXT:-docker-desktop}"
DELETE_TIMEOUT="${DELETE_TIMEOUT:-180s}"

CRD_PATTERN='(cnpg\.io|monitoring\.coreos\.com|gateway\.envoyproxy\.io|gateway\.networking\.k8s\.io|gateway\.networking\.x-k8s\.io|rabbitmq\.com|cert-manager\.io)$'

DATA=0
PLATFORM=0
IMAGES=0
ASSUME_YES=0
STEP=0
TOTAL_STEPS=0
FAILURES=0
START_TIME=$SECONDS
CURRENT=""

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
Usage: deploy/k8s/down.sh [options]

Default: removes the chess services (core, game-svc, redis, gateway, config
and secret) and keeps Postgres, Redis data and the platform.

Options:
  --data        also delete the Postgres cluster (and a RabbitMQ cluster left
                by an older install) and every volume in the '$NAMESPACE'
                namespace (users and games are lost)
  --platform    remove everything: --data plus monitoring, operators, gateway,
                cert-manager, their CRDs and namespaces
  --images      also remove the local chess-backend docker images
  -y, --yes     do not ask for confirmation
  -h, --help    show this help

Environment:
  KUBE_CONTEXT     expected kubectl context (default: docker-desktop)
  DELETE_TIMEOUT   per-resource delete timeout (default: 180s)
EOF
}

on_error() {
  local code=$? line=$1
  trap - ERR
  printf '\n%sfailed at step %d/%d (%s), script line %s, after %ds%s\n' "$RED$BOLD" "$STEP" "$TOTAL_STEPS" "${CURRENT:-unknown}" "$line" "$((SECONDS - START_TIME))" "$RESET" >&2
  printf 'the script is safe to re-run.\n' >&2
  exit "$code"
}

trap 'on_error $LINENO' ERR
trap 'printf "\n%sinterrupted%s\n" "$YELLOW" "$RESET" >&2; exit 130' INT TERM

while [ $# -gt 0 ]; do
  case "$1" in
    --data) DATA=1 ;;
    --platform)
      PLATFORM=1
      DATA=1
      ;;
    --images) IMAGES=1 ;;
    -y | --yes) ASSUME_YES=1 ;;
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

run() {
  if ! "$@"; then
    FAILURES=$((FAILURES + 1))
    warn "failed: $*"
  fi
}

crd_exists() {
  kubectl get crd "$1" >/dev/null 2>&1
}

LEGACY_RABBITMQ_OPERATOR_VERSION=v2.23.0
LEGACY_RABBITMQ_TOPOLOGY_OPERATOR_VERSION=v1.17.0

version_of() {
  sed -n "s/^$1=//p" "$INSTALL_SH" | head -n 1
}

uninstall_release() {
  local name=$1 ns=$2
  if helm status "$name" -n "$ns" >/dev/null 2>&1; then
    info "helm uninstall $name ($ns)"
    run helm uninstall "$name" -n "$ns" --wait --timeout "$DELETE_TIMEOUT"
  else
    info "helm release $name not installed"
  fi
}

delete_namespace() {
  local ns=$1
  if kubectl get namespace "$ns" >/dev/null 2>&1; then
    info "deleting namespace $ns"
    run kubectl delete namespace "$ns" --wait=true --timeout="$DELETE_TIMEOUT"
  else
    info "namespace $ns not present"
  fi
}

TOTAL_STEPS=2
[ "$DATA" -eq 1 ] && TOTAL_STEPS=$((TOTAL_STEPS + 1))
[ "$PLATFORM" -eq 1 ] && TOTAL_STEPS=$((TOTAL_STEPS + 1))
[ "$IMAGES" -eq 1 ] && TOTAL_STEPS=$((TOTAL_STEPS + 1))

step "Checking prerequisites"
for bin in kubectl sed; do
  command -v "$bin" >/dev/null 2>&1 || die "$bin is not installed or not on PATH"
done
if [ "$PLATFORM" -eq 1 ]; then
  command -v helm >/dev/null 2>&1 || die "helm is not installed or not on PATH"
  [ -f "$INSTALL_SH" ] || die "$INSTALL_SH not found"
fi
if [ "$IMAGES" -eq 1 ]; then
  command -v docker >/dev/null 2>&1 || die "docker is not installed or not on PATH"
  docker info >/dev/null 2>&1 || die "the Docker daemon is not running"
fi
kubectl cluster-info >/dev/null 2>&1 || die "cannot reach a Kubernetes cluster" "start Docker Desktop Kubernetes and retry"

context="$(kubectl config current-context 2>/dev/null || echo none)"
if [ "$context" != "$EXPECTED_CONTEXT" ]; then
  die "kubectl context is '$context', expected '$EXPECTED_CONTEXT'" "switch with: kubectl config use-context $EXPECTED_CONTEXT   (or set KUBE_CONTEXT=$context to target it)"
fi
info "context: $context"

if [ "$DATA" -eq 1 ] && [ "$ASSUME_YES" -eq 0 ]; then
  if [ ! -t 0 ]; then
    die "refusing to delete data without a terminal" "re-run with --yes"
  fi
  if [ "$PLATFORM" -eq 1 ]; then
    printf '  %sThis deletes ALL chess services, data, monitoring, operators and CRDs on "%s".%s\n' "$RED$BOLD" "$context" "$RESET"
  else
    printf '  %sThis deletes the services plus Postgres and all volumes in "%s" on "%s".%s\n' "$RED$BOLD" "$NAMESPACE" "$context" "$RESET"
  fi
  printf '  Type %syes%s to continue: ' "$BOLD" "$RESET"
  read -r answer
  [ "$answer" = "yes" ] || die "aborted"
fi
ok "ready"

step "Removing chess services"
if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
  run kubectl -n "$NAMESPACE" delete \
    httproute/core gateway/chess \
    horizontalpodautoscaler/core horizontalpodautoscaler/game-svc \
    poddisruptionbudget/core poddisruptionbudget/game-svc \
    deployment/core deployment/game-svc \
    service/core service/game-svc-grpc service/redis statefulset/redis \
    configmap/chess-config secret/chess-secrets \
    --ignore-not-found --wait=true --timeout="$DELETE_TIMEOUT"
  ok "services removed (namespace, Postgres and Redis volume kept)"
else
  info "namespace $NAMESPACE not present, nothing to remove"
fi

if [ "$DATA" -eq 1 ]; then
  step "Removing Postgres and volumes"
  if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    if crd_exists users.rabbitmq.com; then
      run kubectl -n "$NAMESPACE" delete permission.rabbitmq.com,user.rabbitmq.com --all --ignore-not-found --timeout=60s
    fi
    if crd_exists rabbitmqclusters.rabbitmq.com; then
      run kubectl -n "$NAMESPACE" delete rabbitmqcluster.rabbitmq.com --all --ignore-not-found --wait=true --timeout="$DELETE_TIMEOUT"
    fi
    if crd_exists clusters.postgresql.cnpg.io; then
      run kubectl -n "$NAMESPACE" delete cluster.postgresql.cnpg.io --all --ignore-not-found --wait=true --timeout="$DELETE_TIMEOUT"
    fi
    run kubectl -n "$NAMESPACE" delete podmonitor.monitoring.coreos.com --all --ignore-not-found --timeout=60s
    run kubectl -n "$NAMESPACE" delete pvc --all --ignore-not-found --wait=true --timeout="$DELETE_TIMEOUT"
    ok "data removed"
  else
    info "namespace $NAMESPACE not present, nothing to remove"
  fi
fi

if [ "$PLATFORM" -eq 1 ]; then
  step "Removing the platform"

  if kubectl get namespace rabbitmq-system >/dev/null 2>&1; then
    rabbitmq_operator="$LEGACY_RABBITMQ_OPERATOR_VERSION"
    rabbitmq_topology="$LEGACY_RABBITMQ_TOPOLOGY_OPERATOR_VERSION"
  else
    rabbitmq_operator=""
    rabbitmq_topology=""
  fi
  if [ -n "$rabbitmq_topology" ]; then
    info "rabbitmq topology operator $rabbitmq_topology"
    run kubectl delete --ignore-not-found --timeout=120s -f "https://github.com/rabbitmq/messaging-topology-operator/releases/download/$rabbitmq_topology/messaging-topology-operator-with-certmanager.yaml"
  fi
  if [ -n "$rabbitmq_operator" ]; then
    info "rabbitmq cluster operator $rabbitmq_operator"
    run kubectl delete --ignore-not-found --timeout=120s -f "https://github.com/rabbitmq/cluster-operator/releases/download/$rabbitmq_operator/cluster-operator.yml"
  fi

  uninstall_release eg envoy-gateway-system
  uninstall_release cnpg cnpg-system
  uninstall_release headlamp kube-system
  uninstall_release otel-collector monitoring
  uninstall_release loki monitoring
  uninstall_release tempo monitoring
  uninstall_release kube-prometheus-stack monitoring
  uninstall_release cert-manager cert-manager

  info "deleting custom resource definitions"
  crds="$(kubectl get crd -o name 2>/dev/null | grep -E "$CRD_PATTERN" || true)"
  if [ -n "$crds" ]; then
    run kubectl delete $crds --ignore-not-found --timeout="$DELETE_TIMEOUT"
  fi

  for ns in monitoring cert-manager cnpg-system envoy-gateway-system rabbitmq-system "$NAMESPACE"; do
    delete_namespace "$ns"
  done
  ok "platform removed"
fi

if [ "$IMAGES" -eq 1 ]; then
  step "Removing local images"
  images="$(docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^chess-backend(-migrate)?:' || true)"
  if [ -n "$images" ]; then
    while IFS= read -r image; do
      info "removing $image"
      run docker image rm "$image"
    done <<<"$images"
  else
    info "no chess-backend images found"
  fi
  ok "images removed"
fi

trap - ERR
if [ "$FAILURES" -gt 0 ]; then
  printf '\n%sFinished with %d failed operation(s) in %ds%s\n' "$YELLOW$BOLD" "$FAILURES" "$((SECONDS - START_TIME))" "$RESET" >&2
  printf 'inspect leftovers with: kubectl get pods -A; kubectl get ns; kubectl get crd\n' >&2
  printf 'a namespace stuck in Terminating usually has a resource with a finalizer: kubectl get all -n <ns>\n' >&2
  exit 1
fi
printf '\n%sDone in %ds%s\n' "$GREEN$BOLD" "$((SECONDS - START_TIME))" "$RESET"
if [ "$PLATFORM" -eq 0 ]; then
  printf 'secrets file and Redis data were kept; bring the services back with: ./deploy/k8s/up.sh --skip-platform\n'
fi
