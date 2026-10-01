// MSW handlers 與 faker 資料產生器，給前端開發（後端未就緒時）與測試使用；
// 獨立成 entry，避免 msw / faker 被打包進正式環境。
export { getHealthMock } from "./generated/endpoints/health/health.msw";
export { getMetricsMock } from "./generated/endpoints/metrics/metrics.msw";
export { getPingMock } from "./generated/endpoints/ping/ping.msw";
