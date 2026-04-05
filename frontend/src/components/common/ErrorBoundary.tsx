import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="border border-red-500/40 bg-red-500/10 p-6 max-w-md w-full space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} />
            <span className="font-semibold text-sm">Unexpected Error</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {this.state.error?.message ?? 'An unknown error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-[var(--theme-primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
