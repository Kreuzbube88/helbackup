interface Props {
  labels: string[]
  /** zero-based index of the current step */
  current: number
  /** zero-based index of the highest step the user has reached (enables click-back) */
  furthest?: number
  onJump?: (index: number) => void
}

export function StepIndicator({ labels, current, furthest, onJump }: Props) {
  const reach = furthest ?? current
  return (
    <div className="flex items-center gap-1 mb-6">
      {labels.map((label, i) => {
        const isCurrent = current === i
        const isDone = i < reach
        const clickable = !!onJump && i <= reach
        return (
          <div key={i} className="flex items-center gap-1 flex-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(i)}
              className={[
                'flex items-center gap-1.5 text-xs py-1 px-2 transition-colors',
                isCurrent ? 'text-[var(--theme-accent)] font-medium' :
                isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
                clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
              ].join(' ')}
            >
              <span
                className={[
                  'w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-shrink-0',
                  isCurrent ? 'bg-[var(--theme-accent)] text-black' :
                  isDone ? 'bg-green-500 text-white' :
                  'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < labels.length - 1 && <div className="flex-1 h-px bg-[var(--border-default)]" />}
          </div>
        )
      })}
    </div>
  )
}
