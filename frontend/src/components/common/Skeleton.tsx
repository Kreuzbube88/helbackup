interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      style={{ width, height: height ?? 16 }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3 corner-cuts">
      <Skeleton width="55%" height={18} />
      <Skeleton width="100%" />
      <Skeleton width="75%" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="border border-[var(--border-default)] bg-[var(--bg-card)] p-3 flex items-center gap-4 corner-cuts">
      <Skeleton width={180} />
      <Skeleton width={90} />
      <Skeleton width={130} />
      <Skeleton width={60} className="ml-auto" />
    </div>
  )
}
