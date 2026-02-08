import { useEffect, useRef, useState } from 'react'
import FPSStats from 'react-fps-stats'
import './App.css'

type PayloadMode = 'simple' | 'heavy'

type StreamItem = {
  id: number
  title: string
  value: number
  updatedAt: string
  color: string
  payload: Record<string, unknown>
}

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

const makeHeavyPayload = (id: number, title: string, value: number) => {
  const seed = Date.now() + Math.floor(Math.random() * 1000)
  const vectors = Array.from({ length: 12 }, (_, index) => ({
    index,
    magnitude: Math.random() * value,
    coords: Array.from({ length: 8 }, () => Math.random() * 100),
  }))
  const trail = Array.from({ length: 6 }, (_, index) => ({
    step: index,
    note: `Trace-${id}-${index}-${Math.floor(Math.random() * 9999)}`,
    flags: {
      active: Math.random() > 0.4,
      critical: Math.random() > 0.9,
    },
    points: Array.from({ length: 5 }, (_, pointIndex) => ({
      pointIndex,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      weight: Math.random(),
    })),
  }))

  return {
    id,
    title,
    value,
    label: `Item ${id}`,
    createdAt: seed,
    meta: {
      origin: `node-${id % 13}`,
      checksum: `${seed}-${value}-${id}`,
      tags: ['hot', 'volatile', 'stream', `tier-${id % 5}`],
    },
    vectors,
    trail,
    history: Array.from({ length: 4 }, (_, index) => ({
      index,
      timestamp: seed - index * 1234,
      value: Math.random() * value,
      delta: (Math.random() - 0.5) * 100,
    })),
  }
}

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

const buildItem = (id: number, mode: PayloadMode): StreamItem => {
  const value = Math.floor(Math.random() * 100000)
  const updatedAt = new Date().toLocaleTimeString()
  const color = makeColor()
  const title = makeTitle()
  const payload =
    mode === 'heavy' ? makeHeavyPayload(id, title, value) : makeSimplePayload(id, title, value)

  return { id, title, value, updatedAt, color, payload }
}

