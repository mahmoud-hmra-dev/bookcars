import React, { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#FAFAFA',
          }}
        >
          <h1 style={{ fontSize: '2rem', color: '#1E293B', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#64748B', marginBottom: '2rem', maxWidth: '480px' }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#1B6B4A',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => { (e.currentTarget.style.backgroundColor = '#145038') }}
            onMouseOut={(e) => { (e.currentTarget.style.backgroundColor = '#1B6B4A') }}
            onFocus={(e) => { (e.currentTarget.style.backgroundColor = '#145038') }}
            onBlur={(e) => { (e.currentTarget.style.backgroundColor = '#1B6B4A') }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
