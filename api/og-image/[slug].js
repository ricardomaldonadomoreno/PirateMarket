import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { slug } = req.query

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, photos, description')
    .eq('slug', slug)
    .single()

  const siteUrl = 'https://pirate-market.vercel.app'
  const photo = listing?.photos?.[0] || `${siteUrl}/logo.png`
  const title = listing
    ? `${listing.title} - BOB ${listing.price}`
    : 'Pirata Market'
  const description = listing?.description || ''

  // Generar SVG como imagen
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Fondo negro -->
  <rect width="1200" height="630" fill="#111111"/>
  
  <!-- Foto del anuncio como fondo -->
  <image href="${photo}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity="0.55"/>
  
  <!-- Degradado inferior -->
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect y="200" width="1200" height="430" fill="url(#grad)"/>

  <!-- Badge naranja -->
  <rect x="40" y="390" width="220" height="55" rx="8" fill="#F5A623"/>
  <text x="150" y="425" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">Ver anuncio →</text>

  <!-- Título -->
  <text x="40" y="510" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">${title.slice(0, 40)}</text>

  <!-- Descripción -->
  <text x="40" y="570" font-family="Arial, sans-serif" font-size="26" fill="#cccccc">${description.slice(0, 70)}</text>

  <!-- Branding -->
  <text x="1160" y="50" font-family="Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.8" text-anchor="end">🏴‍☠️ pirate-market.vercel.app</text>
</svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 's-maxage=3600')
  res.status(200).send(svg)
}
