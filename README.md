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

The Go backend remains available. The independently deployable TypeScript Cloudflare Worker in `frontend/src/worker` provides an alternative signaling backend: `POST /api/rooms` allocates a UUID, and `GET /api/websocket?roomId=<uuid>` admits a browser to an existing room. Room identifiers are bearer capabilities. The Worker keeps only temporary lifecycle metadata in Durable Object SQLite; active identity is held in socket attachments. Files, filenames, SDP/ICE history, and durable user identities are not stored. Cloudflare may independently process transport metadata under its platform logging policies.
Over the direct WebRTC datachannel information is exchanged about the file. If the other user accepts the files the download starts. The downloader informs the sender when to start sending the next file if there are multiple.

## How private and secure is it?
The signaling service facilitates WebRTC setup; file data travels directly over a peer-to-peer data channel. Worker room lifecycle metadata is temporary and expires after 60 seconds unused or after the final peer leaves. All protocols are encrypted using TLS in deployed environments.

### Local Worker verification

From `frontend/`, run `npm install`, then `npx wrangler dev --local --port 8787`. Configure `ALLOWED_ORIGINS` to include the exact frontend origin (for example `http://localhost:4321`) and set frontend `PUBLIC_WS_PROTOCOL=ws`, `PUBLIC_WS_HOST=localhost:8787`. Start the UI with `npm run dev`. Verify `GET /api/health`, create a room with `POST /api/rooms`, then open its `/r/<uuid>` link in a second browser and send a file. Unknown or expired rooms are rejected. This is a local verification recipe, not staging evidence. Real Cloudflare hibernation/wake and eight-peer validation remain staging gates.

The HTTP API permits `GET /api/health` and `POST /api/rooms`. Room creation and WebSocket admission enforce the configured exact Origin allowlist when a browser supplies an Origin. Admission orders `IDENTITY`, `ROOM_JOINED`, then peer notification. Signaling messages retain `type`/`payload` envelopes and use `to` routing fields. Application signaling payloads are not logged.

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
