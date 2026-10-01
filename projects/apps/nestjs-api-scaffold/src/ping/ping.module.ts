import { Module } from "@nestjs/common";
import { PingController } from "./ping.controller";

/**
 * 連通性測試模組，提供受 Rate Limit 限制的 `GET /ping` 端點。
 */
@Module({
  controllers: [PingController],
})
export class PingModule {}
