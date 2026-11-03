# Kubernetes platform

`platform/install.sh` installs everything the chess services need, except the services themselves:

| Component                         | Namespace              | What it is for                                                                                                                |
| --------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| kube-prometheus-stack             | `monitoring`           | Prometheus, Grafana, Alertmanager, kube-state-metrics, node-exporter, Kubernetes dashboards                                   |
| Tempo                             | `monitoring`           | Trace storage                                                                                                                 |
| Loki                              | `monitoring`           | Log storage (OTLP native)                                                                                                     |
| OpenTelemetry Collector           | `monitoring`           | DaemonSet. Apps send OTLP to the collector on their own node; it adds k8s metadata and fans out to Tempo, Prometheus and Loki |
| Headlamp                          | `kube-system`          | Web UI for pods, deployments, events, logs and exec                                                                           |
| cert-manager                      | `cert-manager`         | TLS certificates for the gateway (no longer needed by any operator; kept for HTTPS listeners)                                 |
| CloudNativePG + `Cluster`         | `cnpg-system`, `chess` | 3-instance Postgres with automatic failover; writes the `postgres-app` secret the apps read `DATABASE_URL` from               |
| Envoy Gateway + `GatewayClass eg` | `envoy-gateway-system` | Gateway API implementation that exposes `core` (REST and WebSockets) and the frontend outside the cluster                    |
| `PrometheusRule chess`            | `monitoring`           | Alerts for clocks, command timeouts, move latency, event-stream lag and dead events                                           |

Requires `kubectl`, `helm` and a cluster with a default StorageClass. For local work, `kind` or `k3d` is enough.

Everything here lives at the repo root (`deploy/`), not inside an app, and every command below runs from the repo root. `deploy/k8s/secrets.env` (gitignored) holds the local secrets; `up.sh` and `platform/install.sh` generate it on first run.

```bash
./deploy/k8s/platform/install.sh
```

## Chess services

`apps/` deploys the backend and the frontend into the `chess` namespace:

| Workload   | Kind                                      | Replicas | Notes                                                                                                                 |
| ---------- | ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `redis`    | StatefulSet                               | 1        | AOF every second, `noeviction`, 5 Gi volume. Holds live games, read models and `{chess}:events`; must not lose writes |
| `core`     | Deployment + Service + HPA + PDB          | 2–6      | REST + Socket.IO on port 9200. Init container runs `prisma migrate deploy`                                            |
| `game-svc` | Deployment + headless Service + HPA + PDB | 2–6      | gRPC commands on port 50051 (`game-svc-grpc`, `clusterIP: None`); HTTP health on 9300; gRPC readiness probe           |
| `frontend` | Deployment + Service + HTTPRoute          | 1        | Next.js standalone server on port 3000 (Service port 80). Probes on `/`. Served on host `chess.localhost`             |
| `chess`    | Gateway + HTTPRoute `core`                | –        | HTTP on port 80. `/socket.io` has no request timeout so WebSockets stay open; other routes time out at 30s            |

`DATABASE_URL` comes from the `postgres-app` secret that CloudNativePG creates (key `uri`). To use a managed database instead, create a secret named `postgres-app` with a `uri` key and skip `kubectl apply -k postgres`.

### Local cluster (Docker Desktop)

```bash
./deploy/k8s/up.sh                   # platform + images + services
./deploy/k8s/up.sh --skip-platform   # redeploy after a code change
./deploy/k8s/down.sh                 # remove services, keep data; --data / --platform / --images go further
```

`up.sh` builds `chess-backend:<tag>`, `chess-backend-migrate:<tag>` and `chess-frontend:<tag>` (tag = short commit SHA, plus a timestamp when the tree is dirty), pins them in the rendered manifests and applies them. Docker Desktop's Kubernetes uses the local image store, so there is no push or load step.

### Images

All images build from the **repo root** as context, because the apps depend on workspace packages (`@chess/contract`, `@chess/ui`). Each Dockerfile runs `turbo prune <app> --docker`, installs from the pruned `json/` + `pnpm-lock.yaml` with pnpm (corepack, version from `packageManager`), then builds with `pnpm turbo run build --filter=<app>`. `pnpm-workspace.yaml` is part of the pruned output, so its `allowBuilds` list (bcrypt, prisma engines, ...) applies inside Docker too. The root `.dockerignore` keeps `node_modules`, build output, `.env` files and `deploy/` out of the context.

