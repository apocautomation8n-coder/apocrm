import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import messagesRouter from './routes/messages.js'
import agentsRouter from './routes/agents.js'
import sheetsRouter from './routes/sheets.js'
import calendarRouter from './routes/calendar.js'
import contactsRouter from './routes/contacts.js'
import usersRouter from './routes/users.js'
import budgetsRouter from './routes/budgets.js'
import { ultraParser, sendError } from './utils.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
// Capture as text to handle malformed JSON from n8n
app.use(express.text({ type: ['application/json', 'text/plain'], limit: '10mb' }))
app.use(express.json({ limit: '10mb' }))

// Importante: No aplicar ultraParser de forma global a /api/budgets porque destruye el payload JSON estándar.
// Lo aplicamos condicionalmente solo si NO es la ruta de presupuestos
app.use((req, res, next) => {
  if (req.path.startsWith('/api/budgets')) {
    // Si el body viene como string por express.text, lo parseamos
    if (typeof req.body === 'string' && req.body.trim()) {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        // ignora si no es JSON válido
      }
    }
    return next();
  }
  return ultraParser(req, res, next);
})

// Routes
app.use('/api/messages', messagesRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/sheets', sheetsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/users', usersRouter)
app.use('/api/budgets', budgetsRouter)


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Exception:', err)
  sendError(res, err.message || 'Internal Server Error', 500)
})

// Only start the server locally. Vercel will simply import the app.
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`)
  })
}

export default app
