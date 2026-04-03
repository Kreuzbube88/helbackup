import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: [
    'bg-primary text-white border-2 border-[var(--theme-glow)]',
    'shadow-[0_0_30px_var(--theme-glow)] hover:shadow-[0_0_50px_var(--theme-glow)] hover:-translate-y-0.5',
    'active:shadow-[0_0_10px_var(--theme-glow)] active:translate-y-0.5',
    'relative overflow-hidden',
  ].join(' '),
  secondary: [
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-default)]',
    'hover:border-[var(--theme-primary)] hover:shadow-md hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-sm',
  ].join(' '),
  danger: [
    'bg-red-600 text-white border border-red-600',
    'hover:bg-red-500 hover:shadow-[0_0_16px_rgba(220,38,38,0.5)] hover:-translate-y-0.5',
    'active:translate-y-0',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--text-secondary)] border border-transparent',
    'hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  ].join(' '),
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-20 translate-x-[-200%] hover:translate-x-[200%] transition-all duration-700 pointer-events-none" />
      )}
      {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}
