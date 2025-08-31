export type BBox = [number, number, number, number] // [left, bottom, right, top]

export type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export function bboxFromRegion(r: Region): BBox {
  const left = r.longitude - r.longitudeDelta / 2
  const right = r.longitude + r.longitudeDelta / 2
  const top = r.latitude + r.latitudeDelta / 2
  const bottom = r.latitude - r.latitudeDelta / 2
  return [left, bottom, right, top]
}
