import { spawn } from 'node:child_process';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';

const port = 8799;
const base = `http://127.0.0.1:${port}`;
const child = spawn('npx', ['wrangler', 'dev', '--local', '--config', 'src/worker/wrangler.jsonc', '--port', String(port)], { stdio: 'ignore' });
let server;
for (let attempt = 0; attempt < 60; attempt++) {
  try { if ((await fetch(`${base}/api/health`)).ok) { server = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
after(() => child.kill('SIGTERM'));

test('room create, origin validation, and ordered websocket admission', async () => {
  assert.equal(server, true, 'local Worker starts');
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const forbidden = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: 'https://evil.invalid' } });
  assert.equal(forbidden.status, 403);
  const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: 'http://localhost:4321' } });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.match(id, /^[0-9a-f-]{36}$/i);
  assert.equal((await fetch(`${base}/api/rooms/${id}`)).status, 200);

  const socket = new WebSocket(`ws://127.0.0.1:${port}/api/websocket?roomId=${id}`);
  const messages = [];
  let secondSocket;
  try {
    for (let i = 0; i < 2; i++) {
      const event = await Promise.race([new Promise(resolve => socket.addEventListener('message', resolve, { once: true })), new Promise((_, reject) => setTimeout(() => reject(Error('message timeout')), 5000))]);
      messages.push(JSON.parse(event.data));
    }
    assert.deepEqual(messages.map(message => message.type), ['IDENTITY', 'ROOM_JOINED']);
    assert.equal(messages[1].room.id, id);

    const joinedPromise = Promise.race([new Promise(resolve => socket.addEventListener('message', resolve, { once: true })), new Promise((_, reject) => setTimeout(() => reject(Error('peer notification timeout')), 5000))]);
    secondSocket = new WebSocket(`ws://127.0.0.1:${port}/api/websocket?roomId=${id}`);
    const secondMessages = [];
    for (let i = 0; i < 2; i++) {
      const event = await Promise.race([new Promise(resolve => secondSocket.addEventListener('message', resolve, { once: true })), new Promise((_, reject) => setTimeout(() => reject(Error('message timeout')), 5000))]);
      secondMessages.push(JSON.parse(event.data));
    }
    assert.deepEqual(secondMessages.map(message => message.type), ['IDENTITY', 'ROOM_JOINED']);
    assert.equal(secondMessages[1].users.length, 1);
    const joined = await joinedPromise;
    assert.equal(JSON.parse(joined.data).type, 'USER_JOINED');
  } finally { socket.close(); }
  secondSocket?.close();

  const unknown = await fetch(`${base}/api/rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
  assert.equal(unknown.status, 404);
});
