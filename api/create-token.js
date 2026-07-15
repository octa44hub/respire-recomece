const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email required' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const token = Math.random().toString(36).slice(2, 8).toUpperCase()

  const { error } = await supabase
    .from('tokens')
    .insert({ token, email })

  if (error) return res.status(500).json({ error: 'Failed to create token' })

  return res.json({ ok: true, token })
}
