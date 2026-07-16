const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

// ─── Gera token único legível ───────────────────────────────────────────────
function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem O,0,I,1 p/ evitar confusão
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

// ─── Extrai dados do payload da Cakto ──────────────────────────────────────
// A Cakto envia event + data. Mapeamos os campos possíveis para cobrir variações.
function extractFromCakto(body) {
  const d = body?.data || body?.purchase || body
  const customer = d?.customer || d?.buyer || d?.client || {}

  const email = (
    customer.email ||
    d?.email ||
    body?.customer_email ||
    body?.email ||
    ''
  ).toLowerCase().trim()

  const name =
    customer.name ||
    customer.full_name ||
    d?.name ||
    body?.customer_name ||
    null

  const event = (body?.event || body?.type || body?.status || d?.status || '').toLowerCase()

  const productId = d?.product?.id || d?.product_id || body?.product_id || null

  return { email, name, event, productId }
}

// ─── Classifica o evento ────────────────────────────────────────────────────
function classifyEvent(event) {
  const approved = ['approved', 'paid', 'completed', 'success', 'purchase.approved',
                    'purchase.paid', 'compra_aprovada', 'sale.approved']
  const cancelled = ['cancelled', 'canceled', 'refunded', 'chargeback', 'subscription.cancelled',
                     'refund', 'reembolso', 'cancelada', 'reembolso_efetuado', 'assinatura_cancelada']

  if (approved.some(k => event.includes(k))) return 'approved'
  if (cancelled.some(k => event.includes(k))) return 'cancelled'
  return 'unknown'
}

