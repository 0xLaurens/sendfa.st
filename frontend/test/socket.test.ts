import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/webrtc.ts", () => ({
  closeAllWebRtcConnections: vi.fn(),
  closeWebRtcConnection: vi.fn(),
  createRtcOffer: vi.fn(),
  handleIceCandidate: vi.fn(),
  handleRtcAnswer: vi.fn(),
  handleRtcOffer: vi.fn(),
}));

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
afterEach(() => vi.unstubAllGlobals());

describe("WebsocketManager public connection boundary", () => {
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
});
