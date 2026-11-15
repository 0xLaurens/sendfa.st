export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  ALLOWED_ORIGINS: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200, origin?: string) => Response.json(body, { status, headers: origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : undefined });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
    if (origin && !allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403);
    if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin ?? "", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" } });
    if (url.pathname === "/api/health" && request.method === "GET") return new Response(null, { status: 200, headers: origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : undefined });
    if (url.pathname === "/api/rooms") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
      const roomId = crypto.randomUUID();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      const created = await stub.fetch("https://room.internal/create", { method: "POST" });
      if (!created.ok) return json({ error: "room_creation_failed" }, 503, origin);
      return json({ id: roomId }, 201, origin);
    }
    const roomMatch = url.pathname.match(/^\/api\/rooms\/([0-9a-f-]+)$/i);
    if (roomMatch) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);
      if (!UUID.test(roomMatch[1])) return json({ error: "invalid_room_id" }, 400, origin);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomMatch[1]));
      const status = await stub.fetch("https://room.internal/status");
      return json({ exists: status.ok }, status.ok ? 200 : 404, origin);
    }
    if (url.pathname === "/api/websocket") {
      if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return json({ error: "websocket_upgrade_required" }, 426);
      const roomId = url.searchParams.get("roomId");
      if (!roomId || !UUID.test(roomId)) return json({ error: "invalid_room_id" }, 400);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      return stub.fetch(new Request(`https://room.internal/connect?roomId=${roomId}`, request));
    }
    return json({ error: "not_found" }, 404);
  },
};

interface Peer { id: string; deviceName: string }
export class Room {
  private state: DurableObjectState;
  private expiryKey = "expiresAt";
  constructor(state: DurableObjectState) { this.state = state; }

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === "/status") {
      const expiry = await this.state.storage.get<number>(this.expiryKey);
      return new Response(null, { status: expiry === 0 || (expiry !== undefined && expiry > Date.now()) ? 200 : 404 });
    }
    if (new URL(request.url).pathname === "/create") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      const expiresAt = Date.now() + 60_000;
      await this.state.storage.put(this.expiryKey, expiresAt);
      await this.state.storage.setAlarm(expiresAt);
      return new Response(null, { status: 201 });
    }
    const expiry = await this.state.storage.get<number>(this.expiryKey);
    if (expiry === undefined || (expiry !== 0 && expiry <= Date.now())) return json({ error: "room_expired" }, 410);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return json({ error: "upgrade_required" }, 426);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = crypto.randomUUID();
    const attachment: Peer = { id, deviceName: "Unknown device" };
    this.state.acceptWebSocket(server);
    const peers = this.peers();
    if (peers.length >= 8) {
      server.close(1013, "room_full");
      return json({ error: "room_full" }, 503);
    }
    const user = { id, display_name: attachment.deviceName, device_name: attachment.deviceName };
    server.serializeAttachment({ ...attachment, user });
    server.send(JSON.stringify({ type: "IDENTITY", user }));
    server.send(JSON.stringify({ type: "ROOM_JOINED", room: { id: new URL(request.url).searchParams.get("roomId"), user_count: peers.length + 1 }, users: peers.map(peer => (peer as any).user ?? peer) }));
    this.broadcast({ type: "USER_JOINED", user }, server);
    await this.state.storage.put(this.expiryKey, 0);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    const peers = this.peers();
    const sender = socket.deserializeAttachment() as Peer | null;
    if (!sender) return;
    const bytes = typeof raw === "string" ? new TextEncoder().encode(raw).byteLength : raw.byteLength;
    if (bytes > 64 * 1024) { socket.close(1009); return; }
    let message: any;
    try { message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { socket.close(1003); return; }
    if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.type !== "string") { socket.close(1003); return; }
    if (message.type === "CANCEL_DOWNLOAD") {
      this.broadcast({ type: "CANCEL_DOWNLOAD" });
      return;
    }
    const field = message.type === "OFFER" ? "offer" : message.type === "ANSWER" ? "answer" : message.type === "ICE_CANDIDATE" ? "candidate" : null;
    if (!field || !message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) return;
    const target = message.payload.to;
    const signal = message.payload[field];
    if (typeof target !== "string" || !UUID.test(target) || !signal || typeof signal !== "object" || Array.isArray(signal)) return;
    if (!peers.some(peer => peer.id === target)) return;
    this.sendTo(target, { type: message.type, from: sender.id, payload: { from: sender.id, [field]: signal } });
  }

  webSocketClose(socket: WebSocket) { this.leave(socket); }
  webSocketError(socket: WebSocket) { this.leave(socket); }
  async alarm() {
    if (this.peers().length) return;
    const expires = await this.state.storage.get<number>(this.expiryKey);
    if (expires !== undefined && expires !== 0 && expires <= Date.now()) await this.state.storage.deleteAll();
  }

  private peers(): Peer[] {
    return this.state.getWebSockets().map(socket => socket.deserializeAttachment() as Peer).filter(Boolean);
  }
  private broadcast(message: unknown, except?: WebSocket) {
    for (const socket of this.state.getWebSockets()) if (socket !== except) socket.send(JSON.stringify(message));
  }
  private sendTo(id: string, message: unknown) {
    for (const socket of this.state.getWebSockets()) if ((socket.deserializeAttachment() as Peer)?.id === id) socket.send(JSON.stringify(message));
  }
  private async leave(socket: WebSocket) {
    const peer = socket.deserializeAttachment() as Peer | null;
    try { socket.close(); } catch {}
    if (peer) this.broadcast({ type: "USER_LEFT", user: peer });
    if (!this.peers().length) {
      const expiry = Date.now() + 60_000;
      await this.state.storage.put(this.expiryKey, expiry);
      await this.state.storage.setAlarm(expiry);
    }
  }
}
