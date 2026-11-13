import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendChannelReact, getAutoRandomName } from './reactModule.js'
import { visit, getAmStats, sendLink, verifyLink } from './amprem.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

// 1. WA Channel Auto React Endpoints
app.get('/api/random-name', async (req, res) => {
  try {
    const name = await getAutoRandomName(true)
    res.json({ status: true, name })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
})

app.post('/api/react', async (req, res) => {
  try {
    const { postUrl, url, emoji = '🔥,❤️,👍' } = req.body || {}
    const targetUrl = postUrl || url
    const result = await sendChannelReact(targetUrl, emoji)
    res.json(result)
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
})

// 2. AM PREM GEN Endpoints (visit, stats, send-link, verify-link)
app.post('/api/visit', async (req, res) => {
  try {
    const isNew = req.body?.new !== false
    const data = await visit(isNew)
    res.json(data)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

app.get('/api/am/stats', async (req, res) => {
  try {
    const data = await getAmStats()
    res.json(data)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

app.post('/api/am/send-link', async (req, res) => {
  try {
    const { email } = req.body || {}
    const data = await sendLink(email)
    res.json(data)
  } catch (err) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { ok: false, message: err.message })
  }
})

app.post('/api/am/verify-link', async (req, res) => {
  try {
    const { email, magicLink } = req.body || {}
    const data = await verifyLink(email, magicLink)
    res.status(data.httpStatus || 200).json(data)
  } catch (err) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { ok: false, message: err.message })
  }
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`REACTION CHANNEL BY JIYYAD TOOLS running on http://localhost:${PORT}`)
})
