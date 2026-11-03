#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALUES="$DIR/values"
source "$DIR/../secrets-lib.sh"
TOTAL_STEPS=12
STEP=0
START_TIME=$SECONDS

step() {
  STEP=$((STEP + 1))
  printf '\n\033[1;36m[%d/%d]\033[0m \033[1m%s\033[0m \033[2m(+%ds)\033[0m\n' "$STEP" "$TOTAL_STEPS" "$1" "$((SECONDS - START_TIME))"
}

info() {
  printf '  \033[2m->\033[0m %s\n' "$1"
}

ok() {
  printf '  \033[32mok\033[0m %s\n' "$1"
}

apply_with_retry() {
  for attempt in $(seq 1 30); do
    kubectl apply "$@" && return 0
    printf '  \033[33mapply failed (attempt %d/30)\033[0m, webhooks may still be starting; retrying in 5s\n' "$attempt"
    sleep 5
  done
  printf '  \033[31mapply failed after 30 attempts\033[0m\n' >&2
  return 1
}

trap 'printf "\n\033[1;31minstall failed at step %d/%d (%s) after %ds\033[0m\n" "$STEP" "$TOTAL_STEPS" "${CURRENT:-unknown}" "$((SECONDS - START_TIME))" >&2' ERR

if ! kubectl cluster-info >/dev/null 2>&1; then
  ctx="$(kubectl config current-context 2>/dev/null || echo none)"
  printf '\033[1;31mcannot reach a Kubernetes cluster\033[0m (currkent context: %s)\n' "$ctx" >&2
  printf 'start your cluster (e.g. minikube start / kind create cluster / Docker Desktop Kubernetes) and check: kubectl config get-contexts\n' >&2
  exit 1
fi
printf 'cluster: %s\n' "$(kubectl config current-context)"

KUBE_PROMETHEUS_STACK_VERSION=92.2.0
TEMPO_VERSION=1.24.4
LOKI_VERSION=7.3.0
OTEL_COLLECTOR_VERSION=0.175.1
HEADLAMP_VERSION=0.45.0
CERT_MANAGER_VERSION=v1.18.2
CNPG_CHART_VERSION=0.26.0
ENVOY_GATEWAY_VERSION=v1.5.0

CURRENT="helm repositories"
step "Configuring helm repositories"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo add jetstack https://charts.jetstack.io
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm repo update
ok "repositories ready"

CURRENT="namespaces and credentials"
step "Preparing namespaces and credentials"
apply_infra_secrets
ok "namespaces and credentials ready from $SECRETS_FILE"

CURRENT="kube-prometheus-stack"
step "Installing kube-prometheus-stack $KUBE_PROMETHEUS_STACK_VERSION"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --version "$KUBE_PROMETHEUS_STACK_VERSION" \
  -f "$VALUES/kube-prometheus-stack.yaml" --wait
ok "kube-prometheus-stack ready"

CURRENT="tempo"
step "Installing tempo $TEMPO_VERSION"
helm upgrade --install tempo grafana/tempo \
  --namespace monitoring --version "$TEMPO_VERSION" \
  -f "$VALUES/tempo.yaml" --wait
ok "tempo ready"

CURRENT="loki"
step "Installing loki $LOKI_VERSION"
helm upgrade --install loki grafana/loki \
  --namespace monitoring --version "$LOKI_VERSION" \
  -f "$VALUES/loki.yaml" --wait
ok "loki ready"

CURRENT="otel-collector"
step "Installing otel-collector $OTEL_COLLECTOR_VERSION"
helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
  --namespace monitoring --version "$OTEL_COLLECTOR_VERSION" \
  -f "$VALUES/otel-collector.yaml" --wait
ok "otel-collector ready"

CURRENT="headlamp"
step "Installing headlamp $HEADLAMP_VERSION"
helm upgrade --install headlamp headlamp/headlamp \
  --namespace kube-system --version "$HEADLAMP_VERSION" \
  -f "$VALUES/headlamp.yaml" --wait
ok "headlamp ready"

CURRENT="dashboards and alerts"
step "Applying dashboards and alert rules"
kubectl apply -k "$DIR/dashboards"
kubectl apply -f "$DIR/alerts/chess-alerts.yaml"
ok "dashboards and alerts applied"

CURRENT="cert-manager"
step "Installing cert-manager $CERT_MANAGER_VERSION"
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace --version "$CERT_MANAGER_VERSION" \
  --set crds.enabled=true --wait
ok "cert-manager ready"

CURRENT="cloudnative-pg operator"
step "Installing cloudnative-pg $CNPG_CHART_VERSION"
helm upgrade --install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system --create-namespace --version "$CNPG_CHART_VERSION" --wait
ok "cloudnative-pg ready"

CURRENT="envoy gateway"
step "Installing envoy gateway $ENVOY_GATEWAY_VERSION"
helm upgrade --install eg oci://docker.io/envoyproxy/gateway-helm \
  --namespace envoy-gateway-system --create-namespace --version "$ENVOY_GATEWAY_VERSION" --wait
apply_with_retry -f "$DIR/gateway/gateway-class.yaml"
apply_with_retry -f "$DIR/gateway/ui-routes.yaml"
ok "envoy gateway ready"

CURRENT="postgres cluster"
step "Creating postgres cluster"
apply_with_retry -k "$DIR/../postgres"
info "waiting up to 600s for cluster chess/postgres to become Ready"
kubectl -n chess wait cluster.postgresql.cnpg.io/postgres --for=condition=Ready --timeout=600s
ok "postgres ready"

trap - ERR
printf '\n\033[1;32mPlatform install complete in %ds\033[0m\n' "$((SECONDS - START_TIME))"
printf '\nNamespaces:\n'
kubectl get pods -A --no-headers 2>/dev/null | awk '{c[$1]++; if ($4 != "Running" && $4 != "Completed") n[$1]++} END {for (ns in c) printf "  %-24s %d pods, %d not running\n", ns, c[ns], n[ns]}' | sort
printf '\nNext steps:\n'
printf '  Grafana:           http://grafana.localhost\n'
printf '  Headlamp:          http://headlamp.localhost\n'
printf '  Grafana password:  kubectl -n monitoring get secret grafana-admin -o jsonpath="{.data.admin-password}" | base64 -d; echo\n'
printf '  Pod overview:      kubectl get pods -A\n'
