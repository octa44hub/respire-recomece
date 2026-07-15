const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ ok: false, error: 'token é obrigatório' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

  const { data, error } = await supabase
    .from('progress')
    .select('data, updated_at')
    .eq('token', token.toUpperCase().trim())
    .single()

  if (error || !data) return res.json({ ok: true, data: null })
  return res.json({ ok: true, data: data.data, updated_at: data.updated_at })
}