| Image                   | Dockerfile                                      | Contents                                                                                              |
| ----------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `chess-backend`         | `apps/backend/Dockerfile.prod` target `runtime` | `pnpm deploy --prod` output + `dist` + generated Prisma client; runs core, game-svc overrides `args` |
| `chess-backend-migrate` | `apps/backend/Dockerfile.prod` target `migrate` | Full workspace install; runs `prisma migrate deploy` (init container of `core`)                       |
| `chess-frontend`        | `apps/frontend/Dockerfile`                      | Next.js standalone output; `node apps/frontend/server.js` on port 3000 as user `node`                 |

```bash
docker build -f apps/backend/Dockerfile.prod --target runtime -t <registry>/chess-backend:<tag> .
docker build -f apps/backend/Dockerfile.prod --target migrate -t <registry>/chess-backend-migrate:<tag> .
docker build -f apps/frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_HOST=https://api.example.com \
  --build-arg NEXT_PUBLIC_WS_HOST=https://api.example.com \
  --build-arg NEXT_PUBLIC_HOST=https://play.example.com \
  -t <registry>/chess-frontend:<tag> .
docker push <registry>/chess-backend:<tag>
docker push <registry>/chess-backend-migrate:<tag>
docker push <registry>/chess-frontend:<tag>

cp deploy/k8s/apps/secret.example.yaml /tmp/chess-secrets.yaml   # fill in, never commit
kubectl apply -f /tmp/chess-secrets.yaml

cd deploy/k8s/apps
kustomize edit set image chess-backend=<registry>/chess-backend:<tag> chess-backend-migrate=<registry>/chess-backend-migrate:<tag> chess-frontend=<registry>/chess-frontend:<tag>
kubectl apply -k .
```

For a real domain also change the `frontend` HTTPRoute hostname in `apps/frontend.yaml` (or a kustomize patch) to the host baked into `NEXT_PUBLIC_HOST`.

### Frontend build-time variables

Next.js inlines every `NEXT_PUBLIC_*` variable into the JavaScript bundle during `next build`; setting them on the running container does nothing. They are therefore Docker build args (`ARG` -> `ENV` before the build), and the build fails if any is missing:

| Build arg              | Meaning                                  | `up.sh` value            |
| ---------------------- | ---------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_HOST` | Base URL of core for REST                | `http://$CHESS_API_HOST` |
| `NEXT_PUBLIC_WS_HOST`  | Base URL of core for Socket.IO (`/game`) | `http://$CHESS_API_HOST` |
| `NEXT_PUBLIC_HOST`     | Public URL of the frontend itself        | `http://$CHESS_WEB_HOST` |

`CHESS_WEB_HOST` defaults to `chess.localhost`, `CHESS_API_HOST` to `api.chess.localhost` (`CHESS_PUBLIC_SCHEME` to `http`). `up.sh` uses the same `CHESS_WEB_HOST` for the build arg and for the `frontend` HTTPRoute hostname, so the bundle and the route cannot drift. One image is bound to one set of hosts: a different domain means a rebuild, and `--skip-build` reuses the hosts recorded with the last build. The backend side of the same URLs lives in `chess-secrets` (`STRIPE_CHECKOUT_SESSION_SUCCESS_URL`, `STRIPE_CHECKOUT_SESSION_CANCEL_URL`, `GOOGLE_REDIRECT_URL`) and must point at the frontend host.

### Routing

Both routes attach to the `chess` Gateway:

- `HTTPRoute frontend` (`apps/frontend.yaml`), hostname `chess.localhost`: every path goes to the `frontend` Service.
- `HTTPRoute core` (`apps/gateway.yaml`), no hostname: catch-all for every other host, including `api.chess.localhost`, the bare gateway address and `localhost`. `/socket.io` without a request timeout, the rest with 30s. Unchanged from before the frontend existed.

Routing is by host, not by path, because the paths collide: the frontend has a page at `/user` and core has `GET /user`, `/user/games` and `/user/payment/history`; core also serves `/auth/*` and `/payments/*` with no common prefix. A more specific hostname wins over the hostless route (the same way `grafana.localhost` and `headlamp.localhost` already work), so the frontend host never reaches core and vice versa. Browsers resolve `*.localhost` to `127.0.0.1`, which on Docker Desktop is the gateway's LoadBalancer address. Core allows any CORS origin when `ENV=prod`, and sockets use the `websocket` transport, so the cross-origin API host needs nothing else.

