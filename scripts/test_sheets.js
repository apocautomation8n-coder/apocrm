import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  key = key.replace(/^"|"$/g, '').replace(/\\n/g, '\n')

  console.log("Email:", email)
  console.log("Key extracted. Length:", key.length)

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  try {
    const client = await auth.getClient()
    const sheets = google.sheets({ version: 'v4', auth: client })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_GYM,
      range: 'A1:Z2',
    })
    console.log("Gym Headers:", response.data.values?.[0])
  } catch (err) {
    console.error("Auth test failed:", err.message)
    if (err.response) {
      console.error("Error data:", err.response.data)
    }
  }
}

main()
