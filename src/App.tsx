import { useEffect, useRef, useState } from 'react'
import FPSStats from 'react-fps-stats'
import './App.css'
import Dashboard, { type DashboardHandle } from './Dashboard'
import { makeSimplePayload, type StreamItem, type StreamUpdate } from './streamTypes'

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

function App() {
  const [tickRate, setTickRate] = useState(500)
  const [batchSize, setBatchSize] = useState(100)
  const [updatePct, setUpdatePct] = useState(20)
  const [running, setRunning] = useState(false)
  const [incomingRate, setIncomingRate] = useState(0)

  const nextIdRef = useRef(1)
  const incomingCounterRef = useRef(0)
  const existingIdsRef = useRef<number[]>([])
  const batchIdRef = useRef(0)
  const streamViewRef = useRef<DashboardHandle | null>(null)

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
          <h1>Real-time Dashboard Mock</h1>
          <p className="subtitle">
            This demo mocks real-time polling or WebSocket streams with large volumes of data, and
            focuses on optimizing frontend rendering and user interaction.
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
            <button
              type="button"
              className={running ? 'ghost' : 'primary'}
              onClick={() => setRunning((prev) => !prev)}
            >
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

        <Dashboard ref={streamViewRef} incomingRate={incomingRate} />
      </div>

      <FPSStats bottom={16} right={16} top="auto" left="auto" graphHeight={60} graphWidth={160} />
    </div>
  )
}

export default App
