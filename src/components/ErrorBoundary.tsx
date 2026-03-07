import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#050505',
            color: '#ffffff',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>
            Erreur de l&apos;application
          </h1>
          <pre
            style={{
              background: '#1a1a1a',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
              color: '#fca5a5',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: '1rem', color: '#a1a1aa', fontSize: '0.875rem' }}>
            Ouvre la console du navigateur (F12) pour plus de détails.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
