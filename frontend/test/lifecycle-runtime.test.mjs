import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const build = await Bun.build({ entrypoints: ['./test/lifecycle-runtime.mjs'], target: 'browser' });
assert.equal(build.success, true);
const mf = new Miniflare(convertV4MiniflareOptions({
  name: 'lifecycle', modules: true, script: await build.outputs[0].text(),
  compatibilityDate: '2026-07-09', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } },
  bindings: { ALLOWED_ORIGINS: 'http://localhost:4321' },
}));
const worker = await mf.getWorker('lifecycle');
after(() => mf.dispose());
const fetch = (path, options) => worker.fetch(`http://local${path}`, options);
const control = (id, params) => fetch(`/test-control?id=${id}&${new URLSearchParams(params)}`);
async function create() {
  const response = await fetch('/api/rooms', { method: 'POST' });
  assert.equal(response.status, 201);
  return (await response.json()).id;
}
async function connect(id) {
  const response = await fetch(`/api/websocket?roomId=${id}`, { headers: { Upgrade: 'websocket' } });
  if (response.status !== 101) return { status: response.status };
  const socket = response.webSocket, queue = [], waiters = [];
  socket.addEventListener('message', event => {
    const value = JSON.parse(event.data);
    const waiter = waiters.shift();
    if (waiter) waiter(value); else queue.push(value);
  });
  socket.accept();
  const message = () => queue.length ? Promise.resolve(queue.shift()) : new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('message timeout')), 3000);
    waiters.push(value => { clearTimeout(timer); resolve(value); });
  });
  return { socket, message, queue, identity: await message(), snapshot: await message() };
}

test('eviction reconstructs identities, roster, routing and one departure', async () => {
  const id = await create(), first = await connect(id), second = await connect(id);
  assert.equal((await first.message()).user.id, second.identity.user.id);
  await mf.unsafeEvictDurableObject('lifecycle', 'Room', { name: id, webSockets: 'hibernate' });
  const third = await connect(id);
  assert.equal(third.snapshot.room.user_count, 3);
  assert.deepEqual(third.snapshot.users.map(user => user.id).sort(), [first.identity.user.id, second.identity.user.id].sort());
  await first.message(); await second.message();
  first.socket.send(JSON.stringify({ type: 'ICE_CANDIDATE', payload: { to: second.identity.user.id, candidate: { candidate: '' } } }));
  assert.equal((await second.message()).from, first.identity.user.id);
  await control(id, { overlap: second.identity.user.id });
  assert.equal((await first.message()).user.id, second.identity.user.id);
  assert.equal((await third.message()).user.id, second.identity.user.id);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(first.queue, []); assert.deepEqual(third.queue, []);
  first.socket.close(); third.socket.close();
});

test('admission honors the deadline before alarm delivery, including the exact boundary', async () => {
  await control(crypto.randomUUID(), { time: 2000000000000 });
  const before = await create(), at = await create(), after = await create();
  await control(before, { time: 2000000059999 });
  const accepted = await connect(before);
  assert.equal(accepted.snapshot.room.user_count, 1);
  await control(at, { time: 2000000060000 });
  assert.equal((await connect(at)).status, 410);
  assert.equal((await fetch(`/api/rooms/${at}`)).status, 404);
  await control(after, { time: 2000000060001 });
  assert.equal((await connect(after)).status, 410);
  assert.equal((await connect(at)).status, 410);
  await control(at, { alarm: 1 });
  assert.equal((await connect(at)).status, 410);
  accepted.socket.close();
});

test('stale and repeated alarms cannot delete active admissions or revive expired rooms', async () => {
  await control(crypto.randomUUID(), { time: 2000000100000 });
  const id = await create();
  await control(id, { time: 2000000159999, alarm: 1 });
  const [peer] = await Promise.all([connect(id), control(id, { alarm: 1 })]);
  assert.equal(peer.snapshot.room.user_count, 1);
  await control(id, { time: 2000000160001, alarm: 1 });
  await control(id, { alarm: 1 });
  assert.equal((await fetch(`/api/rooms/${id}`)).status, 200);
  const next = await connect(id);
  assert.equal(next.snapshot.room.user_count, 2);
  await peer.message();
  await control(id, { overlap: peer.identity.user.id });
  assert.equal((await next.message()).user.id, peer.identity.user.id);
  await control(id, { overlap: next.identity.user.id });
  await control(id, { time: 2000000220002, alarm: 1 });
  await control(id, { alarm: 1 });
  assert.equal((await fetch(`/api/rooms/${id}`)).status, 404);
  assert.equal((await connect(id)).status, 410);
});

test('malformed-message close removes membership without duplicate departure notices', async () => {
  const id = await create(), observer = await connect(id), broken = await connect(id);
  await observer.message();
  broken.socket.send('not-json');
  const left = await observer.message();
  assert.equal(left.type, 'USER_LEFT');
  assert.equal(left.user.id, broken.identity.user.id);
  await control(id, { overlap: broken.identity.user.id });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(observer.queue, []);
  const newcomer = await connect(id);
  assert.equal(newcomer.snapshot.room.user_count, 2);
  assert.deepEqual(newcomer.snapshot.users.map(user => user.id), [observer.identity.user.id]);
  observer.socket.close(); newcomer.socket.close();
});

test('departure cleanup survives another socket already closing', async () => {
  const id = await create(), observer = await connect(id), closing = await connect(id), departing = await connect(id);
  await observer.message(); await observer.message(); await closing.message();
  assert.equal((await control(id, { closing: closing.identity.user.id, departing: departing.identity.user.id })).status, 204);
  const notices = [await observer.message(), await observer.message()];
  assert.deepEqual(notices.map(item => item.user.id).sort(), [closing.identity.user.id, departing.identity.user.id].sort());
  const newcomer = await connect(id);
  assert.equal(newcomer.snapshot.room.user_count, 2);
  assert.deepEqual(newcomer.snapshot.users.map(user => user.id), [observer.identity.user.id]);
  observer.socket.close(); newcomer.socket.close();
});

test('overlapping admission and departure leaves an accurate roster', async () => {
  const id = await create(), observer = await connect(id), departing = await connect(id);
  await observer.message();
  const [joining, cleanup] = await Promise.all([
    connect(id), control(id, { overlap: departing.identity.user.id, alarm: 1 }),
  ]);
  assert.equal(cleanup.status, 204);
  assert.ok(joining.snapshot.room.user_count === 2 || joining.snapshot.room.user_count === 3);
  const witness = await connect(id);
  assert.equal(witness.snapshot.room.user_count, 3);
  assert.deepEqual(witness.snapshot.users.map(user => user.id).sort(), [observer.identity.user.id, joining.identity.user.id].sort());
  assert.equal((await fetch(`/api/rooms/${id}`)).status, 200);
  observer.socket.close(); joining.socket.close(); witness.socket.close();
});
