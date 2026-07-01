// uuid ổn định cho mỗi tab — dùng chung cho WS query param và header X-Client-Id
// trên mọi mutation, để backend echo vào `originId` và FE bỏ được "echo" của chính mình.
let _clientId: string | null = null

export function getClientId(): string {
  if (!_clientId) {
    _clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
  return _clientId
}
