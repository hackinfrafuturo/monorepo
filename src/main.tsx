import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AgentationDev } from './components/AgentationDev.tsx'
import Apply from './Apply.tsx'
import Home from './Home.tsx'
import Flag from './Flag.tsx'
import { APPLY, HOME, SPONSOR, legacyPath, persistLocale } from './i18n/locale.ts'
import './index.css'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const tail = `${window.location.search}${window.location.hash}`

const legacy = legacyPath(path)
if (legacy) {
  persistLocale(legacy.locale)
  window.location.replace(`${legacy.dest}${tail}`)
} else if (path === '/flag') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Flag />
    </StrictMode>,
  )
} else if (path === HOME || path === '/home') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Home />
      <AgentationDev />
    </StrictMode>,
  )
} else if (path === APPLY) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Apply />
      <AgentationDev />
    </StrictMode>,
  )
} else if (path === '/sponsor') {
  window.location.replace(`${SPONSOR}${tail}`)
} else {
  window.location.replace(`${HOME}${tail}`)
}
