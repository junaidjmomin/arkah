import AsyncStorage from "@react-native-async-storage/async-storage"
import { submitReport, type ReportPayload } from "@src/lib/api"

const STORAGE_KEY = "offline:reports:v1"

export type QueuedReport = ReportPayload & {
  id: string
  queuedAt: number
  attemptCount?: number
  nextAttemptAt?: number
}

const BASE_BACKOFF_MS = 5_000
const MAX_BACKOFF_MS = 10 * 60_000 // 10 minutes

function computeNextDelay(attempt: number) {
  const delay = BASE_BACKOFF_MS * Math.pow(2, attempt)
  return Math.min(delay, MAX_BACKOFF_MS)
}

async function readAll(): Promise<QueuedReport[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeAll(items: QueuedReport[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export async function enqueue(payload: ReportPayload) {
  const item: QueuedReport = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
    attemptCount: 0,
    nextAttemptAt: Date.now(),
  }
  const items = await readAll()
  items.push(item)
  await writeAll(items)
  return item.id
}

export async function count(): Promise<number> {
  const items = await readAll()
  return items.length
}

export async function list(): Promise<QueuedReport[]> {
  return readAll()
}

export async function clearByIds(ids: string[]) {
  const items = await readAll()
  const remaining = items.filter((i) => !ids.includes(i.id))
  await writeAll(remaining)
}

export async function processAll(): Promise<{ sent: number; failed: number }> {
  const now = Date.now()
  const items = await readAll()
  if (!items.length) return { sent: 0, failed: 0 }

  const toRemove: string[] = []
  let sent = 0
  const updated: QueuedReport[] = []

  for (const item of items) {
    const due = (item.nextAttemptAt ?? 0) <= now
    if (!due) {
      updated.push(item)
      continue
    }

    const res = await submitReport(item, { idempotencyKey: item.id })
    if (res.ok) {
      sent += 1
      toRemove.push(item.id)
    } else {
      const attempt = (item.attemptCount ?? 0) + 1
      const nextDelay = computeNextDelay(attempt)
      updated.push({
        ...item,
        attemptCount: attempt,
        nextAttemptAt: Date.now() + nextDelay,
      })
    }
  }

  if (toRemove.length) {
    const remaining = updated.filter((i) => !toRemove.includes(i.id))
    await writeAll(remaining)
  } else {
    await writeAll(updated)
  }

  return { sent, failed: items.length - sent }
}