function App() {
  const [tickRate, setTickRate] = useState(100)
  const [batchSize, setBatchSize] = useState(25)
  const [updatePct, setUpdatePct] = useState(20)
  const [payloadMode, setPayloadMode] = useState<PayloadMode>('simple')
  const [running, setRunning] = useState(true)
  const [items, setItems] = useState<StreamItem[]>([])
  const [incomingRate, setIncomingRate] = useState(0)
  const [inputProbe, setInputProbe] = useState('')

  const nextIdRef = useRef(1)
  const incomingCounterRef = useRef(0)

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
      setItems((prev) => {
        const next = [...prev]

        for (let i = 0; i < batchSize; i += 1) {
          const shouldUpdate = next.length > 0 && Math.random() * 100 < updatePct

          if (shouldUpdate) {
            const index = Math.floor(Math.random() * next.length)
            const existing = next[index]
            next[index] = buildItem(existing.id, payloadMode)
          } else {
            const idValue = nextIdRef.current
            nextIdRef.current += 1
            next.push(buildItem(idValue, payloadMode))
          }
        }

        return next
      })
    }, tickRate)

    return () => window.clearInterval(id)
  }, [running, tickRate, batchSize, updatePct, payloadMode])

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSort = () => {
    setItems((prev) => [...prev].sort((a, b) => b.value - a.value))
  }

  const handleReset = () => {
    setItems([])
    nextIdRef.current = 1
  }

  const filterText = inputProbe.trim().toLowerCase()
  const visibleItems = filterText
    ? items.filter((item) => item.title.toLowerCase().includes(filterText))
    : items

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
        <div className="header-actions">
          <div className="header-stats">
            <div className="header-stat">
              <span>Total Items</span>
              <strong>{items.length.toLocaleString()}</strong>
            </div>
            <div className="header-stat">
              <span>Incoming Rate</span>
              <strong>{incomingRate.toLocaleString()} eps</strong>
            </div>
          </div>
          <div className="header-buttons">
            <button type="button" onClick={() => setRunning((prev) => !prev)}>
              {running ? 'Pause Stream' : 'Start Stream'}
            </button>
            <button type="button" onClick={handleReset}>
              Reset List
            </button>
            <button type="button" onClick={handleSort}>
              Sort by Value
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="panel">
          <div className="panel-section">
            <h2>Mock Stream Controller</h2>
            <p className="panel-description">
              Dial up the chaos. These controls tune the data rate, payload weight, and update churn.
            </p>
          </div>

          <div className="panel-section">
            <label className="control-label" htmlFor="tickRate">
              Tick Rate (ms)
            </label>
            <div className="control-row">
              <input
                id="tickRate"
                type="range"
                min={1}
                max={1000}
                value={tickRate}
                onChange={(event) =>
                  setTickRate(clampNumber(Number(event.target.value), 1, 1000))
                }
              />
              <input
                type="number"
                min={1}
                max={1000}
                value={tickRate}
                onChange={(event) =>
                  setTickRate(clampNumber(Number(event.target.value), 1, 1000))
                }
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
                onChange={(event) =>
                  setBatchSize(clampNumber(Number(event.target.value), 1, 500))
                }
              />
              <input
                type="number"
                min={1}
                max={500}
                value={batchSize}
                onChange={(event) =>
                  setBatchSize(clampNumber(Number(event.target.value), 1, 500))
                }
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
                onChange={(event) =>
                  setUpdatePct(clampNumber(Number(event.target.value), 0, 100))
                }
              />
              <input
                type="number"
                min={0}
                max={100}
                value={updatePct}
                onChange={(event) =>
                  setUpdatePct(clampNumber(Number(event.target.value), 0, 100))
                }
              />
            </div>
          </div>

          <div className="panel-section">
            <span className="control-label">Payload Complexity</span>
            <div className="toggle-group">
              <label className="toggle-option">
                <input
                  type="radio"
                  name="payload"
                  checked={payloadMode === 'simple'}
                  onChange={() => setPayloadMode('simple')}
                />
                Simple
              </label>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="payload"
                  checked={payloadMode === 'heavy'}
                  onChange={() => setPayloadMode('heavy')}
                />
                Heavy
              </label>
            </div>
          </div>

          <div className="panel-section">
            <label className="control-label" htmlFor="probeInput">
              Filter Items
            </label>
            <input
              id="probeInput"
              type="text"
              value={inputProbe}
              placeholder="Filter by item title (e.g. ABZ-1209)"
              onChange={(event) => setInputProbe(event.target.value)}
            />
            <p className="hint">Filters update as the stream runs. Expect lag under load.</p>
          </div>

          <div className="panel-section status">
            <div>
              <span className="status-label">Stream State</span>
              <span className={`status-pill ${running ? 'live' : 'paused'}`}>
                {running ? 'Live' : 'Paused'}
              </span>
            </div>
            <div>
              <span className="status-label">Rendered Items</span>
              <span className="status-value">{items.length.toLocaleString()}</span>
            </div>
          </div>
        </aside>

        <section className="list-panel">
          <div className="list-header">
            <div>
              <strong>{visibleItems.length.toLocaleString()}</strong> rows in the DOM
            </div>
            <div className="list-meta">
              Tick: {tickRate}ms · Batch: {batchSize} · Updates: {updatePct}%
              {filterText
                ? ` · Filtered: ${visibleItems.length.toLocaleString()} / ${items.length.toLocaleString()}`
                : ''}
            </div>
          </div>
          <div className="list">
            <div className="list-row list-row--head">
              <span>ID</span>
              <span>Title</span>
              <span>Value</span>
              <span>Last Updated</span>
              <span>Action</span>
            </div>
            {visibleItems.map((item) => (
              <div key={item.id} className="list-row" style={{ backgroundColor: item.color }}>
                <span className="cell-id">#{item.id}</span>
                <span className="cell-title">{item.title}</span>
                <span className="cell-value">{item.value.toLocaleString()}</span>
                <span className="cell-updated">{item.updatedAt}</span>
                <span>
                  <button type="button" className="ghost" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <FPSStats bottom={16} right={16} top="auto" left="auto" graphHeight={60} graphWidth={160} />
    </div>
  )
}

export default App
