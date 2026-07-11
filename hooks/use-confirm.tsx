"use client"

import { useState, useCallback, useRef } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

/**
 * Hook cung cấp hàm `confirm()` bất đồng bộ thay thế `window.confirm()`.
 *
 * Sử dụng:
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm()
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ description: "Bạn có chắc?" })
 *   if (!ok) return
 *   // thực hiện xóa...
 * }
 *
 * return <>{...}<ConfirmDialog /></>
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
  }>({
    open: false,
    options: { description: "" },
  })

  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const handleAction = useCallback((result: boolean) => {
    setState((prev) => ({ ...prev, open: false }))
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  const { open, options } = state

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleAction(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title ?? "Xác nhận"}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleAction(false)}>
            {options.cancelLabel ?? "Hủy"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleAction(true)}
            className={cn(
              options.variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {options.confirmLabel ?? "Xác nhận"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, ConfirmDialog }
}
