import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PageNab] UI error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--error)]">
            Something went wrong
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {this.state.error}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
