export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  ALLOWED_ORIGINS: string;
  MAX_ROOM_PEERS?: string;
  SIGNALS_PER_SECOND?: string;
  SIGNAL_BURST?: string;
  CREATIONS_PER_MINUTE?: string;
  UPGRADES_PER_MINUTE?: string;
  MAX_MESSAGE_BYTES?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const attempts = new Map<string, { count: number; expires: number }>();
let nextSweep = 0;
function rateLimited(request: Request, kind: string, maximum: number): boolean {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return false;
  const now = Date.now(), key = `${kind}:${ip}`;
  if (now >= nextSweep) {
    for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
    nextSweep = now + 60_000;
  }
  let entry = attempts.get(key);
  if (!entry || entry.expires <= now) {
    // shortcut: per-isolate counters can be evicted under load; use platform rate limiting if stronger protection is needed.
    if (attempts.size >= 10_000) attempts.delete(attempts.keys().next().value!);
    entry = { count: 0, expires: now + 60_000 };
    attempts.set(key, entry);
  }
  return ++entry.count > maximum;
}
const json = (body: unknown, status = 200, origin?: string) => Response.json(body, { status, headers: origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : undefined });
const noStore = (response: Response) => { response.headers.set("Cache-Control", "no-store"); return response; };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
    if (origin && !allowed.includes(origin)) {
      const response = json({ error: "origin_not_allowed" }, 403);
      return roomMatch && request.method === "GET" ? noStore(response) : response;
    }
    if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
      if (!origin) return json({ error: "origin_required" }, 403);
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" } });
    }
    if (url.pathname === "/api/health") return request.method === "GET"
      ? new Response(null, { status: 200, headers: origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : undefined })
      : json({ error: "method_not_allowed" }, 405, origin);
    if (url.pathname === "/api/rooms") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
      if (request.body !== null && request.headers.get("Content-Length") !== "0") return json({ error: "request_body_not_allowed" }, 400, origin);
      if (rateLimited(request, "create", limit(env.CREATIONS_PER_MINUTE, 10))) return json({ error: "rate_limited" }, 429, origin);
      const roomId = crypto.randomUUID();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      const created = await stub.fetch("https://room.internal/create", { method: "POST" });
      if (!created.ok) return json({ error: "room_creation_failed" }, 503, origin);
      return json({ id: roomId }, 201, origin);
    }
    if (roomMatch) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);
      if (!UUID.test(roomMatch[1])) return noStore(json({ error: "invalid_room_id" }, 400, origin));
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomMatch[1]));
      const status = await stub.fetch("https://room.internal/status");
      const response = status.status === 200 || status.status === 404
        ? json({ exists: status.ok }, status.status, origin)
        : json({ error: "room_status_unavailable" }, 503, origin);
      return noStore(response);
    }
    if (url.pathname === "/api/websocket") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return json({ error: "websocket_upgrade_required" }, 426, origin);
      const roomId = url.searchParams.get("roomId");
      if (!roomId || url.searchParams.getAll("roomId").length !== 1 || !UUID.test(roomId)) return json({ error: "invalid_room_id" }, 400, origin);
      if (rateLimited(request, "upgrade", limit(env.UPGRADES_PER_MINUTE, 30))) return json({ error: "rate_limited" }, 429, origin);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      return stub.fetch(new Request(`https://room.internal/connect?roomId=${roomId}`, request));
    }
    return json({ error: "not_found" }, 404);
  },
};

