const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ valid: false })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  )

  const { data, error } = await supabase
    .from('tokens')
    .select('token, active, expires_at')
    .eq('token', token.toUpperCase().trim())
    .eq('active', true)
    .single()

  if (error || !data) return res.json({ valid: false })

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return res.json({ valid: false, reason: 'expired' })
  }

  return res.json({ valid: true })
}
