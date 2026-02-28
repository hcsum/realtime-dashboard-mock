import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import type { CSSProperties, ReactElement, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { List } from 'react-window'
import type { StreamBatch, StreamItem } from './streamTypes'
import { makeSimplePayload } from './streamTypes'

type FilterItemsProps = {
  value: string
  onChange: (value: string) => void
}

type DashboardProps = {
  incomingRate: number
}

export type DashboardHandle = {
  applyBatch: (batch: StreamBatch) => void
  reset: () => void
}

type RowData = {
  items: StreamItem[]
  editingId: number | null
  onTitleChange: (id: number, title: string) => void
  onNoteChange: (id: number, note: string) => void
  onEditToggle: (id: number) => void
  onDelete: (id: number) => void
}

const ROW_HEIGHT = 56

type RowProps = RowData & {
  index: number
  style: CSSProperties
  ariaAttributes?: {
    'aria-posinset': number
    'aria-setsize': number
    role: string
  }
}

const DashboardRow = ({
  index,
  style,
  ariaAttributes,
  items,
  editingId: activeId,
  onTitleChange,
  onNoteChange,
  onEditToggle,
  onDelete,
}: RowProps): ReactElement | null => {
  const item = items[index]
  if (!item) return null
  const isEditing = activeId === item.id
  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onEditToggle(item.id)
    event.currentTarget.blur()
  }
  return (
    <div className="list-row" style={{ ...style, backgroundColor: item.color }} {...ariaAttributes}>
      <span className="cell-id">#{item.id}</span>
      <span className="cell-title">
          {isEditing ? (
            <input
              className="inline-input"
              type="text"
              value={item.title}
              onChange={(event) => onTitleChange(item.id, event.target.value)}
              onKeyDown={handleEditKeyDown}
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
              onChange={(event) => onNoteChange(item.id, event.target.value)}
              placeholder="Add note"
              onKeyDown={handleEditKeyDown}
            />
        ) : (
          item.note || '—'
        )}
      </span>
      <span className="cell-value">{item.value.toLocaleString()}</span>
      <span className="cell-updated">{item.updatedAt}</span>
      <span className="action-cell">
        <button type="button" className="ghost" onClick={() => onEditToggle(item.id)}>
          {isEditing ? 'Done' : 'Edit'}
        </button>
        <button type="button" className="ghost" onClick={() => onDelete(item.id)}>
          Delete
        </button>
      </span>
    </div>
  )
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

const Dashboard = forwardRef<DashboardHandle, DashboardProps>(({ incomingRate }, ref) => {
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
  const rowData = useMemo<RowData>(
    () => ({
      items: visibleItems,
      editingId,
      onTitleChange: handleTitleChange,
      onNoteChange: handleNoteChange,
      onEditToggle: handleEditToggle,
      onDelete: handleDelete,
    }),
    [visibleItems, editingId],
  )

  return (
    <section className="list-panel">
      <FilterItems value={inputProbe} onChange={setInputProbe} />
      <div className="list-header">
        <div>
          <strong>{visibleItems.length.toLocaleString()}</strong> rows in the DOM
        </div>
        <div className="list-header-actions">
          <div className="list-meta">
            Total Items: {items.length.toLocaleString()} · Incoming Rate: {incomingRate.toLocaleString()} eps
            {filterText
              ? ` · Filtered: ${visibleItems.length.toLocaleString()} / ${items.length.toLocaleString()}`
              : ''}
          </div>
          <button type="button" className="ghost" onClick={handleSort}>
            Sort by Value
          </button>
        </div>
      </div>
      <div className="list-row list-row--head">
        <span>ID</span>
        <span>Title</span>
        <span>Note</span>
        <span>Value</span>
        <span>Last Updated</span>
        <span>Action</span>
      </div>
      <div className="list">
        <List<RowData>
          style={{ width: '100%', height: '100%' }}
          rowCount={visibleItems.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={DashboardRow}
          rowProps={rowData}
          overscanCount={6}
        />
      </div>
    </section>
  )
})

Dashboard.displayName = 'Dashboard'

export default Dashboard
