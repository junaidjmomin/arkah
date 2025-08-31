import * as Network from "expo-network"
import { AppState, type AppStateStatus } from "react-native"
import { processAll } from "@src/lib/offlineQueue"

let interval: ReturnType<typeof setInterval> | null = null
let appStateSub: { remove: () => void } | null = null

export async function triggerSyncNow() {
  const state = await Network.getNetworkStateAsync()
  if (!state.isConnected || !state.isInternetReachable) return { sent: 0, failed: 0 }
  return processAll()
}

export function startSyncLoop(intervalMs = 30_000) {
  // Avoid multiple loops
  if (interval) return
  interval = setInterval(() => {
    triggerSyncNow().catch(() => {})
  }, intervalMs)

  appStateSub = AppState.addEventListener("change", (status: AppStateStatus) => {
    if (status === "active") {
      if (!interval) {
        interval = setInterval(() => {
          triggerSyncNow().catch(() => {})
        }, intervalMs)
      }
    } else if (status === "background" || status === "inactive") {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  })
}

export function stopSyncLoop() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  appStateSub?.remove?.()
  appStateSub = null
}
