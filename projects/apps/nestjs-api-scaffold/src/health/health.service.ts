import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { HealthStatusDto } from "./dto/health-status.dto";

/**
 * 提供應用程式健康狀態的業務邏輯。
 *
 * 採用 **deep check** 策略：不僅確認 DataSource 已初始化，
 * 更實際執行 `SELECT 1` 以驗證資料庫連線可用性。
 * 這樣設計的原因是 `isInitialized` 只代表 TypeORM 完成設定，
 * 不代表底層 SQLite 檔案可存取或記憶體 DB 尚未被銷毀。
 */
@Injectable()
export class HealthService {
  /**
   * @param dataSource TypeORM DataSource 實例，由 NestJS DI 容器注入。
   *   測試時可替換為 mock，以驗證各種 DB 狀態下的回應行為。
   */
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 執行深度健康檢查，包含 DB 連線驗證。
   *
   * 檢查流程：
   * 1. 先確認 `dataSource.isInitialized`（快速失敗，避免不必要的 query 開銷）
   * 2. 執行 `SELECT 1` 探測 DB 實際可用性
   * 3. 任何例外（網路錯誤、DB 檔案損毀等）皆視為 `error`，
   *    並統一回傳 `"db unreachable"` 以避免洩漏內部錯誤細節給外部呼叫方。
   *
   * @returns 健康狀態 DTO：DB 正常時為 `{ status: "ok" }`，
   *          異常時為 `{ status: "error", details: "db unreachable" }`
   */
  async checkHealth(): Promise<HealthStatusDto> {
    try {
      // 快速前置檢查：若 TypeORM 尚未完成初始化，跳過 query 直接回報失敗。
      // 常見於測試環境中 DataSource 被提前 destroy() 的情境。
      if (!this.dataSource.isInitialized) {
        return { status: "error", details: "db unreachable" };
      }

      // 執行最輕量的 SQL 探針；SELECT 1 不讀取任何資料表，
      // 但足以驗證連線池是否可正常取得連線並執行指令。
      await this.dataSource.query("SELECT 1");
      return { status: "ok" };
    } catch {
      // 捕捉所有例外並統一回傳通用錯誤訊息。
      // 不向外暴露原始錯誤（例：SQLITE_CANTOPEN），以防止資訊洩漏。
      return { status: "error", details: "db unreachable" };
    }
  }
}
