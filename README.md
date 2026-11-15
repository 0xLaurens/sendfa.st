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
- `GET /api/rooms/<uuid>` returns `200 {"exists":true}` for a known, unexpired room and `404 {"exists":false}` otherwise. The path UUID must be valid. Other methods return `405`.
- Browser HTTP requests and WebSocket handshakes with an `Origin` must match an exact comma-separated `ALLOWED_ORIGINS` entry. A rejected origin returns `403`; HTTP preflight returns `204` and allows `GET`, `POST`, `OPTIONS`, and `Content-Type`. Requests without an Origin are permitted for non-browser clients. No credentials are enabled.
- WebSocket admission uses `GET /api/websocket?roomId=<uuid>` with the standard `Upgrade: websocket` header and exactly one valid UUID `roomId`. Missing/invalid UUIDs return `400`; non-GET requests return `405`; missing upgrade returns `426`. Unknown or expired rooms return `410` and are never created by admission. A room accepts up to eight simultaneous peers.
- Room identifiers are UUIDs in the existing share link (`/r/<uuid>`) and are sent as the `roomId` WebSocket query parameter. A room with no peers is eligible for expiry after 60 seconds; expiry metadata and its Durable Object alarm are established before room creation succeeds. Joining marks the room active; the final departure starts a fresh 60-second unused deadline.
- The first WebSocket frames are `{"type":"IDENTITY","user":...}` and `{"type":"ROOM_JOINED","room":{"id":"<uuid>","user_count":1},"users":[]}` in that order. The snapshot lists already-present peers; later admissions send `USER_JOINED` to existing peers, which initiate the offer. A room identity is kept in its socket attachment and is authoritative, not any client-supplied `from` or `roomId`.
- Browser signaling uses `{"type":"OFFER","payload":{"to":"<peer-uuid>","offer":{"type":"offer","sdp":"<SDP>"},"from":"<untrusted legacy field>","roomId":"<legacy field>"}}`; `ANSWER` uses `answer` with SDP type `answer`, and `ICE_CANDIDATE` uses `candidate` with `candidate` and optional `sdpMid`, `sdpMLineIndex`, and `usernameFragment`. Legacy `from` and `roomId` fields are accepted only in valid form and ignored for authorization. The service validates each peer/field and forwards a server-established `from`; only members of the same room can signal one another. Messages over 64 KiB, invalid JSON, and non-object frames are rejected. Invalid/unknown message schemas are ignored, not forwarded.
- Cancellation is `{"type":"CANCEL_DOWNLOAD","payload":{"roomId":"<uuid>"}}` (the legacy room field is ignored); the sender must be an admitted member and cancellation is broadcast only in that socket's actual room. Files and filenames are exchanged only through the peer-to-peer data channel.

### Local Worker verification

From `frontend/`, run `npm install`. Start the Worker with its dedicated configuration:

```sh
npx wrangler dev --local --config src/worker/wrangler.jsonc --port 8787
```

Set `ALLOWED_ORIGINS` in that config (or a local `.dev.vars`) to the exact UI origin, for example `http://localhost:4321`; configure frontend `PUBLIC_WS_PROTOCOL=ws` and `PUBLIC_WS_HOST=localhost:8787`, then run `npm run dev` in another terminal. A reproducible two-browser walkthrough is: select a file in the first browser, wait for its admitted room link, open that link in the second browser, accept the offer, and verify the downloaded bytes match the original. Signaling carries only SDP/ICE and peer routing data, never files or filenames.

Automated local checks: `npm run test:worker` starts the configured Worker and exercises HTTP method/body/CORS/origin/UUID validation, room creation, ordered admission, labels, rejected unknown-room upgrades, malformed signaling, spoofed identities, expiry/no-resurrection (takes about 61 seconds), the eight-peer limit, and cross-room routing/cancellation. `npm run test:frontend` exercises create-before-connect, admission gating, link availability on upload replacement, and close-during-create through the connection manager. These tests run against local Wrangler/Node test runtimes. They do not constitute a post-change manual two-browser transfer or production Cloudflare hibernation/wake test; do not deploy this Worker without those separate checks.

## Get started

### Prerequisites
- Go version 1.22.5 or higher
- Node.js version 22.22.0 or higher
- Docker (optional)

### Frontend
Install the required packages.
```node
cd frontend/
npm install
```
Run in development mode
```
npm run dev
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