// ─── Template de e-mail ────────────────────────────────────────────────────
function emailHTML(token, name, appUrl) {
  const firstName = name ? name.split(' ')[0] : 'Bem-vinda'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu acesso ao Respire e Recomece</title>
</head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(44,74,50,0.08);">
          <tr>
            <td style="background:linear-gradient(160deg,#1E3325,#2C4A32,#3D6B48);padding:48px 40px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;color:rgba(201,169,110,0.7);text-transform:uppercase;">Bem-vinda à sua jornada</p>
              <h1 style="margin:0;font-size:38px;font-weight:300;letter-spacing:6px;color:#F7F3ED;line-height:1.1;">RESPIRE</h1>
              <p style="margin:6px 0 0;font-size:13px;letter-spacing:4px;color:#C9A96E;">— e —</p>
              <h1 style="margin:4px 0 0;font-size:38px;font-weight:300;letter-spacing:6px;color:#F7F3ED;line-height:1.1;">RECOMECE</h1>
              <p style="margin:16px 0 0;font-size:10px;letter-spacing:3px;color:rgba(247,243,237,0.35);text-transform:uppercase;">21 DIAS · CLAREZA · PROSPERIDADE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 20px;font-size:18px;font-weight:400;color:#2C4A32;line-height:1.4;">${firstName}, seu acesso está pronto 🌿</p>
              <p style="margin:0 0 28px;font-size:14px;color:#6A6A6A;line-height:1.7;">Obrigada por confiar nessa jornada. Durante os próximos 21 dias você vai limpar o que não serve, reprogramar o que te limita e criar a base da prosperidade real.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F5EDD8;border:1.5px solid #E8D5A3;border-radius:14px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:10px;letter-spacing:2.5px;color:#8A6830;text-transform:uppercase;">Seu código de acesso</p>
                    <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:6px;color:#2C4A32;font-family:'Courier New',monospace;">${token}</p>
                    <p style="margin:10px 0 0;font-size:11px;color:#B09A6A;">Guarde este código. Você precisará dele para acessar o app.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display:inline-block;background:#C9A96E;color:#2C4A32;text-decoration:none;border-radius:12px;padding:16px 40px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">ACESSAR MINHA JORNADA</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#6A6A6A;line-height:1.7;">Ou acesse diretamente:<br>
              <a href="${appUrl}" style="color:#2C4A32;">${appUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;border-radius:12px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#2C4A32;text-transform:uppercase;font-family:Arial,sans-serif;">Como acessar</p>
                    <p style="margin:0 0 8px;font-size:13px;color:#4A4A4A;line-height:1.6;font-family:Arial,sans-serif;">1. Abra o link acima no seu celular</p>
                    <p style="margin:0 0 8px;font-size:13px;color:#4A4A4A;line-height:1.6;font-family:Arial,sans-serif;">2. Digite o código: <strong style="color:#2C4A32;letter-spacing:2px;">${token}</strong></p>
                    <p style="margin:0;font-size:13px;color:#4A4A4A;line-height:1.6;font-family:Arial,sans-serif;">3. Adicione à tela inicial para acesso rápido</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#2C4A32;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(247,243,237,0.5);">Respire e Recomece · AMTM Negócios Digitais</p>
              <p style="margin:6px 0 0;font-size:11px;color:rgba(201,169,110,0.5);">✦ 21 dias · Clareza · Prosperidade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Handler principal ─────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  // Log completo para debug (útil na primeira integração)
  console.log('[cakto-webhook] body:', JSON.stringify(req.body))
  console.log('[cakto-webhook] headers:', JSON.stringify(req.headers))

  // Autenticação — a Cakto envia o secret no body como "secret"
  const secret = req.body?.secret || req.headers['x-webhook-secret'] || req.query?.secret
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    console.log('[cakto-webhook] secret inválido:', secret)
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { email, name, event, productId } = extractFromCakto(req.body)
  const action = classifyEvent(event)

  console.log('[cakto-webhook] email:', email, '| event:', event, '| action:', action)

  if (!email) {
    // Retorna 200 p/ Cakto não retentar — mas loga o problema
    console.error('[cakto-webhook] e-mail não encontrado no payload')
    return res.status(200).json({ ok: false, message: 'E-mail não encontrado', body: req.body })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

  // ── CANCELAMENTO / REEMBOLSO → desativa o token ──────────────────────────
  if (action === 'cancelled') {
    const { error } = await supabase
      .from('tokens')
      .update({ active: false })
      .eq('email', email)

    if (error) console.error('[cakto-webhook] erro ao desativar token:', error)
    else console.log('[cakto-webhook] token desativado para:', email)

    return res.status(200).json({ ok: true, action: 'token_deactivated', email })
  }

  // ── EVENTO DESCONHECIDO → ignora mas retorna 200 ─────────────────────────
  if (action === 'unknown') {
    console.log('[cakto-webhook] evento ignorado:', event)
    return res.status(200).json({ ok: true, message: 'Evento ignorado: ' + event })
  }

  // ── COMPRA APROVADA → cria ou reutiliza token ────────────────────────────
  const { data: existing } = await supabase
    .from('tokens')
    .select('token, active')
    .eq('email', email)
    .single()

  let token

  if (existing) {
    // Reativa caso estivesse desativado (ex: recompra após reembolso)
    token = existing.token
    if (!existing.active) {
      await supabase.from('tokens').update({ active: true }).eq('email', email)
      console.log('[cakto-webhook] token reativado para:', email)
    } else {
      console.log('[cakto-webhook] token já existe para:', email)
    }
  } else {
    token = generateToken()
    const { error: insertError } = await supabase
      .from('tokens')
      .insert({ token, email })

    if (insertError) {
      console.error('[cakto-webhook] erro ao inserir token:', insertError)
      // Retorna 500 para Cakto retentar
      return res.status(500).json({ error: 'Erro ao criar token', detail: insertError.message })
    }
    console.log('[cakto-webhook] novo token criado para:', email)
  }

  // ── Envia e-mail com o código ─────────────────────────────────────────────
  const appUrl = process.env.APP_URL || 'https://app-respire.blivxus.com'
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: `Respire e Recomece <${fromEmail}>`,
      to: email,
      subject: `${name ? name.split(' ')[0] + ', seu' : 'Seu'} acesso ao Respire e Recomece está aqui 🌿`,
      html: emailHTML(token, name, appUrl)
    })
    if (emailError) console.error('[cakto-webhook] erro Resend:', emailError)
    else console.log('[cakto-webhook] e-mail enviado para:', email)
  } catch (emailError) {
    console.error('[cakto-webhook] exceção ao enviar e-mail:', emailError)
    // Não falha — token foi criado com sucesso
  }

  return res.status(200).json({ ok: true, action: 'token_created', token, email })
}
