import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Simple test component
function TestApp() {
    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h1>React is Working!</h1>
            <p>If you see this, React is loading correctly.</p>
        </div>
    )
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <TestApp />
    </StrictMode>,
)
