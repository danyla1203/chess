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
| RabbitMQ messaging topology operator          | `rabbitmq-system`          | Creates the `core` and `game-svc` broker users and their permissions from `rabbitmq/users.yaml`                               |
| cert-manager                                  | `cert-manager`             | Webhook certificates for the topology operator; also usable for TLS on the gateway                                            |
| CloudNativePG + `Cluster`                     | `cnpg-system`, `chess`     | 3-instance Postgres with automatic failover; writes the `postgres-app` secret the apps read `DATABASE_URL` from               |
| Envoy Gateway + `GatewayClass eg`             | `envoy-gateway-system`     | Gateway API implementation that exposes `core` (REST and WebSockets) outside the cluster                                      |
| `PrometheusRule chess`                        | `monitoring`               | Alerts for clocks, command timeouts, dead letters, outbox backlog and missing notification consumers                          |

Requires `kubectl`, `helm` and a cluster with a default StorageClass. For local work, `kind` or `k3d` is enough.

```bash
./deploy/k8s/platform/install.sh
```

## Chess services

`apps/` deploys the backend into the `chess` namespace:

| Workload   | Kind                             | Replicas | Notes                                                                                                      |
| ---------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `redis`    | StatefulSet                      | 1        | AOF every second, `noeviction`, 5 Gi volume. Holds live games and the outbox, so it must not lose writes   |
| `core`     | Deployment + Service + HPA + PDB | 2–6      | REST + Socket.IO on port 9200. Init container runs `prisma migrate deploy`                                 |
| `game-svc` | Deployment + HPA + PDB           | 2–6      | Game commands from RabbitMQ; health only on port 9300                                                      |
| `chess`    | Gateway + HTTPRoute              | –        | HTTP on port 80. `/socket.io` has no request timeout so WebSockets stay open; other routes time out at 30s |

`DATABASE_URL` comes from the `postgres-app` secret that CloudNativePG creates (key `uri`). To use a managed database instead, create a secret named `postgres-app` with a `uri` key and skip `kubectl apply -k postgres`.

```bash
docker build -f Dockerfile.prod --target runtime -t <registry>/chess-backend:<tag> .
docker build -f Dockerfile.prod --target migrate -t <registry>/chess-backend-migrate:<tag> .
docker push <registry>/chess-backend:<tag> && docker push <registry>/chess-backend-migrate:<tag>

cp deploy/k8s/apps/secret.example.yaml /tmp/chess-secrets.yaml   # fill in, never commit
kubectl apply -f /tmp/chess-secrets.yaml

cd deploy/k8s/apps
kustomize edit set image chess-backend=<registry>/chess-backend:<tag> chess-backend-migrate=<registry>/chess-backend-migrate:<tag>
kubectl apply -k .
```

Each service connects to RabbitMQ as its own user (`core-user-credentials`, `game-svc-user-credentials`, created by the topology operator). Permissions are scoped by name:

| User       | May publish to                                                         | Cannot publish to                                            |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `core`     | `game.commands`                                                        | `game.lifecycle`, `game.notifications`, the default exchange |
| `game-svc` | `game.lifecycle`, `game.notifications`, default exchange (RPC replies) | `game.commands`                                              |

Both may declare and bind every chess exchange and queue, because each process asserts the whole topology on start.

Telemetry goes to the collector on the pod's node (`$(HOST_IP):4318`). Sockets use the `websocket` transport only, so the `core` Service needs no session affinity.

Find the gateway address with `kubectl -n chess get gateway chess -o jsonpath='{.status.addresses[0].value}'`. The listener is plain HTTP; for TLS add an HTTPS listener with a `certificateRefs` secret (cert-manager can issue it) and a hostname. Without a load balancer (kind, k3d), use `kubectl -n chess port-forward svc/core 9200:80`.

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

The RabbitMQ admin login for the management UI lives in the `rabbitmq-default-user` secret in the `chess` namespace.

## Alerts

`platform/alerts/chess-alerts.yaml`, visible in Grafana under Alerting and routed by Alertmanager:

| Alert                          | Fires when                                              | Severity |
| ------------------------------ | ------------------------------------------------------- | -------- |
| `ChessClockLeaderMissing`      | Not exactly one game-svc holds the clock lock for 1m    | critical |
| `ChessCommandTimeouts`         | Over 1% of commands get no reply from game-svc for 5m   | critical |
| `ChessNotificationsNoConsumer` | No core instance consumes `ws.notifications` for 2m     | critical |
| `ChessOutboxBacklog`           | Over 100 unpublished results in the Redis outbox for 5m | critical |
| `ChessOutboxRelayFailing`      | The relay keeps failing to publish for 5m               | warning  |
| `ChessDeadLetters`             | `chess.dead-letter` is not empty for 5m                 | warning  |
| `ChessCommandBacklog`          | Over 50 commands waiting in `game-svc.commands` for 2m  | warning  |
| `ChessMoveLatencyHigh`         | p99 move latency over 500 ms for 10m                    | warning  |

Domain rejections such as "Not your turn" count as RPC `error`, not `timeout`, and never fire an alert.

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
