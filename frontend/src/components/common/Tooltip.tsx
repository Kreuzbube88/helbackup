import { type ReactNode, useState } from 'react'

interface Props {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const positions = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, children, position = 'top' }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={[
            'absolute z-50 px-2 py-1 text-xs whitespace-nowrap pointer-events-none',
            'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
            'text-[var(--text-primary)] animate-fade-in',
            positions[position],
          ].join(' ')}
        >
          {content}
        </div>
      )}
    </div>
  )
}
