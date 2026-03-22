import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  private copyError = (): void => {
    const { error, errorInfo } = this.state
    const text = [
      `Error: ${error?.message ?? 'Unknown error'}`,
      '',
      error?.stack ?? '',
      '',
      'Component Stack:',
      errorInfo?.componentStack ?? ''
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  private reload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      return (
        <div className="flex items-center justify-center h-screen bg-background p-8">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {error?.message ?? 'An unexpected error occurred.'}
              </p>

              {(error?.stack || errorInfo?.componentStack) && (
                <pre className="text-[10px] leading-tight bg-muted p-3 rounded-md overflow-auto max-h-48 text-muted-foreground">
                  {error?.stack}
                  {errorInfo?.componentStack &&
                    `\n\nComponent Stack:${errorInfo.componentStack}`}
                </pre>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={this.copyError}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Error
                </Button>
                <Button size="sm" onClick={this.reload}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reload App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
