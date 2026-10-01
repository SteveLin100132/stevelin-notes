import type { INestApplication } from "@nestjs/common";
import type * as http from "node:http";

/** Graceful shutdown 所需依賴。 */
export interface ShutdownOptions {
  /** HTTP server 實例，用於讀取目前連線數。 */
  server: http.Server;
  /** Shutdown 最大等待時間（毫秒）。 */
  timeoutMs: number;
}

const TIMEOUT_SENTINEL = Symbol("shutdown-timeout");

/**
 * 取得目前 HTTP 連線數。
 *
 * @param server Node.js HTTP server
 * @returns 目前連線數
 */
async function getConnectionCount(server: http.Server): Promise<number> {
  return await new Promise<number>((resolve) => {
    server.getConnections((error, count) => {
      if (error) {
        resolve(0);
        return;
      }
      resolve(count);
    });
  });
}

/**
 * 建立可綁定到 OS signal 的 graceful shutdown handler。
 *
 * @param app NestJS 應用實例
 * @param options server 與 timeout 設定
 * @returns 可供 `process.on("SIGTERM"|"SIGINT")` 呼叫的 async handler
 * @throws 透過 `process.exit` 終止程序（在測試中通常會被 mock 成拋錯）
 */
export function createShutdownHandler(
  app: INestApplication,
  options: ShutdownOptions,
): (signal: string) => Promise<void> {
  let isShuttingDown = false;

  return async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      process.stdout.write(
        JSON.stringify({
          event: "forced_exit",
          shutdown_signal: signal,
          exit_code: 1,
          timestamp: new Date().toISOString(),
        }) + "\n",
      );
      process.exit(1);
    }

    isShuttingDown = true;
    const start = Date.now();
    const activeConnections = await getConnectionCount(options.server);

    process.stdout.write(
      JSON.stringify({
        event: "shutdown_start",
        shutdown_signal: signal,
        active_connections_count: activeConnections,
        timeout_ms: options.timeoutMs,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );

    let timer: NodeJS.Timeout | undefined;
    let timedOut = false;
    let errorMessage: string | undefined;

    try {
      const result = await Promise.race([
        app.close().then(() => "closed" as const),
        new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
          timer = setTimeout(
            () => resolve(TIMEOUT_SENTINEL),
            options.timeoutMs,
          );
        }),
      ]);
      timedOut = result === TIMEOUT_SENTINEL;
    } catch (error) {
      timedOut = true;
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    const durationMs = Date.now() - start;
    if (timedOut) {
      process.stdout.write(
        JSON.stringify({
          event: "shutdown_timeout",
          shutdown_duration_ms: durationMs,
          timeout_triggered: true,
          exit_code: 1,
          ...(errorMessage ? { error: errorMessage } : {}),
          timestamp: new Date().toISOString(),
        }) + "\n",
      );
      process.exit(1);
    }

    process.stdout.write(
      JSON.stringify({
        event: "shutdown_complete",
        shutdown_duration_ms: durationMs,
        timeout_triggered: false,
        exit_code: 0,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    process.exit(0);
  };
}