interface User { id: string; display_name: string; device_name: string }
interface Peer { id: string; user: User; tokens?: number; updatedAt?: number }
const limit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const roomLifetimeMs = 60_000;
function deviceLabel(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown device";
}
function validSignal(type: string, signal: unknown): boolean {
  if (!signal || typeof signal !== "object" || Array.isArray(signal)) return false;
  const value = signal as Record<string, unknown>;
  if (type === "OFFER" || type === "ANSWER") return Object.keys(value).every(key => ["type", "sdp"].includes(key)) &&
    value.type === (type === "OFFER" ? "offer" : "answer") &&
    typeof value.sdp === "string" && /^v=0\r?\n/.test(value.sdp) &&
    /^o=.*\r?\n/m.test(value.sdp) && /^s=.*\r?\n/m.test(value.sdp) &&
    /^t=[0-9]+ [0-9]+\r?\n/m.test(value.sdp) &&
    /^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel\r?\n/m.test(value.sdp) &&
    value.sdp.length <= 48 * 1024;
  if (!Object.keys(value).every(key => ["candidate", "sdpMid", "sdpMLineIndex", "usernameFragment"].includes(key)) ||
    typeof value.candidate !== "string" ||
    (value.sdpMid !== undefined && value.sdpMid !== null && typeof value.sdpMid !== "string") ||
    (value.sdpMLineIndex !== undefined && value.sdpMLineIndex !== null &&
      (!Number.isInteger(value.sdpMLineIndex) || (value.sdpMLineIndex as number) < 0)) ||
    (value.usernameFragment !== undefined && value.usernameFragment !== null && typeof value.usernameFragment !== "string")) return false;
  if (value.candidate === "") return true;
  const candidate = value.candidate.match(/^candidate:\S+ ([12]) (udp|tcp) (\d+) \S+ (\d+) typ (host|srflx|prflx|relay)(?: .+)?$/i);
  return !!candidate && Number(candidate[3]) <= 4_294_967_295 && Number(candidate[4]) <= 65_535;
}
export class Room {
  private state: DurableObjectState;
  private env: Env;
  private expiryKey = "expiresAt";
  constructor(state: DurableObjectState, env: Env) { this.state = state; this.env = env; }

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === "/status") {
      const expiry = await this.state.storage.get<number>(this.expiryKey);
      return new Response(null, { status: expiry === 0 || (expiry !== undefined && expiry > Date.now()) ? 200 : 404 });
    }
    if (new URL(request.url).pathname === "/create") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (await this.state.storage.get<number>(this.expiryKey) !== undefined) return json({ error: "room_already_created" }, 409);
      await this.scheduleExpiry(Date.now() + roomLifetimeMs);
      return new Response(null, { status: 201 });
    }
    const expiry = await this.state.storage.get<number>(this.expiryKey);
    if (expiry === undefined || (expiry !== 0 && expiry <= Date.now())) return json({ error: "room_expired" }, 410);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return json({ error: "upgrade_required" }, 426);
    const peers = this.peers();
    if (peers.length >= limit(this.env.MAX_ROOM_PEERS, 8)) {
      return json({ error: "room_full" }, 503);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = crypto.randomUUID();
    const name = deviceLabel(request.headers.get("User-Agent") ?? "");
    const user: User = { id, display_name: name, device_name: name };
    const attachment: Peer = { id, user };
    server.serializeAttachment(attachment);
    this.state.acceptWebSocket(server);
    server.send(JSON.stringify({ type: "IDENTITY", user }));
    server.send(JSON.stringify({ type: "ROOM_JOINED", room: { id: new URL(request.url).searchParams.get("roomId"), user_count: peers.length + 1 }, users: peers.map(peer => peer.user) }));
    this.broadcast({ type: "USER_JOINED", user }, server);
    await this.state.storage.put(this.expiryKey, 0);
    await this.state.storage.deleteAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    const peers = this.peers();
    const sender = this.peer(socket);
    if (!sender || !peers.some(peer => peer.id === sender.id)) return;
    const now = Date.now(), burst = limit(this.env.SIGNAL_BURST, 120);
    const tokens = Math.min(burst, (sender.tokens ?? burst) + Math.max(0, now - (sender.updatedAt ?? now)) * limit(this.env.SIGNALS_PER_SECOND, 60) / 1000);
    if (tokens < 1) { socket.close(1008); return; }
    socket.serializeAttachment({ ...sender, tokens: tokens - 1, updatedAt: now });
    const bytes = typeof raw === "string" ? new TextEncoder().encode(raw).byteLength : raw.byteLength;
    if (bytes > limit(this.env.MAX_MESSAGE_BYTES, 64 * 1024)) { socket.close(1009); return; }
    let message: any;
    try { message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { socket.close(1003); return; }
    if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.type !== "string") { socket.close(1003); return; }
    if (message.type === "LEAVE_ROOM") { await this.leave(socket); return; }
    if (message.type === "CANCEL_DOWNLOAD") {
      if (Object.keys(message).some(key => key !== "type" && key !== "payload")) return;
      if (message.payload !== undefined && (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload) ||
        Object.keys(message.payload).some(key => key !== "roomId") ||
        (message.payload.roomId !== undefined && (typeof message.payload.roomId !== "string" || !UUID.test(message.payload.roomId))))) return;
      this.broadcast({ type: "CANCEL_DOWNLOAD" });
      return;
    }
    const field = message.type === "OFFER" ? "offer" : message.type === "ANSWER" ? "answer" : message.type === "ICE_CANDIDATE" ? "candidate" : null;
    if (!field || !message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) return;
    if (Object.keys(message).some(key => !["type", "payload", "from"].includes(key)) ||
      Object.keys(message.payload).some(key => !["to", field, "from", "roomId"].includes(key)) ||
      (message.from !== undefined && (typeof message.from !== "string" || !UUID.test(message.from))) ||
      (message.payload.from !== undefined && (typeof message.payload.from !== "string" || !UUID.test(message.payload.from))) ||
      (message.payload.roomId !== undefined && (typeof message.payload.roomId !== "string" || !UUID.test(message.payload.roomId)))) return;
    const target = message.payload.to;
    const signal = message.payload[field];
    if (typeof target !== "string" || !UUID.test(target) || !validSignal(message.type, signal)) return;
    if (target === sender.id || !peers.some(peer => peer.id === target)) return;
    this.sendTo(target, { type: message.type, from: sender.id, payload: { from: sender.id, [field]: signal } });
  }

  async webSocketClose(socket: WebSocket) { await this.leave(socket); }
  async webSocketError(socket: WebSocket) { await this.leave(socket); }
  async alarm() {
    if (this.peers().length) return;
    const expires = await this.state.storage.get<number>(this.expiryKey);
    if (expires !== undefined && expires !== 0 && expires <= Date.now()) await this.state.storage.deleteAll();
    else if (expires) await this.state.storage.setAlarm(expires);
  }

  private peers(): Peer[] {
    return this.state.getWebSockets().map(socket => this.peer(socket)).filter((peer): peer is Peer => peer !== null);
  }
  private peer(socket: WebSocket): Peer | null {
    const attachment = socket.deserializeAttachment() as Partial<Peer> | null;
    return attachment && typeof attachment.id === "string" && attachment.user &&
      attachment.user.id === attachment.id && typeof attachment.user.device_name === "string" &&
      typeof attachment.user.display_name === "string"
      ? attachment as Peer : null;
  }
  private broadcast(message: unknown, except?: WebSocket) {
    for (const socket of this.state.getWebSockets()) if (socket !== except && this.peer(socket)) {
      try { socket.send(JSON.stringify(message)); } catch {}
    }
  }
  private sendTo(id: string, message: unknown) {
    for (const socket of this.state.getWebSockets()) if (this.peer(socket)?.id === id) {
      try { socket.send(JSON.stringify(message)); } catch {}
    }
  }
  private async leave(socket: WebSocket) {
    const peer = this.peer(socket);
    if (!peer) return;
    socket.serializeAttachment(null);
    try { socket.close(); } catch {}
    this.broadcast({ type: "USER_LEFT", user: peer.user });
    if (!this.peers().length) {
      await this.scheduleExpiry(Date.now() + roomLifetimeMs);
    }
  }
  private async scheduleExpiry(expiresAt: number): Promise<void> {
    await this.state.storage.put(this.expiryKey, expiresAt);
    await this.state.storage.setAlarm(expiresAt);
  }
}
