import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import FPSStats from 'react-fps-stats'
import './App.css'

type StreamItem = {
  id: number
  title: string
  note: string
  value: number
  updatedAt: string
  color: string
  payload: Record<string, unknown>
}

type FilterItemsProps = {
  value: string
  onChange: (value: string) => void
}

type StreamUpdate = {
  id: number
  value: number
  updatedAt: string
  color: string
}

type StreamBatch = {
  id: number
  inserts: StreamItem[]
  updates: StreamUpdate[]
}

type StreamViewProps = {
  incomingRate: number
}

type StreamViewHandle = {
  applyBatch: (batch: StreamBatch) => void
  reset: () => void
}

const TICK_MIN = 1
const TICK_MAX = 1000

const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

const makeColor = () => {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 65 + Math.floor(Math.random() * 20)
  const lightness = 75 + Math.floor(Math.random() * 12)
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

const makeSimplePayload = (id: number, title: string, value: number) => ({
  id,
  title,
  value,
  label: `Item ${id}`,
  status: value % 2 === 0 ? 'even' : 'odd',
})

const makeTitle = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const left = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
    '',
  )
  const right = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join(
    '',
  )
  return `${left}-${right}`
}

const buildItem = (id: number): StreamItem => {
  const value = Math.floor(Math.random() * 100000)
  const updatedAt = new Date().toLocaleTimeString()
  const color = makeColor()
  const title = makeTitle()
  const payload = makeSimplePayload(id, title, value)

  return { id, title, note: '', value, updatedAt, color, payload }
}

const makeUpdate = (id: number): StreamUpdate => {
  const value = Math.floor(Math.random() * 100000)
  const updatedAt = new Date().toLocaleTimeString()
  const color = makeColor()

  return { id, value, updatedAt, color }
}

const FilterItems = ({ value, onChange }: FilterItemsProps) => (
  <div className="list-filter">
    <label className="control-label" htmlFor="probeInput">
      Filter Items
    </label>
    <input
      id="probeInput"
      type="text"
      value={value}
      placeholder="Filter by item title (e.g. ABZ-1209)"
      onChange={(event) => onChange(event.target.value)}
    />
    <p className="hint">Filters update as the stream runs. Expect lag under load.</p>
  </div>
)

