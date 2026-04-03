import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', hover = false, glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-[var(--bg-card)] border border-[var(--border-default)]',
        'shadow-md p-4',
        hover ? 'card-lift cursor-pointer' : '',
        glow ? 'border-neon' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
