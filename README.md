# Real‑time Dashboard Mock

This repo simulates a high‑frequency data hose (polling/WebSocket‑like) and a dashboard UI that must stay responsive while rendering a large list.

## Quick start

```bash
pnpm install
pnpm dev
```

## Where to add your optimized code

Put your rendering and interaction optimizations in the **Dashboard** component:

- `src/Dashboard.tsx` — list rendering, filtering, editing, and user interaction live here.
- `src/App.tsx` — stream “hose” and tuning controls live here. Keep this as the mock setup layer.

If you want to compare against the original unoptimized version, check out the `/problem` branch.

## What to try

- Set **Tick Interval** to a very low value and Batch Size high to stress the UI.
- Type in the filter while the stream is running.
- Edit titles/notes while items are streaming in.
- Sort the list while the stream is active with 5,000+ rows.

## Notes / structure

- Dashboard rendering is isolated in `src/Dashboard.tsx` so you can optimize without touching the stream generator.
- The stream generator emits batches; the dashboard consumes them and manages user interaction.
- Sort the list while the stream is active with 5,000+ rows.
