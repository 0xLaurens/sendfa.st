# Sendfa.st
Sendfa.st 💫 is a peer-to-peer file sharing service that enables users to share files quickly and securely. 
The files that are shared directly transferred from one device to another without any intermediate server. The application is built using [WebRTC](https://webrtc.org/) and [Websockets](https://developer.mozilla.org/en-US/docs/web/API/WebSocket).

![Screenshot 2024-10-03 at 13-32-42 Sendfa st - quick and easy file transfers](https://github.com/user-attachments/assets/c0911efd-8962-4d77-a30b-113b9b8028b8)

## Features
- No file size limit ♾️ 
- No registration required 🤖
- End-to-end encryption 🔒
- Cross-platform support 🤝
- Fast file transfer 🚀
- Free to use 💸
- Open-source 📂

## How it works?
![webrtc-connection](https://github.com/user-attachments/assets/5c6f003c-e09d-44fc-9251-9bfbe08ed348)
1. Sender selects the files he wants to send
2. The sender shares a unique link with receiver.
3. Receiver connects using the unique link
4. Receiver accepts files and receives the files.

The Go backend remains available. The independently deployable TypeScript Cloudflare Worker in `frontend/src/worker` provides an alternative signaling backend. Room identifiers are bearer capabilities. The Worker keeps only temporary lifecycle metadata in Durable Object SQLite; active identity is held in socket attachments. Files, filenames, SDP/ICE history, and durable user identities are not stored. Application code does not log signaling payloads or room IDs; Cloudflare may independently process transport metadata under its platform logging policies.
Over the direct WebRTC datachannel information is exchanged about the file. If the other user accepts the files the download starts. The downloader informs the sender when to start sending the next file if there are multiple.

## How private and secure is it?
The signaling service facilitates WebRTC setup; file data travels directly over a peer-to-peer data channel. Worker room lifecycle metadata is temporary and expires after 60 seconds unused or after the final peer leaves. All protocols are encrypted using TLS in deployed environments.

### Worker HTTP and WebSocket contract

- `GET /api/health` returns `200` with an empty body; other methods return `405`.
- `POST /api/rooms` takes no body and returns `201 {"id":"<uuid>"}` only after the Durable Object stores its temporary expiry metadata and alarm. Bad request bodies return `400`; other methods return `405`.
- `GET /api/rooms/<uuid>` returns `200 {"exists":true}` for a known, unexpired room and `404 {"exists":false}` otherwise, using the same authoritative expiry check as admission. Responses are `Cache-Control: no-store`; the path UUID must be valid. Other methods return `405`. Status checks do not create, admit, or extend a room.
- Browser HTTP requests and WebSocket handshakes with an `Origin` must match an exact comma-separated `ALLOWED_ORIGINS` entry. A rejected origin returns `403`; HTTP preflight returns `204` and allows `GET`, `POST`, `OPTIONS`, and `Content-Type`. Requests without an Origin are permitted for non-browser clients. No credentials are enabled.
- WebSocket admission uses `GET /api/websocket?roomId=<uuid>` with the standard `Upgrade: websocket` header and exactly one valid UUID `roomId`. Missing/invalid UUIDs return `400`; non-GET requests return `405`; missing upgrade returns `426`. Unknown or expired rooms return `410` and are never created by admission. A room accepts up to eight simultaneous peers.
- Room identifiers are UUIDs in the existing share link (`/r/<uuid>`) and are sent as the `roomId` WebSocket query parameter. A room with no peers is eligible for expiry after 60 seconds; expiry metadata and its Durable Object alarm are established before room creation succeeds. Joining marks the room active; the final departure starts a fresh 60-second unused deadline.
- The first WebSocket frames are `{"type":"IDENTITY","user":...}` and `{"type":"ROOM_JOINED","room":{"id":"<uuid>","user_count":1},"users":[]}` in that order. The snapshot lists already-present peers; later admissions send `USER_JOINED` to existing peers, which initiate the offer. A room identity is kept in its socket attachment and is authoritative, not any client-supplied `from` or `roomId`.
- Browsers cannot inspect a failed upgrade's HTTP status. Before each attempt the client checks room status: `404 {"exists":false}` (or `400 {"error":"invalid_room_id"}`) is terminal. The client also recognizes a `ROOM_REJECTED` socket frame as an explicit terminal rejection, although this Worker currently rejects expired rooms during upgrade instead of sending that frame. Opaque upgrade failures, network errors, unrelated responses, and other status responses are retryable, including a full room. A status result is only a point-in-time check: expiry may race the following upgrade, so an opaque failure is retried and the next status check determines whether the room expired. Origin restrictions apply to status checks as to creation and upgrades; UUID links remain bearer capabilities, not authentication.
- Signaling loss closes peer connections and interrupts transfers. Reconnection uses the same UUID with a fresh roster and exponential jitter capped at 30 seconds; it does not resume transfers. Restart interrupted transfers after reconnecting. Sessions are not guaranteed to survive deployments.
- Membership is established by admission; redundant `JOIN_ROOM` messages do not join again. `LEAVE_ROOM` removes the socket's membership and closes it; subsequent close or error callbacks do not announce another departure. Rejoining before the empty-room deadline cancels cleanup.
- Browser signaling uses `{"type":"OFFER","payload":{"to":"<peer-uuid>","offer":{"type":"offer","sdp":"<SDP>"},"from":"<untrusted legacy field>","roomId":"<legacy field>"}}`; `ANSWER` uses `answer` with SDP type `answer`, and `ICE_CANDIDATE` uses `candidate` with `candidate` and optional nullable `sdpMid`, `sdpMLineIndex`, and `usernameFragment`. Legacy `from` and `roomId` fields are accepted only in valid form and ignored for authorization. The service validates each peer/field and forwards a server-established `from`; only members of the same room can signal one another. Messages over 64 KiB, invalid JSON, and non-object frames are rejected. Invalid/unknown message schemas are ignored, not forwarded.
- Cancellation is `{"type":"CANCEL_DOWNLOAD","payload":{"roomId":"<uuid>"}}` (the legacy room field is ignored); the sender must be an admitted member and cancellation is broadcast only in that socket's actual room. Files and filenames are exchanged only through the peer-to-peer data channel.

### Local Worker verification

From `frontend/`, run `bun install --frozen-lockfile`. Start the Worker with its dedicated configuration:

```sh
bun run wrangler dev --local --config src/worker/wrangler.jsonc --port 8787
```

Set `ALLOWED_ORIGINS` in that config (or a local `.dev.vars`) to the exact UI origin, for example `http://localhost:4321`; configure frontend `PUBLIC_WS_PROTOCOL=ws` and `PUBLIC_WS_HOST=localhost:8787`, then run `bun run dev` in another terminal. A reproducible two-browser walkthrough is: select a file in the first browser, wait for its admitted room link, open that link in the second browser, accept the offer, and verify the downloaded bytes match the original. Signaling carries only SDP/ICE and peer routing data, never files or filenames.

Automated local checks: `bun run test:worker` starts the configured Worker and exercises HTTP method/body/CORS/origin/UUID validation, room creation, ordered admission, labels, duplicate join and explicit leave, last-peer detection, rejoin cancellation, unused and empty expiry/no-resurrection, rejected unknown-room upgrades, malformed signaling, spoofed identities, the eight-peer limit, and cross-room routing/cancellation. Real elapsed-time lifecycle tests take several minutes. Additional Miniflare tests control time, alarm delivery, overlapping cleanup and local eviction with hibernatable sockets, checking behavior through HTTP and WebSockets. These controls do not prove Cloudflare's actual scheduling or hibernation/wake, which remain mandatory staging gates. `bun run test:frontend` exercises create-before-connect, admission gating, link availability on upload replacement, and close-during-create through the connection manager.

**Post-merge local verification:** Bun 1.4.3 frozen install succeeded; Worker suite passed 7/7 (including the 61-second expiry test and nullable ICE candidate fields); frontend regression suite passed 2/2; `bun run build` completed with zero Astro diagnostics. Node emitted its upstream `punycode` deprecation warning during build.

**Issue #58 integration verification (`0fa7913`, 2026-11-15):** Worker tests passed 16/16, including six controlled runtime lifecycle tests; frontend tests passed 2/2; `bun run build` and `git diff --check` passed. Standards and Spec reviews have no outstanding findings. Local eviction preserved attached identities and membership, but real Cloudflare scheduling and hibernation/wake remain mandatory staging gates. No push, deployment, cutover, or live infrastructure changes were performed.

**Post-merge browser verification (`1728c27`, 2026-11-15):** two separate Chromium 155 profiles completed a 69,000-byte transfer through the local Worker. Downloaded bytes matched the source exactly; SHA-256 was `670b7c9ea15e292fc715dd2b5a2d93644e7f165540be9de9c560ed870982e747`. The 17 captured signaling frames contained no fixture filename or contents; there were zero browser exceptions. This run used the existing self-hosted frontend configuration in a clean worktree without a local `.env`:

```sh
PUBLIC_WS_PROTOCOL=ws PUBLIC_WS_HOST=localhost:8787 bun run astro build --config astro.config.selfhosted.mjs
HOST=localhost PORT=4321 node dist/server/entry.mjs
```

**Limitations:** the workspace's existing `.env` selected a different backend despite shell overrides; it was left unchanged. Cloudflare frontend development failed with missing optimized modules, and its local preview returned 500 for a missing generated Layout module. The self-hosted build above passed, but Cloudflare frontend deployment validation remains blocked on investigating those errors. Local Workerd also emitted RPC warnings. No deployment, real Cloudflare hibernation/wake, eight-peer WebRTC negotiation, Docker build, or production rollback was verified; these remain separate validation gates.

## Get started

### Prerequisites
- Go version 1.22.5 or higher
- Bun version 1.4.3 (used by CI and Docker)
- Node.js version 22.22.0 or higher
- Docker (optional)

Bun manages dependencies and runs scripts/tests. Astro and Wrangler still use Node.js; the self-hosted server also remains on Node.js.

### Frontend
Install the required packages.
```sh
cd frontend/
bun install --frozen-lockfile
```
Run in development mode
```
bun run dev
```
### Backend
Running the backend
```
cd backend/
go run cmd/api/main.go
```
or run the docker image
```
docker run $(docker build -q .)
```

## How to contribute
- Submissions are welcome, create a PR or [create an issue](https://github.com/0xlaurens/sendfa.st/issues/new).
- Help review the [pending issues](https://github.com/0xlaurens/sendfa.st/issues) the by leaving a comment or reaction.

## License
This project is licensed under GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

Developed by [0xLaurens](https://0xlaurens.com) with ❤️. 
