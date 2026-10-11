import { Component } from 'react';
import { ErrorState } from './ErrorState';

/** Catches render errors in a page so the rest of the app keeps working. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page could not be displayed"
          message="An unexpected error occurred. Your data is safe. Try again, or reset the demo data from the account menu if the problem persists."
          onRetry={() => this.setState({ error: null })}
          backTo="/dashboard"
          backLabel="Back to dashboard"
        />
      );
    }
    return this.props.children;
  }
}
