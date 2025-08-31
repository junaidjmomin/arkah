"use client"

import "react-native-gesture-handler"
import { StatusBar } from "expo-status-bar"
import { I18nextProvider } from "react-i18next"
import i18n from "./src/i18n"
import RootNavigation from "./src/navigation"
import { useEffect } from "react"
import { startSyncLoop, stopSyncLoop } from "@src/lib/sync"

export default function App() {
  useEffect(() => {
    startSyncLoop(30000) // 30s interval while app is foregrounded
    return () => {
      stopSyncLoop()
    }
  }, [])

  return (
    <I18nextProvider i18n={i18n}>
      <RootNavigation />
      <StatusBar style="auto" />
    </I18nextProvider>
  )
}
