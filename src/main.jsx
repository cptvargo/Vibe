import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/tokens.css'
import App from './App.jsx'
import { initAnalyticsListener } from './features/analytics/analyticsListener'
import { initServerUrl } from './api/jellyfin'

initAnalyticsListener()
initServerUrl() // non-blocking: detects LAN vs remote before user taps first song

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', background: '#080810', minHeight: '100vh' }}>
        <strong>Crash:</strong>{'\n'}{this.state.error?.message}{'\n\n'}{this.state.error?.stack}
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
