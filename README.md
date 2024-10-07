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

The Go backend is used to create and connect users via `rooms`. In these rooms the `users` share the information required for setting up a direct WebRTC connection. These rooms are websocket connections, to have instant commnication between the users and the server.
Over the direct WebRTC datachannel information is exchanged about the file. If the other user accepts the files the download starts. The downloader informs the sender when to start sending the next file if there are multiple.

## How private and secure is it?
The only point of contact with a server is to facilite the creation of a `WebRTC` all other info is exchange via a p2p connection. The server persists no state. All protocols are encrypted using TLS.

## Get started

### Prerequisites
- Go version 1.22.5 or higher
- Node.js version 20.12.2 or higher
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
