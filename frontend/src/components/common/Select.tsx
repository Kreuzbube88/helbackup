import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
}

export function Select({ label, options, error, className = '', ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = props.id ?? generatedId
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          id={selectId}
          className={[
            'w-full px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'border outline-none appearance-none font-mono text-sm cursor-pointer',
            'transition-all duration-150',
            error
              ? 'border-red-500'
              : 'border-[var(--border-default)] focus:border-[var(--border-glow)] focus:shadow-[0_0_8px_var(--theme-glow)]',
            className,
          ].join(' ')}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[var(--bg-secondary)]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
