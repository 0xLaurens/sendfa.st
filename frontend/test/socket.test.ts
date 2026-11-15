import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/webrtc.ts", () => ({
  closeAllWebRtcConnections: vi.fn(),
  closeWebRtcConnection: vi.fn(),
  createRtcOffer: vi.fn(),
  handleIceCandidate: vi.fn(),
  handleRtcAnswer: vi.fn(),
  handleRtcOffer: vi.fn(),
}));
vi.mock("../src/lib/file.ts", () => ({ interruptTransfers: vi.fn() }));

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  readyState = FakeWebSocket.CONNECTING;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  close = vi.fn(() => { this.readyState = 3; });
  send = vi.fn();
  constructor(url: string) { this.url = url; FakeWebSocket.instances.push(this); }
  static instances: FakeWebSocket[] = [];
}

const createdId = "123e4567-e89b-42d3-a456-426614174000";
let socketApi: typeof import("../src/lib/socket.ts");
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => ({ id: createdId }),
    url,
  }));
  vi.stubGlobal("fetch", fetchMock);
  socketApi = await import("../src/lib/socket.ts");
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("WebsocketManager public connection boundary", () => {
  it("does not mistake a transient room status failure for an expired room", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    expect(socketApi.connectionError.get()).toBeUndefined();
    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.close();
  });

  it("stops and explains an explicit terminal rejection", async () => {
    vi.useFakeTimers();
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    const socket = FakeWebSocket.instances[0];
    await socket.onmessage?.({ data: JSON.stringify({ type: "ROOM_REJECTED" }) });
    socket.onclose?.();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketApi.connectionError.get()).toMatch(/reject/i);
    manager.close();
    vi.useRealTimers();
  });

  it("interrupts transfers and replaces the roster when the same room reconnects", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    const first = FakeWebSocket.instances[0];
    await first.onmessage?.({ data: JSON.stringify({ type: "ROOM_JOINED", room: { id: createdId }, users: [{ id: "old" }] }) });
    first.onclose?.();
    expect(socketApi.users.get()).toEqual([]);
    expect(socketApi.connectionNotice.get()).toMatch(/restart/i);
    await vi.advanceTimersByTimeAsync(500);
    const second = FakeWebSocket.instances[1];
    expect(new URL(second.url).searchParams.get("roomId")).toBe(createdId);
    await second.onmessage?.({ data: JSON.stringify({ type: "ROOM_JOINED", room: { id: createdId }, users: [{ id: "new" }] }) });
    first.onclose?.();
    first.onopen?.();
    await first.onmessage?.({ data: JSON.stringify({ type: "USER_JOINED", user: { id: "stale" } }) });
    expect(socketApi.users.get()).toEqual([{ id: "new" }]);
    expect(socketApi.roomAdmitted.get()).toBe(true);
    const { interruptTransfers } = await import("../src/lib/file.ts");
    expect(interruptTransfers).toHaveBeenCalledOnce();
    manager.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries opaque failures with capped exponential jitter and cancels on close", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    for (const delay of [999, 1999, 3998, 7996, 15992, 29985, 29985]) {
      const socket = FakeWebSocket.instances.at(-1)!;
      socket.onerror?.();
      socket.onclose?.();
      const count = FakeWebSocket.instances.length;
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances).toHaveLength(count + 1);
    }
    FakeWebSocket.instances.at(-1)!.onclose?.();
    manager.close();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(8);
  });

  it("stops on authoritative expiration following an opaque upgrade failure", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ exists: false }) });
    FakeWebSocket.instances[0].onclose?.();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketApi.connectionError.get()).toMatch(/expired/i);
    manager.close();
  });

  it("does not treat an unrelated 404 response as authoritative expiry", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: "not_found" }) });
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    expect(socketApi.connectionError.get()).toBeUndefined();
    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.close();
  });

  it("continues after a network error checking room status", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    expect(socketApi.connectionError.get()).toBeUndefined();
    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.close();
  });

  it("does not reconnect when closed during a status check", async () => {
    let resolveStatus!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveStatus = resolve; }));
    socketApi.roomId.set(createdId);
    const manager = new socketApi.default("ws://localhost:8787/api/websocket");
    const connecting = manager.connect();
    manager.close();
    resolveStatus({ ok: true, status: 200 });
    await connecting;
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("creates before websocket connection and gates admission on ROOM_JOINED, not open", async () => {
    const manager = new socketApi.default("ws://localhost:8787/api/websocket", true);
    const admissionStates: boolean[] = [];
    const unlisten = socketApi.roomAdmitted.listen(value => admissionStates.push(value));
    await manager.connect();

    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      "http://localhost:8787/api/rooms",
      `http://localhost:8787/api/rooms/${createdId}`,
    ]);
    const socket = FakeWebSocket.instances[0];
    expect(new URL(socket.url).searchParams.get("roomId")).toBe(createdId);
    expect(admissionStates).not.toContain(true);
    socket.onopen?.();
    expect(admissionStates).not.toContain(true);
    await socket.onmessage?.({ data: JSON.stringify({ type: "IDENTITY", user: { id: "peer" } }) });
    await socket.onmessage?.({ data: JSON.stringify({ type: "ROOM_JOINED", room: { id: createdId }, users: [] }) });
    expect(admissionStates.at(-1)).toBe(true);
    expect(socketApi.admittedRoomLink("http:", "sendfa.st")).toBe(`http://sendfa.st/r/${createdId}`);
    // A later upload on the already-admitted socket can restore the usable link
    // synchronously instead of waiting for connect(), which correctly no-ops.
    await manager.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketApi.admittedRoomLink("https:", "sendfa.st")).toBe(`https://sendfa.st/r/${createdId}`);
    unlisten();
    manager.close();
  });

  it("does not resurrect a connection when close races room creation", async () => {
    let resolveCreate!: (response: { ok: boolean; json: () => Promise<{ id: string }> }) => void;
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveCreate = resolve; }));
    const manager = new socketApi.default("ws://localhost:8787/api/websocket", true);
    const connecting = manager.connect();
    manager.close();
    resolveCreate({ ok: true, json: async () => ({ id: createdId }) });
    await connecting;
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(socketApi.roomId.get()).toBeUndefined();
  });

  it("discards a received offer after signaling loss so it cannot resume", async () => {
    vi.doUnmock("../src/lib/file.ts");
    vi.doMock("streamsaver", () => ({ default: {} }));
    vi.resetModules();
    const api = await import("../src/lib/socket.ts");
    const files = await import("../src/lib/file.ts");
    api.roomId.set(createdId);
    const manager = new api.default("ws://localhost:8787/api/websocket");
    await manager.connect();
    const socket = FakeWebSocket.instances.at(-1)!;
    await socket.onmessage?.({ data: JSON.stringify({ type: "ROOM_JOINED", room: { id: createdId }, users: [] }) });
    files.addIncomingFileOffer({ id: "offer", from: "peer", files: [], currentFile: 0 } as any);
    expect(files.currentFileOffer.get()).not.toBeNull();
    socket.onclose?.();
    expect(files.currentFileOffer.get()).toBeNull();
    expect(api.connectionNotice.get()).toMatch(/restart/i);
    manager.close();
    vi.doMock("../src/lib/file.ts", () => ({ interruptTransfers: vi.fn() }));
  });
});
