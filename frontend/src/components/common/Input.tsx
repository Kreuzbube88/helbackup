import { type InputHTMLAttributes, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', type, id: idProp, ...props }: InputProps) {
  const generatedId = useId()
  const id = idProp ?? (label ? generatedId : undefined)
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          id={id}
          type={inputType}
          className={[
            'w-full px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border rounded-none outline-none font-mono text-sm',
            'transition-all duration-150',
            error
              ? 'border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              : 'border-[var(--border-default)] focus:border-[var(--theme-glow)] focus:shadow-[0_0_20px_var(--theme-glow),inset_0_0_20px_rgba(6,182,212,0.1)] focus:scale-[1.02]',
            isPassword ? 'pr-10' : '',
            className,
          ].join(' ')}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
