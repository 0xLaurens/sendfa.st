import worker, { Room as ProductionRoom } from '../src/worker/index.ts';

let now = 2_000_000_000_000;
Date.now = () => now;

export class Room extends ProductionRoom {
  constructor(state, env) { super(state, env); this.testState = state; }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/test-control') {
      if (url.searchParams.has('time')) now = Number(url.searchParams.get('time'));
      if (url.searchParams.has('alarm')) await this.alarm();
      if (url.searchParams.has('closing')) {
        const sockets = this.testState.getWebSockets();
        const closing = sockets.find(ws => ws.deserializeAttachment()?.id === url.searchParams.get('closing'));
        const departing = sockets.find(ws => ws.deserializeAttachment()?.id === url.searchParams.get('departing'));
        closing.close();
        await this.webSocketClose(departing);
      }
      if (url.searchParams.has('overlap')) {
        const socket = this.testState.getWebSockets().find(ws => ws.deserializeAttachment()?.id === url.searchParams.get('overlap'));
        if (socket) await Promise.all([this.webSocketMessage(socket, '{"type":"LEAVE_ROOM"}'), this.webSocketClose(socket), this.webSocketError(socket)]);
      }
      return new Response(null, { status: 204 });
    }
    return super.fetch(request);
  }
}
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/test-control') return env.ROOMS.get(env.ROOMS.idFromName(url.searchParams.get('id'))).fetch(request);
    return worker.fetch(request, env);
  },
};
