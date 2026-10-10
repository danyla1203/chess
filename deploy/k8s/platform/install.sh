#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALUES="$DIR/values"

KUBE_PROMETHEUS_STACK_VERSION=92.2.0
TEMPO_VERSION=1.24.4
LOKI_VERSION=7.3.0
OTEL_COLLECTOR_VERSION=0.175.1
HEADLAMP_VERSION=0.45.0
RABBITMQ_OPERATOR_VERSION=v2.23.0

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

if ! kubectl -n monitoring get secret grafana-admin >/dev/null 2>&1; then
  kubectl -n monitoring create secret generic grafana-admin \
    --from-literal=admin-user=admin \
    --from-literal=admin-password="$(openssl rand -base64 24)"
fi

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --version "$KUBE_PROMETHEUS_STACK_VERSION" \
  -f "$VALUES/kube-prometheus-stack.yaml" --wait

helm upgrade --install tempo grafana/tempo \
  --namespace monitoring --version "$TEMPO_VERSION" \
  -f "$VALUES/tempo.yaml" --wait

helm upgrade --install loki grafana/loki \
  --namespace monitoring --version "$LOKI_VERSION" \
  -f "$VALUES/loki.yaml" --wait

helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
  --namespace monitoring --version "$OTEL_COLLECTOR_VERSION" \
  -f "$VALUES/otel-collector.yaml" --wait

helm upgrade --install headlamp headlamp/headlamp \
  --namespace kube-system --version "$HEADLAMP_VERSION" \
  -f "$VALUES/headlamp.yaml" --wait

kubectl apply -k "$DIR/dashboards"

kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/download/$RABBITMQ_OPERATOR_VERSION/cluster-operator.yml"
kubectl -n rabbitmq-system rollout status deployment/rabbitmq-cluster-operator --timeout=180s
kubectl apply -k "$DIR/../rabbitmq"
