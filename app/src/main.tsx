import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Stilarnas ordning (docs/arkitektur.md avsnitt 6): globala lager och typsnitt,
// sedan CSS-variablerna ur design/tema.ts. Gamla vyns stilar (index.css, i
// @layer legacy) laddas med gamla appen bakom ?gammal (GammalApp.tsx).
import './styles/index.css'
import 'virtual:tema.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
