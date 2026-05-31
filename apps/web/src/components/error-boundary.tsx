'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@stemverse/ui';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-warning" />
          <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted">{this.state.message}</p>
          <Button type="button" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