core calls game-svc over gRPC at `GAME_SVC_GRPC_TARGET` (`dns:///game-svc-grpc:50051` in `apps/config.yaml`). The Service is headless on purpose: gRPC keeps one long-lived HTTP/2 connection, so a `ClusterIP` Service would pin each core pod to a single game-svc pod. With the headless Service the client resolves every pod IP and balances calls with `round_robin`, and retries a call once on `UNAVAILABLE`. game-svc drains in-flight calls on `SIGTERM` (`preStop` sleep, then a graceful gRPC shutdown), so a rolling update does not drop commands.

Redis is the only broker left: game-svc writes `game.ended` to the `{chess}:events` stream, core's `history` consumer group reads it, and game-svc pushes socket events through the Redis emitter.

Telemetry goes to the collector on the pod's node (`$(HOST_IP):4318`). Sockets use the `websocket` transport only, so the `core` Service needs no session affinity.

Find the gateway address with `kubectl -n chess get gateway chess -o jsonpath='{.status.addresses[0].value}'`. The listener is plain HTTP; for TLS add an HTTPS listener with a `certificateRefs` secret (cert-manager can issue it) and a hostname. Without a load balancer (kind, k3d), use `kubectl -n chess port-forward svc/core 9200:80` and `kubectl -n chess port-forward svc/frontend 3000:80` (the bundle still calls `NEXT_PUBLIC_API_HOST`, so build the frontend with `CHESS_API_HOST=localhost:9200` for that setup).

## Web interfaces

| UI       | Open with                                                                                                                           | Use it for                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grafana  | http://grafana.localhost (via the gateway; fallback `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3001:80`) | Metrics, traces (Explore → Tempo), logs (Explore → Loki). Dashboards: **Chess backend**, **Kubernetes / Compute Resources / Namespace (Pods)**, **Node.js** |
| Headlamp | http://headlamp.localhost (via the gateway; fallback `kubectl -n kube-system port-forward svc/headlamp 4466:80`)                    | Live pod state, restarts, events, container logs, shell into a pod                                                                                          |

Grafana admin password:

```bash
kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d
```

Headlamp has no RBAC binding of its own. Sign in with a token that carries your own permissions, for example `kubectl create token <your-service-account> -n <namespace>`, or run the Headlamp desktop app against your kubeconfig.

Dead events: `kubectl -n chess exec statefulset/redis -- redis-cli -a "$REDIS_PASSWORD" XRANGE '{chess}:events:dead' - +`.

## Alerts

`platform/alerts/chess-alerts.yaml`, visible in Grafana under Alerting and routed by Alertmanager:

| Alert                     | Fires when                                                            | Severity |
| ------------------------- | --------------------------------------------------------------------- | -------- |
| `ChessClockLeaderMissing` | Not exactly one game-svc holds the clock lock for 1m                  | critical |
| `ChessCommandTimeouts`    | Over 1% of gRPC commands time out or find no game-svc for 5m          | critical |
| `ChessEventLag`           | A consumer group is over 100 events behind on `{chess}:events` for 5m | critical |
| `ChessDeadEvents`         | `{chess}:events:dead` is not empty for 5m                             | warning  |
| `ChessMoveLatencyHigh`    | p99 move latency over 500 ms for 10m                                  | warning  |

Domain rejections such as "Not your turn" count as outcome `error`, not `timeout`/`unavailable`, and never fire an alert.

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

`docker compose -f apps/backend/docker.compose.yml up` starts core, game-svc (gRPC on `game-svc:50051`), Postgres, Redis and `grafana/otel-lgtm` (Grafana, Tempo, Loki, Prometheus and a collector in one container).

The compose services build `apps/backend/Dockerfile` (dev image, `start:dev` with `src/` mounted) with the repo root as context. Run the frontend with `pnpm --filter frontend dev`.

- Grafana: http://localhost:3001 (import `deploy/k8s/platform/dashboards/chess-overview.json`; the Pods row stays empty outside Kubernetes)
- OTLP: `http://localhost:4318`
