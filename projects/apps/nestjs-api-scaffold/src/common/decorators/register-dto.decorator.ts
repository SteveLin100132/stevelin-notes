/**
 * DTO 自動掃描機制：
 *
 * 由於 `@nestjs/swagger` 無法在 runtime 解析 TypeScript 泛型，
 * 使用 `getSchemaPath()` 引用的 DTO 必須事先告知 Swagger 文件產生器。
 *
 * 此模組提供輕量的 class registry：
 * - `@RegisterDto()`：在 DTO class 上標記，即會自動加入 Swagger extraModels
 * - `getRegisteredDtos()`：在 `main.ts` 建立 Swagger 文件時取得所有已註冊的 DTO
 *
 * 使用優點：
 * - 只需在 DTO class 加一個 decorator，不需在每個 Controller 手動加 `@ApiExtraModels`
 * - 單一職責：DTO 自行宣告「我需要出現在 Swagger 文件」
 * - 新增 DTO 時只要加 `@RegisterDto()`，main.ts 不需任何修改
 */

/** DTO class 的型別（可被 new 實例化的抽象 class） */
type DtoClass = abstract new (...args: unknown[]) => unknown;

/** 全域 DTO registry（module-level singleton，應用程式生命週期內保持一份） */
const _registry = new Set<DtoClass>();

/**
 * Class decorator，將 DTO 自動加入 Swagger extraModels registry。
 *
 * 必須在 DTO class 上使用，且該模組需在應用程式啟動前被載入（NestJS 的 Module 依賴樹會自動觸發）。
 *
 * @example
 * ```typescript
 * @RegisterDto()
 * export class HealthStatusDto {
 *   @ApiProperty({ example: 'ok' })
 *   status!: 'ok' | 'error';
 * }
 * ```
 */
export function RegisterDto(): ClassDecorator {
  return (target: object): void => {
    _registry.add(target as DtoClass);
  };
}

/**
 * 取得所有透過 `@RegisterDto()` 註冊的 DTO class 列表。
 *
 * 在 `main.ts` 建立 Swagger 文件時傳入 `SwaggerModule.createDocument` 的 `extraModels`：
 *
 * @example
 * ```typescript
 * const document = SwaggerModule.createDocument(app, config, {
 *   extraModels: [ApiResponseDto, ...getRegisteredDtos()],
 * });
 * ```
 *
 * @returns 去重後的 DTO class 陣列
 */
export function getRegisteredDtos(): DtoClass[] {
  return Array.from(_registry);
}
