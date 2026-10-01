/**
 * Orval 產生的每個請求都經過這個 mutator，集中處理 base URL、body 解析與錯誤。
 *
 * - base URL 由使用端在 app 啟動時以 `configureApiClient()` 設定（預設同源）
 * - 依 `Content-Type` 解析 body：JSON 走 `json()`，其餘（如 `/metrics` 的 text/plain）走 `text()`
 * - 非 2xx 一律拋出 `ApiError`，讓 TanStack Query 進入 error 狀態；
 *   後端錯誤回應同樣是 `ApiResponseDto` 包裝，放在 `ApiError.body`
 */

/** 非 2xx 回應時拋出的錯誤，保留狀態碼、標頭與後端回傳的 body */
export class ApiError<TBody = unknown> extends Error {
  constructor(
    readonly status: number,
    readonly body: TBody,
    readonly headers: Headers,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

interface ApiClientConfig {
  /** API 根網址，例如 `http://localhost:3000`；空字串代表與前端同源 */
  baseUrl: string;
  /** 每個請求都會帶上的標頭，例如 `Authorization` */
  headers?: () => HeadersInit | undefined;
}

const config: ApiClientConfig = { baseUrl: "" };

/**
 * 設定 API client，於前端 app 進入點呼叫一次。
 *
 * @example
 * configureApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });
 */
export function configureApiClient(next: Partial<ApiClientConfig>): void {
  Object.assign(config, next);
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
}

export async function customFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(config.headers?.());
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));

  const response = await fetch(`${config.baseUrl}${url}`, {
    ...options,
    headers,
  });
  const body = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, body, response.headers);
  }
  return body as T;
}

/** 讓產生的 hook 把錯誤型別標成 `ApiError`（Orval 會讀取這個 export） */
export type ErrorType<TError> = ApiError<TError>;
