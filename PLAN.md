# Plan

## 1. Terraform: OCI Kubernetes deployment

Goal: provision an OKE cluster on Oracle Cloud and deploy the existing `deploy/k8s` manifests onto it.

- [ ] `deploy/terraform/` layout: `providers.tf`, `variables.tf`, `network.tf`, `oke.tf`, `registry.tf`, `outputs.tf`, `terraform.tfvars.example`
- [ ] Provider: `oracle/oci`, auth via API key or instance principal; remote state in an OCI Object Storage bucket (S3-compatible backend)
- [ ] Network: VCN, public subnet (load balancer), private subnets (nodes, API endpoint), internet/NAT/service gateways, security lists
- [ ] OKE: enhanced cluster, node pool (shape and OCPU/memory as variables, Always Free `VM.Standard.A1.Flex` as default), kubeconfig output
- [ ] Container registry (OCIR) repos for core and game-svc images; image pull secret
- [ ] Data services: decide managed vs in-cluster for Postgres, Redis (AOF required), RabbitMQ (quorum queues)
- [ ] Secrets: `.env` values (Stripe, Google OAuth, DB, Redis, RabbitMQ) via OCI Vault or Kubernetes secrets created from tfvars
- [ ] Ingress / load balancer: OCI LB annotations on the ingress controller, DNS and TLS (cert-manager)
- [ ] Deploy manifests: `kubernetes`/`helm` provider or a post-apply `kubectl apply -k deploy/k8s`; keep in line with the existing up/down scripts
- [ ] Observability: point the OpenTelemetry stack at the cluster
- [ ] CI: image build and push to OCIR, `terraform fmt/validate/plan`
- [ ] Docs: prerequisites, `terraform init/plan/apply`, teardown, cost notes

## 2. Load imitation script

Goal: simulate many concurrent players against the API and Socket.IO gateway; must run locally against `npm run start:dev` + `npm run start:game-svc`.

- [ ] Location: `scripts/load/` (separate from `src/`), run with `npm run load -- --users 100 --duration 60`
- [ ] Config flags and env: base URL, user count, ramp-up, duration, game think-time, seed
- [ ] Setup phase: register or log in N bot users via REST, collect tokens (reuse the seed user setup from `prisma db seed -- --env test`)
- [ ] Bot behaviour: connect over `socket.io-client`, join matchmaking, play full games with legal random moves (chess lib), occasionally resign, draw offer, or disconnect and reconnect
- [ ] Event names taken from `src/game/EmitTypes.ts`
- [ ] Metrics: connect time, move round-trip latency (p50/p95/p99), games started/finished, errors, dropped sockets; printed summary plus optional JSON output
- [ ] Local run: documented against the local stack (Postgres, Redis, RabbitMQ via docker-compose); safe default user count
- [ ] Optional: run in-cluster as a k8s Job against the OCI deployment
- [ ] Verify: game history persisted through outbox, no stuck games in Redis after the run
