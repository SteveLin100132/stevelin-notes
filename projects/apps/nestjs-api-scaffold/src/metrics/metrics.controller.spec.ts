import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

describe("MetricsController", () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
    controller = new MetricsController(service);
  });

  afterEach(() => {
    service.getRegistry().clear();
  });

  describe("getMetrics()", () => {
    it("應回傳 Prometheus 文字格式字串（情境 1）", async () => {
      const result = await controller.getMetrics();
      expect(typeof result).toBe("string");
    });

    it("應回傳包含 http_requests_total 的 metrics 字串（情境 2）", async () => {
      // 先記錄一筆請求，確保 counter 出現在輸出中
      service.recordRequest("GET", "/health", 200, 5);
      const result = await controller.getMetrics();
      expect(result).toContain("http_requests_total");
    });

    it("應回傳包含 http_request_duration_seconds 的 metrics 字串（情境 3）", async () => {
      service.recordRequest("GET", "/health", 200, 12);
      const result = await controller.getMetrics();
      expect(result).toContain("http_request_duration_seconds");
    });
  });
});
