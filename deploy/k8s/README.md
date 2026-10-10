# Kubernetes platform

`platform/install.sh` installs everything the chess services need, except the services themselves:

| Component                                     | Namespace                  | What it is for                                                                                                                |
| --------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| kube-prometheus-stack                         | `monitoring`               | Prometheus, Grafana, Alertmanager, kube-state-metrics, node-exporter, Kubernetes dashboards                                   |
| Tempo                                         | `monitoring`               | Trace storage                                                                                                                 |
| Loki                                          | `monitoring`               | Log storage (OTLP native)                                                                                                     |
| OpenTelemetry Collector                       | `monitoring`               | DaemonSet. Apps send OTLP to the collector on their own node; it adds k8s metadata and fans out to Tempo, Prometheus and Loki |
| Headlamp                                      | `kube-system`              | Web UI for pods, deployments, events, logs and exec                                                                           |
| RabbitMQ cluster operator + `RabbitmqCluster` | `rabbitmq-system`, `chess` | 3-node broker with quorum queues and Prometheus metrics                                                                       |

Requires `kubectl`, `helm` and a cluster with a default StorageClass. The services also need Redis with AOF persistence (`appendonly yes`), because live games and the outbox live there. It is not installed by this script yet. For local work, `kind` or `k3d` is enough.

```bash
./deploy/k8s/platform/install.sh
```

## Web interfaces

| UI                  | Open with                                                                                                 | Use it for                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grafana             | `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3001:80` then http://localhost:3001 | Metrics, traces (Explore → Tempo), logs (Explore → Loki). Dashboards: **Chess backend**, **Kubernetes / Compute Resources / Namespace (Pods)**, **RabbitMQ-Overview**, **Node.js** |
| Headlamp            | `kubectl -n kube-system port-forward svc/headlamp 4466:80` then http://localhost:4466                     | Live pod state, restarts, events, container logs, shell into a pod                                                                                                                 |
| RabbitMQ management | `kubectl -n chess port-forward svc/rabbitmq 15672` then http://localhost:15672                            | Queues, bindings, message rates, dead letters                                                                                                                                      |

Grafana admin password:

```bash
kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d
```

Headlamp has no RBAC binding of its own. Sign in with a token that carries your own permissions, for example `kubectl create token <your-service-account> -n <namespace>`, or run the Headlamp desktop app against your kubeconfig.

RabbitMQ credentials live in the `rabbitmq-default-user` secret in the `chess` namespace.

## Correlation

- Grafana Tempo → "Logs for this span" jumps to Loki filtered by `trace_id`.
- Loki log line → `TraceID` link opens the trace in Tempo.
- Histogram panels with exemplars (move latency) link a slow bucket to its trace.

## Sending telemetry from a service

Set on the container:

```yaml
env:
  - name: HOST_IP
    valueFrom:
      fieldRef:
        fieldPath: status.hostIP
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: http://$(HOST_IP):4318
  - name: OTEL_SERVICE_NAME
    value: chess-core
  - name: OTEL_SEMCONV_STABILITY_OPT_IN
    value: http
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: service.namespace=chess,k8s.pod.name=$(POD_NAME)
```

## Local development without Kubernetes

`docker compose -f docker.compose.yml up` starts Postgres, Redis, RabbitMQ and `grafana/otel-lgtm` (Grafana, Tempo, Loki, Prometheus and a collector in one container).

- Grafana: http://localhost:3001 (import `platform/dashboards/chess-overview.json`; the Pods row stays empty outside Kubernetes)
- RabbitMQ management: http://localhost:15672 (`chess` / `chess`)
- OTLP: `http://localhost:4318`
