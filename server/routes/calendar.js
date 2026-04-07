import { Router } from 'express'
import { google } from 'googleapis'
import dotenv from 'dotenv'
import { sendSuccess, sendError } from '../utils.js'

dotenv.config()

const router = Router()

// For now, calendar events are managed via Supabase table.
// This router provides a placeholder for future Google Calendar OAuth integration.

// OAuth 2.0 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI
)

// GET /api/calendar/auth-url — Generate OAuth URL for user to connect Google Calendar
router.get('/auth-url', (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent',
    })
    return sendSuccess(res, { url })
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/calendar/callback — Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return sendError(res, 'No code provided', 400)

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // In production, save tokens to Supabase associated with the user
    return sendSuccess(res, { message: 'Google Calendar connected', tokens })
  } catch (err) {
    return sendError(res, err)
  }
})

// POST /api/calendar/event — Create a calendar event
router.post('/event', async (req, res) => {
  try {
    const { title, date, start_time, end_time, description, guests } = req.body

    // Check if we have valid credentials
    if (!oauth2Client.credentials?.access_token) {
      return sendError(res, 'Google Calendar not connected. Visit /api/calendar/auth-url first.', 401)
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: `${date}T${start_time || '09:00'}:00`,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: `${date}T${end_time || '10:00'}:00`,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    }

    if (guests) {
      event.attendees = guests.split(',').map(email => ({ email: email.trim() }))
    }

    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })

    return sendSuccess(res, result.data)
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
