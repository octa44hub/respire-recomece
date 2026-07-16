const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Autenticação via header ou query param
  const pwd = req.headers['x-admin-password'] || req.query?.pwd
  if (!process.env.ADMIN_PASSWORD || pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

  // Busca todos os tokens
  const { data: tokens, error: tokensError } = await supabase
    .from('tokens')
    .select('token, email, active, created_at, expires_at')
    .order('created_at', { ascending: false })

  if (tokensError) return res.status(500).json({ error: tokensError.message })

  // Busca todo o progresso
  const { data: progressList } = await supabase
    .from('progress')
    .select('token, data, updated_at')

  // Monta mapa de progresso por token
  const progressMap = {}
  if (progressList) {
    progressList.forEach(p => { progressMap[p.token] = { ...p.data, updated_at: p.updated_at } })
  }

  // Combina tokens + progresso
  const users = (tokens || []).map(t => {
    const prog = progressMap[t.token] || {}
    const completedDays = prog.completedDays?.length || 0
    const streak = prog.streak || 0
    const lastOpened = prog.lastOpened || prog.updated_at || null
    const startDate = prog.startDate || null
    const hasProgress = completedDays > 0

    return {
      email: t.email,
      token: t.token,
      active: t.active,
      created_at: t.created_at,
      completedDays,
      streak,
      lastOpened,
      startDate,
      hasProgress,
      pct: Math.round(completedDays / 21 * 100)
    }
  })

  // Métricas gerais
  const totalTokens = users.length
  const activeTokens = users.filter(u => u.active).length
  const withProgress = users.filter(u => u.hasProgress).length
  const completed21 = users.filter(u => u.completedDays === 21).length
  const avgDays = withProgress
    ? Math.round(users.filter(u => u.hasProgress).reduce((s, u) => s + u.completedDays, 0) / withProgress)
    : 0

  return res.json({
    metrics: { totalTokens, activeTokens, withProgress, completed21, avgDays },
    users
  })
}
