# Worker migration operations runbook

Preparation for [#61](https://github.com/0xLaurens/sendfa.st/issues/61) under
[#56](https://github.com/0xLaurens/sendfa.st/issues/56). Evidence checked on
**2026-11-16**, against repository baseline `a6e3794`. No deployment or live
configuration change is authorized by this document or implementation completion.

## Evidence and unresolved access

| Area | Read-only observation | Still required before staging |
| --- | --- | --- |
| Cloudflare account | No `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL`, or `CLOUDFLARE_ACCOUNT_ID` in this session; no cached credentials at the standard XDG/legacy Wrangler locations. Global Wrangler and worktree dependencies are absent. No authenticated account API check or login was attempted. | Owner supplies access through the normal secret channel; confirm the account owns the zone and intended Worker/frontend projects. Verify permissions, Paid subscription, billing period, existing usage, deployments, domains/routes and logging. Keep account/zone IDs and credentials out of public evidence. |
| Public DNS | Recursive lookup delegates `sendfa.st` to `damien.ns.cloudflare.com` and `elaine.ns.cloudflare.com`. Both authoritative servers return apex A records `104.21.45.49`, `172.67.209.181` (TTL 300). Recursive AAAA lookup returns Cloudflare IPv6 addresses. | Cloudflare DNS in front of a site does **not** establish its origin host, account, or whether it uses Pages, Workers, or a VPS. Inspect the owner's actual records and deployment mapping. |
| Proposed `api.sendfa.st` | A, AAAA and CNAME lookups return `NXDOMAIN`, both recursively and from both authoritative nameservers around 18:02 UTC. | This means no public record was found, not that the name is reserved/available for deployment. Check zone records, Worker routes, Custom Domains, certificates, conflicts and pending setup in the correct account immediately before approval. |
| Public frontend | Read-only fetch of [the homepage](https://sendfa.st/) succeeds via the web-fetch service; HTML advertises Astro 7.4.0 and a Cloudflare analytics beacon. Its [public sender asset](https://sendfa.st/_astro/LandingFileZone.Dl9RZvC8.js) constructs `wss://sendfast.0xlaurens.com/api/websocket/api/websocket`. No room was created or socket opened. A direct Python HTTP fetch was denied with 403. | The duplicated path differs from the intended contract; investigate actual build inputs and browser network behavior. Public HTML/assets do not prove backend identity, health, deployment commit or ownership. Confirm actual frontend project, build command/output, environment variables, custom domains, deployment history and rollback artifact. Do not infer a successful live transfer from a page fetch. |
| VPS | Go backend and Docker recipes exist in the repository; no host credentials or owner-confirmed inventory were used. | Owner confirms VPS/provider, signaling hostname, service/reverse-proxy config, restart procedure, billing owner and known-good frontend/backend pair. Retain it through staging and rollback validation. |

No secrets, private account identifiers or private workspace data were sent to
external services. Only public GitHub issues, DNS, website assets and vendor docs
were read. No billing, DNS, alerts, logging, artifacts or tracker state were changed.

## Deployment/configuration plan

### Repository facts, not live deployment facts

- [`worker/wrangler.toml`](../worker/wrangler.toml)
  defines the separate `sendfast-signaling` Worker, `index.ts`, compatibility date
  `2026-07-09`, `ROOMS` binding to `Room`, and initial `v1` SQLite class migration.
  The default configuration allows `http://localhost:4321`. The named staging
  environment targets `sendfast-signaling-staging` and enables Workers Logs with
  invocation logs and traces disabled. The config specifies neither a Cloudflare
  account nor a production route.
- [`frontend/wrangler.jsonc`](../frontend/wrangler.jsonc) and
  [`astro.config.mjs`](../frontend/astro.config.mjs) configure the Cloudflare
  frontend separately; neither identifies the actual deployed project/account.
  Do not deploy the signaling Worker using the frontend's Wrangler configuration.
- [`socket.ts`](../frontend/src/lib/socket.ts) uses HTTP room creation/status and
  room-aware WebSocket admission. UI callers append `/api/websocket` to
  `PUBLIC_WS_PROTOCOL://PUBLIC_WS_HOST`; the manager derives HTTP(S) endpoints.
  `PUBLIC_WS_HOST` must contain **only host[:port]**, never a scheme or API path.
  Public values are compiled into browser assets: rebuild and inspect the output,
  not merely runtime environment settings.
- [`backend/server/routes.go`](../backend/server/routes.go) exposes health and
  the legacy WebSocket endpoint, **not** HTTP room creation/status. Merely pointing
  this branch's frontend to the Go server is not a rollback.
  [`frontend/.env.example`](../frontend/.env.example) still targets Go on port
  7331; local Worker examples use 8787. Do not mistake either for production.
- The [existing README verification record](../README.md#local-worker-verification)
  includes successful local runtime tests and a two-Chromium, byte-matched
  69,000-byte transfer using the self-hosted frontend. It also records Cloudflare
  frontend dev failing with missing optimized modules and preview returning 500
  for a missing generated Layout module. These blockers remain unresolved here;
  a self-hosted build does not validate the Cloudflare frontend deployment.

### Reconcile before any staging deployment

1. Record the owner-confirmed account, frontend project and VPS inventory
   privately. Capture current frontend/backend revisions, recoverable build inputs
   and artifacts, domain mappings and the exact rollback procedure. A repository
   commit alone is not proof that an artifact can be redeployed.
2. Prepare an independently named staging Worker and staging frontend, isolated
   from production room namespaces and routes. Choose their actual hostnames with
   the owner; none are reserved here. Preserve the Go endpoint and production
   frontend. Do not mount the Worker over the VPS or the frontend's `/api/*`.
3. Review separate staging/production configs against the implementation. Keep
   `ROOMS` bound to the matching environment's `Room`; retain the initial SQLite
   migration and reconcile its applied history before future deployments. Never
   rename/delete a namespace or replay migrations as a rollback shortcut.
   If named Wrangler environments are chosen, explicitly supply their variables
   and bindings: these are not inherited ([configuration reference][config]).
4. Use exact comma-separated browser origins (scheme, host, port; no paths):

   | Pair | Worker `ALLOWED_ORIGINS` | Frontend build inputs |
   | --- | --- | --- |
   | Local example | `http://localhost:4321` | `PUBLIC_WS_PROTOCOL=ws`, `PUBLIC_WS_HOST=localhost:8787` |
   | Staging (proposed) | Only the owner-selected HTTPS staging UI origin | `PUBLIC_WS_PROTOCOL=wss`, host only of the isolated staging Worker |
   | Production (proposed) | `https://sendfa.st`; add `https://www.sendfa.st` only if verified as an actual UI origin | `PUBLIC_WS_PROTOCOL=wss`, `PUBLIC_WS_HOST=api.sendfa.st` only after that hostname is approved and configured |

   Do not use wildcard preview origins or allow localhost in production by habit.
   Origin validation applies to creation, status and upgrade; it is defense in
   depth, not authentication (non-browser requests without Origin are permitted).
   Confirm CORS/preflight, TLS, frontend security policy and no caching of room
   status. Inspect the final browser URLs for a single `/api/websocket`.
5. Preserve initial limits for validation: eight peers; 65,536-byte messages;
   ten creations/IP/minute; thirty upgrades/IP/minute; sixty frames/socket/second,
   burst 120. Use the six variables documented in the [README](../README.md#abuse-limits).
   IP enforcement is per-isolate, transient and approximate, not a global budget
   control. A ninth peer gets an opaque, retryable upgrade failure in browsers.
6. Resolve the Cloudflare frontend build/preview blockers and public endpoint
   discrepancy in separately scoped implementation work. Verify clean build
   inputs: prior local `.env` values selected a different backend despite shell
   overrides. Do not overwrite an operator's `.env` or assume overrides worked.
7. Agree logging/privacy and budget settings below. Record an executable release
   manifest: exact commit, dependency/tool versions, selected account/config,
   Worker name/environment, migration history, frontend build variables/output,
   deployment commands, domain/certificate changes and paired rollback commands.
   **Those artifacts and commands must be reconciled with the implementation and
   actual frontend hosting platform before staging.** No publish/deploy command
   here should be treated as an executable release recipe.

## Budget and alerts

Public prices verified **2026-11-16**; recheck the linked sources immediately
before any billing or deployment approval. Actual account plan/usage is unknown.

| Paid item | Published allowance/rate (USD) |
| --- | --- |
| [Workers Paid][workers-pricing] | Account minimum $5/month, plus usage; includes 10 million requests and 30 million CPU-ms/month, then $0.30/million requests and $0.02/million CPU-ms. This is separate from the zone's plan. |
| [Durable Objects compute][do-pricing] | 1 million requests and 400,000 GB-s/month included; then $0.15/million requests and $12.50/million GB-s, with published billable-unit rounding. Incoming WebSocket messages have a 20:1 request billing ratio; outgoing messages are not request-billed. Hibernation eligibility avoids idle duration charges, not all costs. |
| [SQLite storage][do-pricing] | 25 billion rows read, 50 million rows written and 5 GB-month included; overage $0.001/million reads, $1/million writes, $0.20/GB-month. KV methods on SQLite and alarms also incur row operations. |
| [Workers Logs][logs] through 2026-11-30 | Paid includes 20 million events/month; then $0.60/million, seven-day retention. |
| [Observability from 2026-12-01][observability-pricing] | Announced shared Paid allowances: 50 GB ingestion/billing cycle and 10 GB-month storage; then $0.25/GB and $0.10/GB-month. Seven-day default retention. Reverify applicability and dataset settings on the actual account. |

**$10/month is a soft Cloudflare operating target, never a guaranteed cap.**
Allowances are shared with other account workloads, including a dynamic frontend
and staging; do not assume the signaling Worker receives them all. VPS overlap,
domain charges, other subscriptions and taxes are separate costs to inventory.
Frequent room/status calls, alarms, attack traffic, active object duration, SQLite
operations and logs can exceed the target even though file bytes bypass signaling.

After separate billing/alert approval, the owner should:

- Confirm whether Workers Paid is already enabled; approve its $5 base plus usage
  before enabling it. Use observed staging request/CPU/duration/storage/log
  quantities to forecast the full billing cycle, including shared consumption.
- On a supported Pay-as-you-go account, configure account-wide
  [budget alerts][budget-alerts] for **$3 and $5 usage-based spend** (roughly $8 and
  $10 including a single $5 base, before other fixed charges/tax). Verify the
  actual billing scope, period, recipients and notification delivery. These
  alerts exclude fixed charges; they are not an all-in invoice cap.
- Optionally supplement with [product email alerts][spend-management] for Workers
  and Durable Objects. Do not silently substitute usage-blocking policies: they
  affect the whole account/product, exclude some charges and can interrupt other
  services. Even platform spending limits do not guarantee a maximum invoice.
- Assign an owner to inspect billable usage daily during staging and the initial
  post-cutover observation period, then weekly. At the early warning, investigate
  usage/forecast and notify the owner; at projected/actual $10 total, request a
  decision on approved mitigation, rollback or revised budget. Alerts are delayed
  observations, not automatic shutdown or permission to make live changes.

No subscription, budget alert, recipient or notification delivery was verified or
configured under this ticket.

## Privacy and platform logging

**Application behavior in this repository:** the Worker persists only an expiry/
active marker and durable cleanup alarm, keyed by room. Membership, device labels,
connection UUIDs and token allowance live in accepted socket attachments so wake
can reconstruct them; this is connection state, not durable user tracking.
Unused rooms expire at creation +60 seconds; last departure schedules +60 seconds;
a valid rejoin cancels cleanup and connected rooms have no empty-room deadline.
Admission checks the deadline independently of alarm execution, and cleanup calls
`deleteAll()`. This does not promise immediate physical erasure at 60 seconds:
Cloudflare's [SQLite recovery API][sqlite] documents a 30-day PITR window.
Verify recovery/deletion semantics for the deployed service; never restore room
history to resurrect expired sessions as part of rollback.

Files and filenames travel over browser-to-browser data channels, not signaling
storage. SDP/ICE is relayed but no history is stored; durable user identifiers are
not created. Worker code has no application logging calls, and the browser
signaling handlers no longer log payloads. This is **not** a claim of zero browser
logging or a guarantee about the live VPS: legacy Go handlers log room-related
values and their deployed revision/proxy log policy is unknown.

**Cloudflare is a separate observer:** it terminates HTTP/WSS and can process IP
addresses, URLs, headers/user agents, timestamps and other transport metadata.
Room UUIDs are bearer capabilities present in `/r/<uuid>`, status paths and upgrade
queries. Automatic invocation/access logs, traces, exceptions and referrers may
therefore expose capabilities even with no `console.log`. Turning off application
logs does not make the platform unable to observe signaling transport metadata.

Before staging, propose and obtain approval for a least-data policy:

- Explicitly disable persisted Workers Logs (`observability.enabled`/
  `observability.logs.enabled`) and invocation logs
  (`observability.logs.invocation_logs`) for signaling unless the owner approves
  a reviewed alternative. The current config is silent; [Cloudflare docs][logs]
  say new Workers default to observability enabled with 100% sampling.
  Sampling is not redaction. Review frontend logging separately, since its URLs
  also contain room capabilities.
- Inspect actual deployed settings for both Worker/room events and frontend:
  observability flags, sampling, traces/Issues, uncaught exceptions, real-time
  tail access, Tail Workers, Logpush/OpenTelemetry exports, HTTP/security logs,
  analytics and reverse-proxy logs. Public HTML includes an analytics beacon;
  verify its collection rather than claiming analytics is absent. No tail/export
  or logging mutation is authorized here.
- For each enabled dataset or export, record collected fields, destination, access
  controls, retention, data location and deletion behavior. Vendor docs currently
  list Workers Logs retention as three days Free/seven days Paid; that is **not**
  proof of deployment settings or the retention of security logs, exports,
  analytics or recovery copies. Check the announced December pricing/settings
  transition. Confirm metadata-boundary settings if applicable.
- Use synthetic staging sessions to inspect normal, malformed, rejection and
  exception paths after approval. Keep evidence to aggregate counts/statuses and
  redacted outcomes; do not publish raw HARs, SDP/ICE, IPs, room URLs, user-agent
  fingerprints, file names or production payloads. Review legacy VPS/proxy policy
  without assuming it matches the Worker.
- Owner reconciles public privacy wording with actual deployed collection before
  cutover, including `frontend/src/pages/privacy-policy.astro`; the existing 2024
  policy is not evidence of migration privacy compliance. Policy/runtime changes
  are not made in this documentation-only ticket.

All actual logging/retention/export settings remain **unverified** pending access.

## Approval gates and release evidence

Record approvals separately with owner, time, environment, exact release/config,
permitted live actions and rollback authority. A ready label, passing local tests
or this document grants none of them.

### Gate 1 — staging deployment and setup

**Not approved or performed.** Owner must approve the isolated staging deployment
and specify any allowed billing, hostname, alert or logging setup. First resolve
access/inventory, build blockers, reviewed manifest, privacy and budget decisions.
Keep production routes and VPS untouched; no staging room namespace may bind to
production.

After approval, record commit/tool versions, deployed configuration, browser/
network versions, timestamps, expected/actual results and sanitized evidence for:

1. Focused Worker and frontend boundary tests (`bun run test:worker`,
   `bun run test:frontend`) and the actual Cloudflare frontend build/preview.
   Use `bun install --frozen-lockfile` and the repository's pinned tool versions.
   Historical local results in the README do not substitute for release results.
2. Deployed health, HTTPS/WSS, exact CORS origins/preflight, create-before-connect,
   link shown only after admission, initial identity/roster ordering and no
   duplicate peers. Unknown/expired links must not create rooms; browser-visible
   terminal expiry must stop retrying rather than loop on opaque upgrade errors.
3. Two real browsers transferring synthetic files across representative devices/
   networks; verify downloaded bytes/hash. No TURN is provided: record direct
   connectivity limitations, not a promise all networks work.
4. Legitimate **eight-peer WebRTC negotiation** at unchanged initial limits (one
   sender, seven receivers); complete and byte-check each transfer. Confirm a
   ninth cannot join without disturbing the eight. Record throttling and failures.
5. **Real Cloudflare hibernation/wake** with idle accepted sockets: use platform
   evidence to establish actual hibernation/reconstruction, not elapsed time
   alone. After wake verify identities, roster/counts, routing, peer ceiling and
   per-socket rate allowance. Local Miniflare eviction is insufficient proof.
6. Unused and empty +60-second deadlines, rejoin before expiry, last-peer cleanup,
   no resurrection after expiry and no stale-alarm deletion of active rooms.
   Delayed alarm execution must not permit expired admission.
7. Transient signaling/network loss and an approved staging deployment
   interruption. Check same-UUID reconnection before expiry, roster replacement,
   jitter/backoff capped at 30 seconds, user-close cancellation and terminal
   rejection. Transfers must visibly interrupt and require restart; neither
   reconnection nor deployment promises session/transfer survival.
8. Hostile/malformed signaling, cross-room routing/cancellation rejection,
   origin rejection, size/rate boundaries, and privacy checks for these error
   paths. Record approximate IP enforcement as approximate.
9. Actual budget/alert settings, receipt evidence, billable usage forecast and
   logging/retention review. Rehearse **paired frontend/backend rollback** on
   isolated staging against a retained Go-compatible frontend, with new links
   and a byte-checked transfer; record redeployment timings and limitations.

The staging evidence bundle must explicitly list failed/skipped checks. Missing
hibernation, eight-peer, Cloudflare frontend, privacy/budget or rollback evidence
blocks production approval. Do not mark tests as passed because they are listed.

### Gate 2 — production cutover and other live changes

**Separate owner approval required; not approved or performed.** Review the full
staging bundle, unresolved limitations, current prices, retained rollback pair
and live-change manifest. Agree a maintenance window, abort thresholds,
observation period and authorized rollback operator before making changes.

1. Confirm VPS health, known-good legacy frontend/backend artifacts and rollback
   access immediately before cutover. Warn users that interrupted transfers must
   restart. There is no shared room store: VPS, staging and production Worker
   rooms are **neither synchronized nor migrated**.
2. Under the approved manifest, make the independently deployed production Worker
   healthy at the approved hostname first, with reviewed origins, namespace,
   limits, TLS, logging and budget setup. Domain/certificate setup can itself
   change DNS; it requires approval even if the dashboard automates it. Leave
   the old endpoint/VPS reachable.
3. Release the matching rebuilt frontend with host-only `api.sendfa.st` and `wss`
   only after backend readiness. Do not switch DNS alone and assume clients now
   speak the correct protocol. Existing tabs can retain old assets/endpoints.
4. Run immediate production smoke checks using only synthetic rooms/files:
   homepage and assets load; final browser endpoint has one API path; health,
   creation, admission/link gating and two-browser byte-checked transfer work;
   disconnect/rejoin and expired-link UI behave as staged. Review aggregate
   failures, origin/upgrade/limit errors, duration, spend and privacy settings.
   No production load or hostile-input campaign is implied by a smoke check.
5. Stop/rollback for privacy/routing violations, wrong account/origins/endpoints,
   failing create/join/transfers, unexpected costs or unmet owner thresholds.
   Continue the owner-agreed observation window and record post-cutover results
   before considering retirement. Keep the VPS available throughout.

Backend switching requires fresh links for rooms absent from the selected
backend; preserving `/r/<uuid>` syntax does not preserve room existence. Tell
senders and receivers to reload the matching frontend, create a new room/link and
restart interrupted transfers. This applies in both cutover and rollback.

### Rollback — exercise before relying on it

Live rollback is also a live change; obtain authority in Gate 2 or seek separate
approval if not granted. Rehearse it under Gate 1 without touching production.

1. Halt the rollout, record the failure and notify the owner. Preserve only
   sanitized evidence; do not dump room databases or signaling.
2. For fallback to Go, verify the retained VPS service and legacy WebSocket
   endpoint, then restore the **known-good Go-compatible frontend artifact and
   its original build configuration**, plus only the domain/route changes in
   the approved rollback manifest. Restoring `PUBLIC_WS_HOST` alone on the new
   frontend fails because Go lacks HTTP room creation/status.
3. Account for DNS/cache propagation and old open tabs: inspect actual browser
   endpoints, require reload/new rooms/new links on the restored pair and
   byte-check a synthetic transfer. Confirm health, membership, interruption
   messaging, origin/TLS behavior and aggregate error recovery.
4. If reverting a Worker-only release instead, use the recorded compatible
   Worker version/config and matching frontend; verify SQLite class/migration
   compatibility first. Code rollback does not undo migrations or restore live
   sockets. Do not delete namespaces, undo migrations blindly or restore expired
   room metadata from PITR.
5. Leave infrastructure available until validation completes; removal of the
   new Worker/routes or logging changes needs explicit approval. Record the
   recovered pair, timings, remaining stale-client effects and fresh-link
   instructions. No active room/transfer migration or synchronization occurs.

### Gate 3 — VPS retirement

**Not approved or performed.** Retirement needs a new, explicit owner approval
after documented post-cutover validation, the agreed observation window and
rollback rehearsal. Staging approval and production approval are insufficient.

Before approval, confirm the Worker/frontend and budget/privacy checks remain
healthy; the VPS has no remaining required users or unrelated services; active
sessions are dealt with without promising migration; and the owner accepts losing
the immediate VPS fallback or has validated another recovery path. Inventory
provider charges, DNS/proxy dependencies, secrets and safe configuration backups
(no session payload backups). The owner approves the exact shutdown/deletion,
credential revocation and subscription cancellation actions and validates their
results separately. No VPS stop, deletion or cancellation belongs to this ticket.

## Authoritative sources

All fetched on **2026-11-16**; prices/defaults are not account verification.

- [Workers pricing][workers-pricing] and [Durable Objects pricing][do-pricing].
- [Workers Logs defaults, invocation URLs, sampling, retention and location][logs].
- [Announced December 1 Observability pricing][observability-pricing].
- [Account-wide budget alerts][budget-alerts] and
  [spending limits versus notification-only policies][spend-management].
- [Wrangler configuration and environment binding inheritance][config].
- [SQLite storage, alarms, deletion and 30-day point-in-time recovery][sqlite].

[workers-pricing]: https://developers.cloudflare.com/workers/platform/pricing/
[do-pricing]: https://developers.cloudflare.com/durable-objects/platform/pricing/
[logs]: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
[observability-pricing]: https://developers.cloudflare.com/observability/pricing/
[budget-alerts]: https://developers.cloudflare.com/billing/manage/budget-alerts/
[spend-management]: https://developers.cloudflare.com/billing/manage/spend-management/
[config]: https://developers.cloudflare.com/workers/wrangler/configuration/
[sqlite]: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
