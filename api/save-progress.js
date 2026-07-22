const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { token, data } = req.body || {}
  if (!token || !data) return res.status(400).json({ ok: false, error: 'token e data são obrigatórios' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

  const { error } = await supabase
    .from('progress')
    .upsert(
      { token: token.toUpperCase().trim(), data, updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    )

  if (error) return res.status(500).json({ ok: false, error: error.message })
  return res.json({ ok: true })
}
