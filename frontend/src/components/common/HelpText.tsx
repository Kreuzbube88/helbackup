import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface Props {
  text: string
}

export function HelpText({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-start gap-1.5 mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[var(--text-muted)] hover:text-[var(--theme-accent)] transition-colors mt-0.5 flex-shrink-0"
        aria-label="Help"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{text}</p>
      )}
    </div>
  )
}
