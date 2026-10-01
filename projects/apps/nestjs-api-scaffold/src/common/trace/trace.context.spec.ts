import { TraceContext } from "./trace.context";

describe("TraceContext", () => {
  describe("run() / get()", () => {
    it("run() 內部呼叫 get() 應回傳傳入的 traceId（情境 1）", (done) => {
      const traceId = "550e8400-e29b-41d4-a716-446655440000";

      TraceContext.run(traceId, () => {
        expect(TraceContext.get()).toBe(traceId);
        done();
      });
    });

    it("run() callback 之外呼叫 get() 應回傳 undefined（情境 2）", () => {
      // 在任何 run() 之外直接呼叫 get()，ALS 沒有 store
      const result = TraceContext.get();
      expect(result).toBeUndefined();
    });

    it("巢狀 run() 時內層覆蓋外層，外層離開後恢復（情境 3）", (done) => {
      const outerTraceId = "outer-uuid-1111-1111-1111-111111111111";
      const innerTraceId = "inner-uuid-2222-2222-2222-222222222222";

      TraceContext.run(outerTraceId, () => {
        expect(TraceContext.get()).toBe(outerTraceId);

        TraceContext.run(innerTraceId, () => {
          expect(TraceContext.get()).toBe(innerTraceId);
        });

        // 內層 run() 結束後，外層仍應保持 outerTraceId
        expect(TraceContext.get()).toBe(outerTraceId);
        done();
      });
    });
  });
});
