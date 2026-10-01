import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  afterEach(() => {
    // 每次測試後清除 prom-client Registry，避免「重複註冊」錯誤
    service.getRegistry().clear();
  });

  describe("getRegistry()", () => {
    it("應回傳 prom-client Registry 實例（情境 1）", () => {
      const registry = service.getRegistry();
      // Registry 有 metrics() 方法（回傳 Promise<string>）
      expect(typeof registry.metrics).toBe("function");
    });
  });

  describe("getMetrics()", () => {
    it("應回傳 Prometheus 文字格式字串（情境 2）", async () => {
      const result = await service.getMetrics();
      expect(typeof result).toBe("string");
    });
  });

  describe("recordRequest()", () => {
    it("應能無錯誤地記錄一筆請求（情境 3）", async () => {
      // 呼叫後可正常取得 metrics 文字（不拋出例外）
      expect(() =>
        service.recordRequest("GET", "/health", 200, 42),
      ).not.toThrow();
      const metrics = await service.getMetrics();
      // http_requests_total counter 應出現在 metrics 輸出中
      expect(metrics).toContain("http_requests_total");
    });

    it("recordRequest() 累加計數正確（情境 4）", async () => {
      service.recordRequest("GET", "/health", 200, 10);
      service.recordRequest("GET", "/health", 200, 20);
      const metrics = await service.getMetrics();
      // counter 值應為 2（兩次呼叫）
      expect(metrics).toMatch(/http_requests_total{[^}]*} 2/);
    });
  });

  describe("recordError()", () => {
    it("應能無錯誤地記錄一筆錯誤（情境 5）", async () => {
      expect(() => service.recordError("GET", "/health", 500)).not.toThrow();
      const metrics = await service.getMetrics();
      expect(metrics).toContain("http_errors_total");
    });
  });

  describe("observeDuration()", () => {
    it("應能無錯誤地觀測一筆耗時（情境 6）", async () => {
      expect(() =>
        service.observeDuration("GET", "/health", 200, 0.042),
      ).not.toThrow();
      const metrics = await service.getMetrics();
      expect(metrics).toContain("http_request_duration_seconds");
    });
  });
});
