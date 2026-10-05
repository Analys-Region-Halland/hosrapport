import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Stilarnas ordning (docs/arkitektur.md avsnitt 6): globala lager och typsnitt,
// CSS-variablerna ur design/tema.ts, sist gamla vyns stilar i @layer legacy.
import './styles/index.css'
import 'virtual:tema.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
