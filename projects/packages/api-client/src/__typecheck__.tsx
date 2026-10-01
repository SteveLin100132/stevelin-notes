// 僅供 `npm run typecheck` 驗證產出的 hook 在 React 端的使用型別，不會被匯出
import { useGetPing, ApiError } from "./index";

export function PingStatus() {
  const { data, error, isPending } = useGetPing();
  if (isPending) return <span>檢查中</span>;
  if (error) return <span>{error instanceof ApiError ? error.status : "錯誤"}</span>;
  const pong: boolean | undefined = data.data?.pong;
  return <span>{pong ? "可連線" : "無回應"}（{data.traceId}）</span>;
}
