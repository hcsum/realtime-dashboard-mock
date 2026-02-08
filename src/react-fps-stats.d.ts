declare module 'react-fps-stats' {
  import type { ComponentType } from 'react'

  export type FPSStatsProps = {
    top?: number | string
    right?: number | string
    bottom?: number | string
    left?: number | string
    graphHeight?: number
    graphWidth?: number
  }

  const FPSStats: ComponentType<FPSStatsProps>
  export default FPSStats
}
