import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/water-overrides.css'
import { AppRouter } from './router/index'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AppRouter />
  </ThemeProvider>
)
