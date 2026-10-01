import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  let mockHealthService: Partial<HealthService>;

  beforeEach(async () => {
    mockHealthService = {
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe("getHealth()", () => {
    it("should return HealthStatusDto when DB is healthy", async () => {
      (mockHealthService.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: "ok",
      });

      const result = await controller.getHealth();

      expect(result).toEqual({ status: "ok" });
    });

    it("should throw ServiceUnavailableException when DB is unhealthy", async () => {
      (mockHealthService.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: "error",
        details: "db unreachable",
      });

      await expect(controller.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("should throw ServiceUnavailableException with message 'db unreachable'", async () => {
      (mockHealthService.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: "error",
        details: "db unreachable",
      });

      await expect(controller.getHealth()).rejects.toThrow("db unreachable");
    });
  });
});
