import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { TraceMiddleware } from "./common/trace/trace.middleware";
import { HelmetMiddleware } from "./common/middleware/helmet.middleware";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

/**
 * 應用程式根模組，負責組裝所有子模組與全域設定。
 *
 * 模組載入順序說明：
 * 1. `ConfigModule`（全域）：最先初始化，確保後續所有模組可讀取環境變數
 * 2. `ThrottlerModule`（非同步）：依賴 `ConfigService` 讀取 THROTTLE_TTL / THROTTLE_LIMIT，
 *    須放於 ConfigModule 之後以確保 ConfigService 可用於 useFactory 工廠函式
 * 3. `TypeOrmModule`（非同步）：依賴 `ConfigService`，使用工廠模式延遲初始化，
 *    以便在測試環境中注入不同的 DB 設定（`:memory:`）
 * 4. `HealthModule`：功能模組，依賴 TypeORM DataSource
 * 5. `MetricsModule`：提供 MetricsService 與 GET /metrics 端點
 *
 * **全域 Provider 策略（APP_GUARD / APP_FILTER / APP_INTERCEPTOR）**：
 * 使用 NestJS DI token 而非 `main.ts` 的 `new` 實例化，
 * 讓 `ThrottlerGuard`（APP_GUARD）、`AllExceptionsFilter`（APP_FILTER）與
 * `LoggingInterceptor`（APP_INTERCEPTOR）可透過 DI 注入所需依賴。
 * 採用此模式而非 `main.ts` 的 `useGlobalGuards()`，原因：ThrottlerGuard
 * 需要 DI 注入 `ThrottlerStorage` 與 `Reflector`，`new` 實例化無法滿足此需求。
 * `ResponseInterceptor` 同樣改由 DI 管理（注入 Reflector）。
 */
@Module({
  imports: [
    // isGlobal: true 讓所有子模組無需重複 import ConfigModule
    // ignoreEnvFile: 測試環境下跳過 .env 載入，避免測試受開發設定污染
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === "test",
    }),
    // ThrottlerModule 須在 ConfigModule 之後、TypeOrmModule 之前：
    // forRootAsync 的 useFactory 依賴 ConfigService 讀取 THROTTLE_TTL / THROTTLE_LIMIT，
    // 未設定環境變數時分別 fallback 至 60000ms（60 秒）與 100 次
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(
              configService.get<string>("THROTTLE_TTL") ?? "60000",
              10,
            ),
            limit: parseInt(
              configService.get<string>("THROTTLE_LIMIT") ?? "100",
              10,
            ),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "better-sqlite3" as const,
        // 測試環境使用記憶體 DB，確保測試間隔離且無檔案 I/O 開銷
        database:
          process.env.NODE_ENV === "test"
            ? ":memory:"
            : (configService.get<string>("DATABASE_PATH") ??
              "./data/todo.sqlite"),
        entities: [],
        // synchronize: true 讓 TypeORM 自動建立 schema，省去手動遷移的開發成本；
        // 正式環境發版前應改為 migration 管理（MVP 階段暫用 synchronize）
        synchronize: true,
        // dropSchema: 每次測試前清空 schema，確保測試資料不互相干擾
        dropSchema: process.env.NODE_ENV === "test",
      }),
    }),
    HealthModule,
    MetricsModule,
  ],
  providers: [
    // 全域 Rate Limit Guard：ThrottlerGuard 須透過 DI 管理（注入 ThrottlerStorage + Reflector），
    // 執行順序優先於 APP_FILTER / APP_INTERCEPTOR（Guard → Filter → Interceptor）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 全域例外過濾器：AllExceptionsFilter 透過 DI 注入 MetricsService（@Optional()）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // 全域攔截器（執行順序：LoggingInterceptor → ResponseInterceptor）
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * 掛載 HelmetMiddleware（HTTP 安全標頭，最優先）與 TraceMiddleware 至所有路由（`*`）。
   * 順序：Helmet 先於 Trace，確保安全標頭在 traceId context 建立之前即已套用（FR-003）。
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HelmetMiddleware, TraceMiddleware).forRoutes("*");
  }
}