const StreamView = forwardRef<StreamViewHandle, StreamViewProps>(({ incomingRate }, ref) => {
  const [items, setItems] = useState<StreamItem[]>([])
  const [inputProbe, setInputProbe] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  const applyBatch = (batch: StreamBatch) => {
    setItems((prev) => {
      let next = prev
      if (batch.inserts.length > 0) {
        next = [...next, ...batch.inserts]
      }
      if (batch.updates.length > 0) {
        const indexMap = new Map<number, number>()
        for (let i = 0; i < next.length; i += 1) {
          indexMap.set(next[i].id, i)
        }
        const updated = [...next]
        for (const update of batch.updates) {
          const index = indexMap.get(update.id)
          if (index === undefined) continue
          const existing = updated[index]
          updated[index] = {
            ...existing,
            value: update.value,
            updatedAt: update.updatedAt,
            color: update.color,
            payload: makeSimplePayload(existing.id, existing.title, update.value),
          }
        }
        next = updated
      }
      return next
    })
  }

  const reset = () => {
    setItems([])
    setEditingId(null)
  }

  useImperativeHandle(ref, () => ({ applyBatch, reset }))

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSort = () => {
    setItems((prev) => [...prev].sort((a, b) => b.value - a.value))
  }

  const handleTitleChange = (id: number, title: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)))
  }

  const handleNoteChange = (id: number, note: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)))
  }

  const handleEditToggle = (id: number) => {
    setEditingId((prev) => (prev === id ? null : id))
  }

  const filterText = inputProbe.trim().toLowerCase()
  const visibleItems = filterText
    ? items.filter((item) => item.title.toLowerCase().includes(filterText))
    : items

  return (
    <section className="list-panel">
      <FilterItems value={inputProbe} onChange={setInputProbe} />
      <div className="list-header">
        <div>
          <strong>{visibleItems.length.toLocaleString()}</strong> rows in the DOM
        </div>
        <div className="list-header-actions">
          <div className="list-meta">
            Total Items: {items.length.toLocaleString()} · Incoming Rate:{' '}
            {incomingRate.toLocaleString()} eps
            {filterText
              ? ` · Filtered: ${visibleItems.length.toLocaleString()} / ${items.length.toLocaleString()}`
              : ''}
          </div>
          <button type="button" className="ghost" onClick={handleSort}>
            Sort by Value
          </button>
        </div>
      </div>
      <div className="list">
        <div className="list-row list-row--head">
          <span>ID</span>
          <span>Title</span>
          <span>Note</span>
          <span>Value</span>
          <span>Last Updated</span>
          <span>Action</span>
        </div>
        {visibleItems.map((item) => {
          const isEditing = editingId === item.id
          return (
            <div key={item.id} className="list-row" style={{ backgroundColor: item.color }}>
              <span className="cell-id">#{item.id}</span>
              <span className="cell-title">
                {isEditing ? (
                  <input
                    className="inline-input"
                    type="text"
                    value={item.title}
                    onChange={(event) => handleTitleChange(item.id, event.target.value)}
                  />
                ) : (
                  item.title
                )}
              </span>
              <span className="cell-note">
                {isEditing ? (
                  <input
                    className="inline-input"
                    type="text"
                    value={item.note}
                    onChange={(event) => handleNoteChange(item.id, event.target.value)}
                    placeholder="Add note"
                  />
                ) : (
                  item.note || '—'
                )}
              </span>
              <span className="cell-value">{item.value.toLocaleString()}</span>
              <span className="cell-updated">{item.updatedAt}</span>
              <span className="action-cell">
                <button type="button" className="ghost" onClick={() => handleEditToggle(item.id)}>
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                <button type="button" className="ghost" onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
})

StreamView.displayName = 'StreamView'

function StreamContainer() {
  const [tickRate, setTickRate] = useState(100)
  const [batchSize, setBatchSize] = useState(25)
  const [updatePct, setUpdatePct] = useState(20)
  const [running, setRunning] = useState(false)
  const [incomingRate, setIncomingRate] = useState(0)

  const nextIdRef = useRef(1)
  const incomingCounterRef = useRef(0)
  const existingIdsRef = useRef<number[]>([])
  const batchIdRef = useRef(0)
  const streamViewRef = useRef<StreamViewHandle | null>(null)

  const tickSliderValue = TICK_MAX + TICK_MIN - tickRate

  useEffect(() => {
    const id = window.setInterval(() => {
      setIncomingRate(incomingCounterRef.current)
      incomingCounterRef.current = 0
    }, 1000)

    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!running) return

    const id = window.setInterval(() => {
      incomingCounterRef.current += batchSize
      const inserts: StreamItem[] = []
      const updates: StreamUpdate[] = []

      for (let i = 0; i < batchSize; i += 1) {
        const canUpdate = existingIdsRef.current.length > 0
        const shouldUpdate = canUpdate && Math.random() * 100 < updatePct

        if (shouldUpdate) {
          const index = Math.floor(Math.random() * existingIdsRef.current.length)
          const idValue = existingIdsRef.current[index]
          updates.push(makeUpdate(idValue))
        } else {
          const idValue = nextIdRef.current
          nextIdRef.current += 1
          inserts.push(buildItem(idValue))
          existingIdsRef.current.push(idValue)
        }
      }

      batchIdRef.current += 1
      streamViewRef.current?.applyBatch({ id: batchIdRef.current, inserts, updates })
    }, tickRate)

    return () => window.clearInterval(id)
  }, [running, tickRate, batchSize, updatePct])

  const handleResetStream = () => {
    nextIdRef.current = 1
    existingIdsRef.current = []
    batchIdRef.current = 0
    incomingCounterRef.current = 0
    setIncomingRate(0)
    streamViewRef.current?.reset()
  }

  const handleTickRateSliderChange = (value: number) => {
    setTickRate(TICK_MAX + TICK_MIN - clampNumber(value, TICK_MIN, TICK_MAX))
  }

  const handleTickRateInputChange = (value: number) => {
    setTickRate(clampNumber(value, TICK_MIN, TICK_MAX))
  }

  const handleBatchSizeChange = (value: number) => {
    setBatchSize(clampNumber(value, 1, 500))
  }

  const handleUpdatePctChange = (value: number) => {
    setUpdatePct(clampNumber(value, 0, 100))
  }

  const itemsPerSecond = Math.round((batchSize * 1000) / tickRate)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <p className="eyebrow">Data Firehose Simulation</p>
          <h1>The Problem Phase</h1>
          <p className="subtitle">
            A deliberately unoptimized, high-frequency data stream meant to overwhelm the UI.
          </p>
        </div>
      </header>

      <div className="app-body">
        <aside className="panel">
          <div className="panel-section">
            <h2>Mock Stream Controller</h2>
            <p className="panel-description">
              Dial up the chaos. These controls tune the data rate and update churn.
            </p>
          </div>

          <div className="panel-section panel-actions">
            <button type="button" onClick={() => setRunning((prev) => !prev)}>
              {running ? 'Pause Stream' : 'Start Stream'}
            </button>
            <button type="button" onClick={handleResetStream}>
              Reset Stream
            </button>
          </div>

          <div className="panel-section">
            <label className="control-label" htmlFor="tickRate">
              Tick Interval (ms)
            </label>
            <div className="control-row">
              <input
                id="tickRate"
                type="range"
                min={TICK_MIN}
                max={TICK_MAX}
                value={tickSliderValue}
                onChange={(event) => handleTickRateSliderChange(Number(event.target.value))}
              />
              <input
                type="number"
                min={TICK_MIN}
                max={TICK_MAX}
                value={tickRate}
                onChange={(event) => handleTickRateInputChange(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="panel-section">
            <label className="control-label" htmlFor="batchSize">
              Batch Size
            </label>
            <div className="control-row">
              <input
                id="batchSize"
                type="range"
                min={1}
                max={500}
                value={batchSize}
                onChange={(event) => handleBatchSizeChange(Number(event.target.value))}
              />
              <input
                type="number"
                min={1}
                max={500}
                value={batchSize}
                onChange={(event) => handleBatchSizeChange(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="panel-section">
            <label className="control-label" htmlFor="updatePct">
              Update % (existing IDs)
            </label>
            <div className="control-row">
              <input
                id="updatePct"
                type="range"
                min={0}
                max={100}
                value={updatePct}
                onChange={(event) => handleUpdatePctChange(Number(event.target.value))}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={updatePct}
                onChange={(event) => handleUpdatePctChange(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="panel-section status">
            <div>
              <span className="status-label">Stream State</span>
              <span className={`status-pill ${running ? 'live' : 'paused'}`}>
                {running ? 'Live' : 'Paused'}
              </span>
            </div>
            <div>
              <span className="status-label">Target Throughput</span>
              <span className="status-value">{itemsPerSecond.toLocaleString()} items/sec</span>
            </div>
          </div>
        </aside>

        <StreamView ref={streamViewRef} incomingRate={incomingRate} />
      </div>

      <FPSStats bottom={16} right={16} top="auto" left="auto" graphHeight={60} graphWidth={160} />
    </div>
  )
}

function App() {
  return <StreamContainer />
}

export default App
