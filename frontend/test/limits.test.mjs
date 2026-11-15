import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('configured room capacity rejects another peer', async () => {
  const build = await Bun.build({ entrypoints: ['./src/worker/index.ts'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'limits', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321', MAX_ROOM_PEERS: '1' },
  }));
  try {
    const worker = await mf.getWorker('limits');
    const created = await worker.fetch('http://local/api/rooms', { method: 'POST' });
    const { id } = await created.json();
    const connect = () => worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
    const first = await connect();
    assert.equal(first.status, 101);
    first.webSocket.accept();
    assert.equal((await connect()).status, 503);
    first.webSocket.close();
  } finally { await mf.dispose(); }
});

test('socket burst remains exhausted after hibernation', async () => {
  const build = await Bun.build({ entrypoints: ['./src/worker/index.ts'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'rate', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321', SIGNALS_PER_SECOND: '1', SIGNAL_BURST: '2' },
  }));
  try {
    const worker = await mf.getWorker('rate');
    const { id } = await (await worker.fetch('http://local/api/rooms', { method: 'POST' })).json();
    const response = await worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
    const socket = response.webSocket;
    const messages = [];
    socket.addEventListener('message', event => messages.push(JSON.parse(event.data)));
    const closed = new Promise(resolve => socket.addEventListener('close', resolve));
    socket.accept();
    socket.send('{"type":"ignored"}');
    socket.send('{"type":"ignored"}');
    // A status request drains earlier room events before eviction.
    await worker.fetch(`http://local/api/rooms/${id}`);
    await mf.unsafeEvictDurableObject('rate', 'Room', { name: id, webSockets: 'hibernate' });
    socket.send('{"type":"ignored"}');
    assert.equal((await closed).code, 1008);
  } finally { await mf.dispose(); }
});

test('creation attempts are limited per local IP', async () => {
  const build = await Bun.build({ entrypoints: ['./src/worker/index.ts'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'ip', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321', CREATIONS_PER_MINUTE: '1', UPGRADES_PER_MINUTE: '1' },
  }));
  try {
    const worker = await mf.getWorker('ip');
    const create = ip => worker.fetch('http://local/api/rooms', { method: 'POST', headers: { 'CF-Connecting-IP': ip } });
    const first = await create('192.0.2.1');
    assert.equal(first.status, 201);
    const { id } = await first.json();
    assert.equal((await create('192.0.2.1')).status, 429);
    assert.equal((await create('192.0.2.2')).status, 201);
    const upgrade = ip => worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket', 'CF-Connecting-IP': ip } });
    const connected = await upgrade('192.0.2.1');
    assert.equal(connected.status, 101);
    connected.webSocket.accept();
    assert.equal((await upgrade('192.0.2.1')).status, 429);
    const other = await upgrade('192.0.2.2');
    assert.equal(other.status, 101);
    other.webSocket.accept();
    connected.webSocket.close(); other.webSocket.close();
  } finally { await mf.dispose(); }
});

test('message size is measured in UTF-8 bytes before parsing', async () => {
  const build = await Bun.build({ entrypoints: ['./src/worker/index.ts'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'size', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321', MAX_MESSAGE_BYTES: '20' },
  }));
  try {
    const worker = await mf.getWorker('size');
    const { id } = await (await worker.fetch('http://local/api/rooms', { method: 'POST' })).json();
    const response = await worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
    const socket = response.webSocket;
    const closed = new Promise(resolve => socket.addEventListener('close', resolve));
    socket.accept();
    socket.send('{"type":"ignored"}  '); // 20 bytes, accepted
    socket.send('{"type":"ignored"} é'); // 21 bytes, rejected
    assert.equal((await closed).code, 1009);
  } finally { await mf.dispose(); }
});

test('default payload and burst boundaries hold at fixed time', async () => {
  const build = await Bun.build({ entrypoints: ['./test/lifecycle-runtime.mjs'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'defaults', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321' },
  }));
  try {
    const worker = await mf.getWorker('defaults');
    const { id } = await (await worker.fetch('http://local/api/rooms', { method: 'POST' })).json();
    const connect = async () => {
      const response = await worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
      const socket = response.webSocket;
      const closed = new Promise(resolve => socket.addEventListener('close', resolve));
      socket.accept();
      return { socket, closed };
    };
    const size = await connect();
    size.socket.send('{"type":"ignored"}'.padEnd(65536));
    size.socket.send('{"type":"ignored"}'.padEnd(65537));
    assert.equal((await size.closed).code, 1009);
    const rate = await connect();
    for (let i = 0; i < 121; i++) rate.socket.send('{"type":"ignored"}');
    assert.equal((await rate.closed).code, 1008);
  } finally { await mf.dispose(); }
});

test('default IP windows reject the next attempt and reset at one minute', async () => {
  const build = await Bun.build({ entrypoints: ['./test/lifecycle-runtime.mjs'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'windows', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321' },
  }));
  try {
    const worker = await mf.getWorker('windows');
    const unknown = crypto.randomUUID();
    const create = () => worker.fetch('http://local/api/rooms', { method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.5' } });
    const upgrade = () => worker.fetch(`http://local/api/websocket?roomId=${unknown}`, { headers: { Upgrade: 'websocket', 'CF-Connecting-IP': '192.0.2.5' } });
    for (let i = 0; i < 10; i++) assert.equal((await create()).status, 201);
    assert.equal((await create()).status, 429);
    for (let i = 0; i < 30; i++) assert.equal((await upgrade()).status, 410);
    assert.equal((await upgrade()).status, 429);
    await worker.fetch(`http://local/test-control?id=${unknown}&time=2000000059999`);
    assert.equal((await create()).status, 429);
    assert.equal((await upgrade()).status, 429);
    await worker.fetch(`http://local/test-control?id=${unknown}&time=2000000060000`);
    assert.equal((await create()).status, 201);
    assert.equal((await upgrade()).status, 410);
  } finally { await mf.dispose(); }
});

test('socket rate refills continuously and caps at the configured burst', async () => {
  const build = await Bun.build({ entrypoints: ['./test/lifecycle-runtime.mjs'], target: 'browser' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'refill', modules: true, script: await build.outputs[0].text(),
    compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
    bindings: { ALLOWED_ORIGINS: 'http://localhost:4321', SIGNALS_PER_SECOND: '2', SIGNAL_BURST: '1' },
  }));
  try {
    const worker = await mf.getWorker('refill');
    const { id } = await (await worker.fetch('http://local/api/rooms', { method: 'POST' })).json();
    const response = await worker.fetch(`http://local/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
    const socket = response.webSocket;
    const closed = new Promise(resolve => socket.addEventListener('close', resolve));
    socket.accept();
    socket.send('{"type":"ignored"}');
    await worker.fetch(`http://local/api/rooms/${id}`);
    await worker.fetch(`http://local/test-control?id=${id}&time=2000000000500`);
    socket.send('{"type":"ignored"}');
    await worker.fetch(`http://local/api/rooms/${id}`);
    await worker.fetch(`http://local/test-control?id=${id}&time=2000000010000`);
    socket.send('{"type":"ignored"}');
    socket.send('{"type":"ignored"}');
    assert.equal((await closed).code, 1008);
  } finally { await mf.dispose(); }
});
