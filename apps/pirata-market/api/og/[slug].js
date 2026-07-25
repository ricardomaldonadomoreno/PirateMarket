import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { slug, img } = req.query
  const siteUrl = process.env.SITE_URL || 'https://pirate-market.vercel.app'

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  )

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      title, price, currency, photos, description,
      category:categories(name, slug, icon),
      user:users(display_name, avatar_url, is_verified, user_type)
    `)
    .eq('slug', slug)
    .single()

  const photo = listing?.photos?.[0] || null
  const userDisplay = listing?.user?.display_name || 'Pirata'
  const title = listing
    ? `${listing.title} — ${listing.currency || 'BOB'} ${listing.price}`
    : 'Pirata Market'
  const description = listing?.description
    ? listing.description.slice(0, 200)
    : 'Comercio sin intermediarios — Pirata Market'
  const pageUrl = listing ? `${siteUrl}/ficha/${slug}` : siteUrl
  const imageUrl = `${siteUrl}/api/og/${slug}?img=1`

  if (img === '1') {
    const titleSafe = title.slice(0, 55)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const descSafe = description.slice(0, 90)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Descargar foto y convertir a base64
    let photoBase64 = ''
    let photoMime = 'image/jpeg'
    if (photo) {
      try {
        const response = await fetch(photo)
        const buffer = await response.arrayBuffer()
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        photoMime = contentType.split(';')[0]
        photoBase64 = Buffer.from(buffer).toString('base64')
      } catch (e) {
        photoBase64 = ''
      }
    }

    const imageTag = photoBase64
      ? `<image href="data:${photoMime};base64,${photoBase64}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity="0.55"/>`
      : `<rect width="1200" height="630" fill="#222222"/>`

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="1200" height="630" fill="#111111"/>
  ${imageTag}
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect y="180" width="1200" height="450" fill="url(#grad)"/>
  <rect x="40" y="400" width="200" height="50" rx="8" fill="#F5A623"/>
  <text x="140" y="433" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000000" text-anchor="middle">Ver anuncio</text>
  <text x="40" y="510" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${titleSafe}</text>
  <text x="40" y="565" font-family="Arial, sans-serif" font-size="24" fill="#cccccc">Por ${userDisplay} | ${descSafe}</text>
  <text x="1160" y="50" font-family="Arial, sans-serif" font-size="20" fill="#F5A623" opacity="0.9" text-anchor="end">PIRATA MARKET</text>
</svg>`

    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(svg)
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="Pirata Market" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body></body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(html)
}
