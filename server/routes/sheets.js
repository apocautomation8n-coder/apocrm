import { Router } from 'express'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

// Sheet IDs by agent slug
const SHEET_IDS = {
  talleres: process.env.GOOGLE_SHEET_TALLERES,
  clinicas: process.env.GOOGLE_SHEET_CLINICAS,
  gym: process.env.GOOGLE_SHEET_GYM,
}

// Build Google Auth
function getAuth() {
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  
  // Clean up the key if it came with quotes or literal \n
  privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

// GET /api/sheets/metrics?agent=talleres
router.get('/metrics', async (req, res) => {
  try {
    const { agent } = req.query
    const sheetId = SHEET_IDS[agent]

    if (!sheetId) {
      return res.status(400).json({ error: `Unknown agent: ${agent}. Available: ${Object.keys(SHEET_IDS).join(', ')}` })
    }

    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // Read the first sheet (Sheet1), all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:Z', // Read all columns
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return res.json({
        headers: [],
        rows: [],
        sentCount: 0,
        followUps: 0,
        unanswered: 0,
      })
    }

    const headers = rows[0] || []
    const dataRows = rows.slice(1)

    // Discover column indices based on header names (case insensitive)
    const getColIdx = (regex) => headers.findIndex(h => regex.test(h))

    // Look for "Enviado" or "Contactado / WP SI"
    let enviadoIdx = getColIdx(/enviado|contactado \/ wp si/i)
    if (enviadoIdx === -1) {
      // Fallback
      enviadoIdx = getColIdx(/contactado/i)
    }

    // Look for "Seguimiento 1"
    const seg1Idx = getColIdx(/seguimiento 1/i)

    let sentCount = 0
    let followUps = 0
    let unanswered = 0

    dataRows.forEach(row => {
      let isSent = false
      let isFollowedUp = false

      if (enviadoIdx >= 0) {
        const val = (row[enviadoIdx] || '').toString().trim().toLowerCase()
        if (val === 'si' || val === 'contactado' || val.includes('si')) {
          isSent = true
        }
      }

      if (seg1Idx >= 0) {
        const val = (row[seg1Idx] || '').toString().trim().toLowerCase()
        // If there's any value (date, "si", etc.) it means a follow-up was sent
        if (val && val !== 'no' && val !== '-') {
          isFollowedUp = true
        }
      }

      if (isSent) {
        sentCount++
      }

      if (isFollowedUp) {
        followUps++
      }

      // "Unanswered" is defined as: We sent the first message, AND we had to send a follow-up.
      // (If they replied, we wouldn't have sent the follow-up).
      if (isSent && isFollowedUp) {
        unanswered++
      }
    })

    res.json({
      headers,
      rows: dataRows,
      sentCount,
      followUps,
      unanswered,
    })
  } catch (err) {
    console.error('Sheets API error:', err.message)
    res.status(500).json({ error: 'Failed to fetch sheet data', details: err.message })
  }
})

export default router
