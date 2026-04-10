import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import messagesRouter from './routes/messages.js'
import agentsRouter from './routes/agents.js'
import sheetsRouter from './routes/sheets.js'
import calendarRouter from './routes/calendar.js'
import contactsRouter from './routes/contacts.js'
import usersRouter from './routes/users.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
// Capture as text to handle malformed JSON from n8n
app.use(express.text({ type: ['application/json', 'text/plain'], limit: '10mb' }))
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/messages', messagesRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/sheets', sheetsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/users', usersRouter)


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Only start the server locally. Vercel will simply import the app.
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`)
  })
}

export default app
