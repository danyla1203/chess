K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="${CHESS_SECRETS_FILE:-$K8S_DIR/secrets.env}"
APP_NAMESPACE=chess
MONITORING_NAMESPACE=monitoring
INFRA_KEYS="REDIS_PASSWORD GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD POSTGRES_PASSWORD"
INFRA_KEY_PATTERN='^(REDIS_PASSWORD|GRAFANA_ADMIN_USER|GRAFANA_ADMIN_PASSWORD|POSTGRES_PASSWORD|RABBITMQ_[A-Z_]+)='

declare -F info >/dev/null || info() { printf '  -> %s\n' "$1"; }
declare -F warn >/dev/null || warn() { printf '  warn %s\n' "$1" >&2; }

secret_get() {
  grep -m1 "^$1=" "$SECRETS_FILE" | cut -d= -f2- || true
}

secret_set() {
  local key=$1 tmp
  tmp="$(mktemp)"
  if grep -q "^$key=" "$SECRETS_FILE"; then
    VALUE="$2" awk -v k="$key" 'BEGIN { FS = "=" } $1 == k { print k "=" ENVIRON["VALUE"]; next } { print }' "$SECRETS_FILE" >"$tmp"
    cat "$tmp" >"$SECRETS_FILE"
  else
    printf '%s=%s\n' "$key" "$2" >>"$SECRETS_FILE"
  fi
  rm -f "$tmp"
}

urlencode() {
  local s=$1 i c out=''
  for ((i = 0; i < ${#s}; i++)); do
    c=${s:i:1}
    case $c in
      [a-zA-Z0-9.~_-]) out+=$c ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

ensure_secrets_file() {
  local key
  mkdir -p "$(dirname "$SECRETS_FILE")"
  if [ ! -f "$SECRETS_FILE" ]; then
    info "no secrets file, generating $SECRETS_FILE"
    sed -n 's/^  \([A-Z][A-Z0-9_]*\):.*/\1=/p' "$K8S_DIR/apps/secret.example.yaml" >"$SECRETS_FILE"
    chmod 600 "$SECRETS_FILE"
    secret_set JWT_SECRET "$(openssl rand -hex 32)"
    warn "Stripe, SendGrid and Google values are empty; edit $SECRETS_FILE and re-run to set them"
  fi
  for key in $INFRA_KEYS; do
    if [ -z "$(secret_get "$key")" ]; then
      case $key in
        GRAFANA_ADMIN_USER) secret_set "$key" admin ;;
        *) secret_set "$key" "$(openssl rand -hex 24)" ;;
      esac
      info "generated $key in $SECRETS_FILE"
    fi
  done
}

apply_secret() {
  local namespace=$1 name=$2 type=$3 args=() pair
  shift 3
  for pair in "$@"; do
    args+=("--from-literal=$pair")
  done
  kubectl -n "$namespace" create secret generic "$name" --type="$type" "${args[@]}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
}

create_secret_once() {
  local namespace=$1 name=$2 type=$3 password=$4 current
  shift 4
  if kubectl -n "$namespace" get secret "$name" >/dev/null 2>&1; then
    current="$(kubectl -n "$namespace" get secret "$name" -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || true)"
    if [ "$current" != "$password" ]; then
      warn "secret $namespace/$name already exists with a different password and was kept; it only applies on a fresh install (down.sh --data)"
    fi
    return 0
  fi
  apply_secret "$namespace" "$name" "$type" "$@"
}

apply_infra_secrets() {
  local redis_password postgres_password
  ensure_secrets_file
  kubectl create namespace "$APP_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl create namespace "$MONITORING_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  redis_password="$(secret_get REDIS_PASSWORD)"
  apply_secret "$APP_NAMESPACE" redis-credentials Opaque \
    "password=$redis_password" \
    "uri=redis://:$(urlencode "$redis_password")@redis:6379"

  apply_secret "$MONITORING_NAMESPACE" grafana-admin Opaque \
    "admin-user=$(secret_get GRAFANA_ADMIN_USER)" \
    "admin-password=$(secret_get GRAFANA_ADMIN_PASSWORD)"

  postgres_password="$(secret_get POSTGRES_PASSWORD)"
  create_secret_once "$APP_NAMESPACE" postgres-app kubernetes.io/basic-auth "$postgres_password" \
    "username=chess" \
    "password=$postgres_password" \
    "uri=postgresql://chess:$(urlencode "$postgres_password")@postgres-rw:5432/chess"
}
