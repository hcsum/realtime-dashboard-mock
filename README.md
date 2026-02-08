# Data Firehose Simulation

Frontend-only UI that simulates a high-frequency data stream to intentionally stress the main thread.

## Quick start

```bash
pnpm install
pnpm dev
```

## What to try

- Set Tick Rate < 10ms and Batch Size > 50 to see input lag.
- Switch payload complexity to Heavy for larger objects.
- Sort the list while the stream is active with 5,000+ rows.
