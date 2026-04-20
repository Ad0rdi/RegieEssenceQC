import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          background: '#fff3f3',
          border: '1px solid #ffcccc',
          borderRadius: '8px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2>Une erreur est survenue</h2>
          <p>Impossible de charger l'application correctement.</p>
          <details style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#666' }}>
            <summary>Détails de l'erreur</summary>
            {this.state.error?.toString()}
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
