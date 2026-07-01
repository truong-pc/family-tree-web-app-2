"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import { getClientId } from "@/lib/clientId"
import { toast } from "@/hooks/use-toast"

// Mô tả hành động vừa xảy ra để hiện trong toast.
function describeChange(event?: string): string {
  switch (event) {
    case "person.created":
      return "vừa thêm một thành viên mới"
    case "person.updated":
      return "vừa cập nhật thông tin thành viên"
    case "person.deleted":
      return "vừa xoá một thành viên"
    case "relationship.created":
      return "vừa thêm một quan hệ"
    case "relationship.deleted":
      return "vừa xoá một quan hệ"
    default:
      return "vừa cập nhật cây phả hệ"
  }
}

function showChangeToast(actorName: string | undefined, event: string | undefined) {
  const action = describeChange(event)
  toast(
    actorName
      ? { title: actorName, description: `${action.charAt(0).toUpperCase()}${action.slice(1)}.` }
      : { title: "Cây phả hệ đã cập nhật", description: "Có người vừa thay đổi cây." },
  )
}

// Tái dùng base URL của REST; đổi http(s) -> ws(s). Không cần env WS riêng.
// vd "http://localhost:8000" -> "ws://localhost:8000".
const WS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(
  /^http/,
  "ws",
)

const NO_RECONNECT_CODES = [4401, 4403, 4404]

/**
 * Mở WebSocket realtime cho một chart. Khi có owner/editor khác đổi cây,
 * server phát `tree.changed` → hook debounce rồi gọi lại `fetchData` của store.
 *
 * Chỉ chạy client-side và chỉ ở chế độ editor (truyền `enabled = !readOnly`).
 */
export function useTreeRealtime(chartId: string, enabled = true) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !chartId || !enabled) return

    const clientId = getClientId()
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let retry = 0
    let stopped = false
    // Gộp cụm event (vd add-child sinh person + quan hệ) thành 1 toast — giữ event
    // đầu tiên của cụm vì nó mô tả rõ nhất; xoá sau khi đã hiện.
    let pendingToast: { actorName?: string; event?: string } | null = null

    const refetchTree = () => {
      // Đọc token mới nhất trong store; đọc trực tiếp getState() để không phụ thuộc render.
      useFamilyTreeStore.getState().fetchData(chartId, false)
    }

    const flushRefetch = () => {
      refetchTree()
      if (pendingToast) {
        showChangeToast(pendingToast.actorName, pendingToast.event)
        pendingToast = null
      }
    }

    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flushRefetch, 300)
    }

    const connect = () => {
      if (stopped) return
      const token = useAuthStore.getState().token // token mới nhất (đã qua interceptor refresh)
      if (!token) return // chưa đăng nhập -> không nối

      const qs = new URLSearchParams({ token, clientId })
      ws = new WebSocket(`${WS_BASE}/api/v1/charts/${chartId}/ws?${qs}`)

      ws.onopen = () => {
        retry = 0
        refetchTree() // bù event bị lỡ khi mất kết nối
      }

      ws.onmessage = (ev) => {
        let msg: any
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg?.type === "tree.changed") {
          if (msg.originId && msg.originId === clientId) return // bỏ echo của chính mình
          if (!pendingToast) pendingToast = { actorName: msg.actorName, event: msg.event }
          scheduleRefetch()
        }
        // Bỏ qua an toàn mọi type khác (connected, pong, tương lai presence...).
      }

      ws.onclose = (ev) => {
        ws = null
        if (stopped) return
        if (NO_RECONNECT_CODES.includes(ev.code)) return // lỗi quyền/không tồn tại -> không lặp
        const delay = Math.min(1000 * 2 ** retry, 30000) + Math.random() * 1000
        retry++
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => ws?.close()
    }

    connect()

    return () => {
      stopped = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [chartId, enabled])
}
