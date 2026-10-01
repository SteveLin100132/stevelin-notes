import type { INestApplication } from "@nestjs/common";
import type * as http from "node:http";
import { createShutdownHandler } from "./shutdown";

describe("createShutdownHandler", () => {
  let exitSpy: jest.SpyInstance;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();

    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
    jest.useRealTimers();
  });

  function getLogs(): Array<Record<string, unknown>> {
    return stdoutSpy.mock.calls.map((call) => {
      const line = String(call[0]).trim();
      return JSON.parse(line) as Record<string, unknown>;
    });
  }

  function createServerMock(connections = 3): http.Server {
    return {
      getConnections: jest.fn(
        (cb: (err: Error | null, count: number) => void) =>
          cb(null, connections),
      ),
    } as unknown as http.Server;
  }

  it("scenario 1: logs shutdown_complete and exits(0) on normal shutdown", async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;
    const server = createServerMock(3);
    const handler = createShutdownHandler(app, { server, timeoutMs: 1000 });

    await handler("SIGTERM");

    const logs = getLogs();
    expect(logs[0]).toMatchObject({
      event: "shutdown_start",
      shutdown_signal: "SIGTERM",
      active_connections_count: 3,
      timeout_ms: 1000,
    });
    expect(logs[1]).toMatchObject({
      event: "shutdown_complete",
      timeout_triggered: false,
      exit_code: 0,
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("scenario 2: logs shutdown_timeout and exits(1) when app.close times out", async () => {
    jest.useFakeTimers();

    const app = {
      close: jest.fn(() => new Promise<void>(() => undefined)),
    } as unknown as INestApplication;
    const server = createServerMock(2);
    const handler = createShutdownHandler(app, { server, timeoutMs: 300 });

    const promise = handler("SIGTERM");
    await jest.advanceTimersByTimeAsync(350);

    await promise;

    const logs = getLogs();
    expect(logs[1]).toMatchObject({
      event: "shutdown_timeout",
      timeout_triggered: true,
      exit_code: 1,
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("scenario 3: exits(1) immediately on second signal", async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;
    const server = createServerMock(1);
    const handler = createShutdownHandler(app, { server, timeoutMs: 5000 });

    const first = handler("SIGINT");
    await first;

    await handler("SIGINT");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("scenario 4: logs error and exits(1) when app.close throws", async () => {
    const app = {
      close: jest.fn().mockRejectedValue(new Error("close failed")),
    } as unknown as INestApplication;
    const server = createServerMock(3);
    const handler = createShutdownHandler(app, { server, timeoutMs: 1000 });

    await handler("SIGTERM");

    const logs = getLogs();
    expect(logs[1]).toMatchObject({
      event: "shutdown_timeout",
      timeout_triggered: true,
      exit_code: 1,
      error: "close failed",
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("scenario 5: includes active_connections_count in shutdown_start log", async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;
    const server = createServerMock(3);
    const handler = createShutdownHandler(app, { server, timeoutMs: 1000 });

    await handler("SIGTERM");

    const logs = getLogs();
    expect(logs[0]).toMatchObject({
      event: "shutdown_start",
      active_connections_count: 3,
    });
  });

  it("scenario 6: propagates timeoutMs to shutdown_start timeout_ms", async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;
    const server = createServerMock(1);
    const handler = createShutdownHandler(app, { server, timeoutMs: 4321 });

    await handler("SIGTERM");

    const logs = getLogs();
    expect(logs[0]).toMatchObject({
      event: "shutdown_start",
      timeout_ms: 4321,
    });
  });
});
