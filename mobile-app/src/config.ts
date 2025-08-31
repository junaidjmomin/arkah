import Constants from "expo-constants"
import { Platform } from "react-native"

function getDevDefault() {
  // Android emulator uses 10.0.2.2 to reach host machine; iOS simulator can use localhost
  return Platform.select({
    android: "http://10.0.2.2:3000",
    ios: "http://localhost:3000",
    default: "http://localhost:3000",
  })!
}

const extra = (Constants.expoConfig?.extra || {}) as { apiUrl?: string }
export const API_BASE_URL = extra.apiUrl?.replace(/\/+$/, "") || getDevDefault()
