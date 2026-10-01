/**
 * 應用程式設定介面，定義所有可設定的執行環境參數。
 *
 * 所有欄位皆從環境變數讀取，並在 `appConfigFactory` 中提供預設值，
 * 確保開發環境無需額外設定即可啟動。
 */
export interface AppConfig {
  /** HTTP 監聽埠號，對應環境變數 `PORT`，預設 `3000` */
  port: number;
  /** SQLite 資料庫檔案路徑，對應環境變數 `DATABASE_PATH`，預設 `./data/todo.sqlite` */
  databasePath: string;
  /** 執行環境名稱，對應環境變數 `NODE_ENV`，預設 `development` */
  nodeEnv: string;
}

/**
 * NestJS `ConfigModule` 的設定工廠函式。
 *
 * 使用工廠模式（而非直接讀取 `process.env`），使設定可在單元測試中被 mock，
 * 符合憲章原則 IV（模組獨立）。
 *
 * @returns 從環境變數解析後的 `AppConfig` 物件，未設定的欄位使用預設值
 */
export const appConfigFactory = (): AppConfig => ({
  // parseInt 確保型別為 number；`?? "3000"` 防止 PORT 未定義時傳入 NaN
  port: parseInt(process.env.PORT ?? "3000", 10),
  databasePath: process.env.DATABASE_PATH ?? "./data/todo.sqlite",
  nodeEnv: process.env.NODE_ENV ?? "development",
});
