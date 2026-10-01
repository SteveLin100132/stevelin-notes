import { Test, TestingModule } from "@nestjs/testing";
import { PingController } from "./ping.controller";

describe("PingController", () => {
  let controller: PingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    controller = module.get<PingController>(PingController);
  });

  describe("getPing()", () => {
    it("should return { pong: true }", () => {
      expect(controller.getPing()).toEqual({ pong: true });
    });
  });
});
