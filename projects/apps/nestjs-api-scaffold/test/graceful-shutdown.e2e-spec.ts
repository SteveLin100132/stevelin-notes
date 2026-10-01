import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as http from "node:http";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { createShutdownHandler } from "../src/shutdown";

describe("Graceful Shutdown (e2e)", () => {
  let app: INestApplication;
  let server: http.Server;
  let shutdownHandler: (signal: string) => Promise<void>;
  let stdoutSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useRealTimers();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    app.enableShutdownHooks();
    server = app.getHttpServer() as http.Server;
    shutdownHandler = createShutdownHandler(app, {
      server,
      timeoutMs: 500,
    });

    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(async () => {
    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
    jest.useRealTimers();

    if (app) {
      await app.close();
    }
  });

  function getJsonLogs(): Array<Record<string, unknown>> {
    return stdoutSpy.mock.calls
      .map((call) => String(call[0]).trim())
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it("T-E2E-001: in-flight request still completes after SIGTERM", async () => {
    const originalClose = app.close.bind(app);
    const closeSpy = jest.spyOn(app, "close").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await originalClose();
    });

    const inFlightShutdownHandler = createShutdownHandler(app, {
      server,
      timeoutMs: 1000,
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to resolve test server port");
    }

    const responsePromise = new Promise<{ statusCode?: number; body: string }>(
      (resolve, reject) => {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: address.port,
            path: "/health",
            method: "GET",
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => {
              body += chunk.toString();
            });
            res.on("end", () => resolve({ statusCode: res.statusCode, body }));
          },
        );
        req.on("error", reject);
        req.end();
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    await inFlightShutdownHandler("SIGTERM");

    const response = await responsePromise;
    expect(response.statusCode).toBe(200);
    expect(exitSpy).toHaveBeenCalledWith(0);

    closeSpy.mockRestore();
  });

  it("T-E2E-002: emits shutdown_complete log with timeout_triggered=false", async () => {
    await shutdownHandler("SIGTERM");

    const logs = getJsonLogs();
    const shutdownComplete = logs.find(
      (entry) => entry.event === "shutdown_complete",
    );

    expect(shutdownComplete).toBeDefined();
    expect(shutdownComplete).toMatchObject({
      event: "shutdown_complete",
      timeout_triggered: false,
      exit_code: 0,
    });
    expect(
      Number(shutdownComplete?.shutdown_duration_ms),
    ).toBeGreaterThanOrEqual(0);
  });

  it("T-E2E-003: emits shutdown_timeout log when close exceeds timeout", async () => {
    jest.useFakeTimers();

    const closeSpy = jest
      .spyOn(app, "close")
      .mockImplementation(() => new Promise<void>(() => undefined) as never);

    const timeoutHandler = createShutdownHandler(app, {
      server,
      timeoutMs: 100,
    });

    const promise = timeoutHandler("SIGTERM");
    await jest.advanceTimersByTimeAsync(150);
    await promise;

    const logs = getJsonLogs();
    const timeoutLog = logs.find((entry) => entry.event === "shutdown_timeout");

    expect(timeoutLog).toBeDefined();
    expect(timeoutLog).toMatchObject({
      event: "shutdown_timeout",
      timeout_triggered: true,
      exit_code: 1,
    });
    expect(exitSpy).toHaveBeenCalledWith(1);

    closeSpy.mockRestore();
  });

  it("T-E2E-004: enableShutdownHooks allows lifecycle cleanup to run", async () => {
    const dataSource = app.get(DataSource);
    const destroySpy = jest.spyOn(dataSource, "destroy");

    await shutdownHandler("SIGTERM");

    expect(destroySpy).toHaveBeenCalled();
    destroySpy.mockRestore();
  });

  it("T-E2E-005: second SIGINT forces immediate exit(1)", async () => {
    await shutdownHandler("SIGINT");
    await shutdownHandler("SIGINT");

    expect(exitSpy).toHaveBeenCalledWith(1);

    const logs = getJsonLogs();
    const forcedExit = logs.find((entry) => entry.event === "forced_exit");
    expect(forcedExit).toBeDefined();
  });
});
