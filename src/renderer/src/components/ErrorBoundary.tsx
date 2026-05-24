import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.hash = '/'
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-red-600">
                  {this.state.error.message}
                  {this.state.error.stack
                    ? '\n\n' + this.state.error.stack
                    : ''}
                </pre>
              </details>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={this.handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                Reload App
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
