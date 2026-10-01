import { Test, TestingModule } from "@nestjs/testing";
import { getDataSourceToken } from "@nestjs/typeorm";
import { HealthService } from "./health.service";
import { DataSource } from "typeorm";

describe("HealthService", () => {
  let service: HealthService;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe("checkHealth()", () => {
    it('should return { status: "ok" } when DB is connected', async () => {
      const result = await service.checkHealth();
      expect(result).toEqual({ status: "ok" });
    });

    it('should return { status: "error", details: "db unreachable" } when DB query throws', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValueOnce(
        new Error("connection lost"),
      );

      const result = await service.checkHealth();
      expect(result).toEqual({ status: "error", details: "db unreachable" });
    });

    it('should return { status: "error", details: "db unreachable" } when DataSource is not initialized', async () => {
      Object.defineProperty(mockDataSource, "isInitialized", { value: false });

      const result = await service.checkHealth();
      expect(result).toEqual({ status: "error", details: "db unreachable" });
    });
  });
});
