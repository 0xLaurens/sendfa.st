import { spawn } from 'node:child_process';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const port = 8799;
const base = `http://127.0.0.1:${port}`;
const child = spawn('npx', ['wrangler', 'dev', '--local', '--config', 'src/worker/wrangler.jsonc', '--port', String(port)], { stdio: 'inherit' });
let server;
for (let attempt = 0; attempt < 60; attempt++) {
  try { if ((await fetch(`${base}/api/health`)).ok) { server = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
after(() => child.kill('SIGTERM'));

const uuid = () => crypto.randomUUID();
const validSdp = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
async function createRoom() {
  const response = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: 'http://localhost:4321' } });
  assert.equal(response.status, 201);
  return (await response.json()).id;
}
function connect(id, { origin = 'http://localhost:4321', agent = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/130.0' } = {}) {
  return new WebSocket(`ws://127.0.0.1:${port}/api/websocket?roomId=${id}`, { headers: { Origin: origin, 'User-Agent': agent } });
}
function message(socket) {
  return Promise.race([
    new Promise(resolve => socket.once('message', data => resolve(JSON.parse(data.toString())))),
    new Promise((_, reject) => socket.once('error', reject)),
    new Promise((_, reject) => socket.once('unexpected-response', (_request, response) => reject(Error(`websocket rejected: ${response.statusCode}`)))),
    new Promise((_, reject) => setTimeout(() => reject(Error('message timeout')), 5000)),
  ]);
}
function assertSilent(socket, duration = 200) {
  return new Promise((resolve, reject) => {
    const onMessage = data => { clearTimeout(timer); reject(Error(`unexpected message: ${data}`)); };
    const timer = setTimeout(() => { socket.off('message', onMessage); resolve(); }, duration);
    socket.once('message', onMessage);
  });
}
async function join(id, options) {
  const socket = connect(id, options);
  const identity = await message(socket);
  const snapshot = await message(socket);
  return { socket, identity, snapshot };
}

test('HTTP methods, CORS, origins, and UUID validation have explicit contracts', async () => {
  assert.equal(server, true, 'local Worker starts');
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const forbidden = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: 'https://evil.invalid' } });
  assert.equal(forbidden.status, 403);
  const preflight = await fetch(`${base}/api/rooms`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:4321' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:4321');
  assert.equal((await fetch(`${base}/api/rooms`)).status, 405);
  assert.equal((await fetch(`${base}/api/rooms/not-a-uuid`)).status, 400);
  assert.equal((await fetch(`${base}/api/rooms`, { method: 'POST', body: '{' })).status, 400);
  const id = await createRoom();
  assert.match(id, /^[0-9a-f-]{36}$/i);
  assert.equal((await fetch(`${base}/api/rooms/${id}`)).status, 200);
  assert.equal((await fetch(`${base}/api/rooms/${id}`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/websocket?roomId=${id}`)).status, 426);
  assert.equal((await fetch(`${base}/api/websocket`)).status, 426);
});

test('admission sends identity and snapshot before join notice; preserves device labels', async () => {
  const id = await createRoom();
  const first = await join(id);
  const joinedNotice = message(first.socket);
  const second = await join(id, { agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' });
  try {
    assert.deepEqual([first.identity.type, first.snapshot.type], ['IDENTITY', 'ROOM_JOINED']);
    assert.equal(first.snapshot.room.id, id);
    assert.equal(first.identity.user.device_name, 'Linux');
    assert.equal(second.snapshot.users.length, 1);
    assert.equal(second.identity.user.device_name, 'iOS');
    assert.equal((await joinedNotice).type, 'USER_JOINED');
  } finally {
    first.socket.close(); second.socket.close();
  }
});

test('unknown UUIDs cannot be admitted and malformed websocket origins are rejected', async () => {
  const unknown = uuid();
  assert.equal((await fetch(`${base}/api/rooms/${unknown}`)).status, 404);
  const rejected = connect(unknown);
  const unavailable = await new Promise(resolve => {
    rejected.once('error', error => resolve(error.message));
    rejected.once('unexpected-response', (_request, response) => resolve(response.statusCode));
  });
  assert.match(String(unavailable), /410|Unexpected server response/);
  const id = await createRoom();
  const evil = connect(id, { origin: 'https://evil.invalid' });
  await new Promise((resolve, reject) => {
    evil.once('open', () => reject(Error('unexpected open')));
    evil.once('error', resolve);
  });
  evil.close();
});

test('malformed messages and forged routing identities cannot forward signaling', async () => {
  const id = await createRoom();
  const sender = await join(id);
  const receiverJoined = message(sender.socket);
  const receiver = await join(id);
  try {
    await receiverJoined;
    // Consume the notification sent to the original member on receiver admission.
    for (const data of [
      JSON.stringify({ type: 'NOPE', payload: {} }),
      JSON.stringify({ type: 'OFFER', payload: { to: receiver.identity.user.id, offer: { filename: 'secret.txt' } } }),
      JSON.stringify({ type: 'OFFER', payload: { to: receiver.identity.user.id, from: sender.identity.user.id, offer: { type: 'offer', sdp: 42 } } }),
      JSON.stringify({ type: 'OFFER', payload: { to: receiver.identity.user.id, offer: { type: 'offer', sdp: 'v=0' } } }),
      JSON.stringify({ type: 'OFFER', payload: { to: receiver.identity.user.id, offer: { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' } } }),
      JSON.stringify({ type: 'ANSWER', payload: { to: receiver.identity.user.id, answer: { type: 'offer', sdp: 'v=0' } } }),
      JSON.stringify({ type: 'ICE_CANDIDATE', payload: { to: receiver.identity.user.id, candidate: { candidate: 7 } } }),
      JSON.stringify({ type: 'ICE_CANDIDATE', payload: { to: receiver.identity.user.id, candidate: { candidate: 'filename secret.txt' } } }),
      JSON.stringify({ type: 'OFFER', payload: { to: uuid(), offer: { type: 'offer', sdp: 'v=0' } } }),
    ]) sender.socket.send(data);
    await assertSilent(receiver.socket);
    sender.socket.send(JSON.stringify({ type: 'OFFER', from: uuid(), payload: { roomId: uuid(), from: uuid(), to: receiver.identity.user.id, offer: { type: 'offer', sdp: validSdp } } }));
    const forwarded = await message(receiver.socket);
    assert.equal(forwarded.payload.from, sender.identity.user.id);
    assert.equal(forwarded.from, sender.identity.user.id);
    const malformed = await join(id);
    malformed.socket.send('not-json');
    await new Promise((resolve, reject) => {
      malformed.socket.once('close', resolve);
      malformed.socket.once('error', reject);
      setTimeout(() => reject(Error('malformed socket remained open')), 2000);
    });
    malformed.socket.close();
  } finally {
    sender.socket.close(); receiver.socket.close();
  }
});

test('unused room expiry is authoritative and cannot be resurrected', async () => {
  const id = await createRoom();
  assert.equal((await fetch(`${base}/api/rooms/${id}`)).status, 200);
  await new Promise(resolve => setTimeout(resolve, 61_000));
  assert.equal((await fetch(`${base}/api/rooms/${id}`)).status, 404);
  const expired = connect(id);
  const result = await new Promise(resolve => {
    expired.once('error', error => resolve(error.message));
    expired.once('unexpected-response', (_request, response) => resolve(response.statusCode));
  });
  assert.match(String(result), /410|Unexpected server response/);
  assert.equal((await fetch(`${base}/api/rooms/${id}`)).status, 404);
});

test('room capacity rejection does not affect admitted peers', async () => {
  const id = await createRoom();
  const peers = [];
  try {
    peers.push(await join(id));
    for (let i = 1; i < 8; i++) {
      const notice = message(peers[0].socket);
      peers.push(await join(id));
      assert.equal((await notice).type, 'USER_JOINED');
    }
    const overflow = connect(id);
    const status = await new Promise(resolve => {
      overflow.once('error', error => resolve(error.message));
      overflow.once('unexpected-response', (_request, response) => resolve(response.statusCode));
    });
    assert.match(String(status), /503|Unexpected server response/);
    await assertSilent(peers[0].socket);
    assert.equal(peers[0].socket.readyState, WebSocket.OPEN);
    overflow.close();
  } finally {
    for (const peer of peers) peer.socket.close();
  }
});

test('cross-room signaling and cancellation do not reach unrelated peers', async () => {
  const a = await createRoom(), b = await createRoom();
  const sender = await join(a);
  const joined = message(sender.socket);
  const sameRoom = await join(a);
  const receiver = await join(b);
  try {
    await joined;
    const senderCancellation = message(sender.socket);
    const siblingCancellation = message(sameRoom.socket);
    const unrelatedSilence = assertSilent(receiver.socket);
    sender.socket.send(JSON.stringify({ type: 'CANCEL_DOWNLOAD', payload: { roomId: b } }));
    sender.socket.send(JSON.stringify({ type: 'OFFER', payload: { roomId: b, to: receiver.identity.user.id, offer: { type: 'offer', sdp: validSdp } } }));
    sender.socket.send(JSON.stringify({ type: 'ANSWER', payload: { roomId: b, to: receiver.identity.user.id, answer: { type: 'answer', sdp: validSdp } } }));
    sender.socket.send(JSON.stringify({ type: 'ICE_CANDIDATE', payload: { roomId: b, to: receiver.identity.user.id, candidate: { candidate: 'candidate:1 1 UDP 2122260223 192.0.2.1 54400 typ host' } } }));
    assert.equal((await senderCancellation).type, 'CANCEL_DOWNLOAD');
    assert.equal((await siblingCancellation).type, 'CANCEL_DOWNLOAD');
    await unrelatedSilence;
  } finally { sender.socket.close(); sameRoom.socket.close(); receiver.socket.close(); }
});
