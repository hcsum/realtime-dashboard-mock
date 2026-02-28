export type StreamItem = {
  id: number
  title: string
  note: string
  value: number
  updatedAt: string
  color: string
  payload: Record<string, unknown>
}

export type StreamUpdate = {
  id: number
  value: number
  updatedAt: string
  color: string
}

export type StreamBatch = {
  id: number
  inserts: StreamItem[]
  updates: StreamUpdate[]
}

export const makeSimplePayload = (id: number, title: string, value: number) => ({
  id,
  title,
  value,
  label: `Item ${id}`,
  status: value % 2 === 0 ? 'even' : 'odd',
})
