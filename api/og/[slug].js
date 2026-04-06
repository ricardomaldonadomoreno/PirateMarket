import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export default async function handler(req, res) {
  const { slug, img } = req.query
  const siteUrl = 'https://pirate-market.vercel.app'

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, photos, description')
    .eq('slug', slug)
    .single()

  const photo = listing?.photos?.[0] || `${siteUrl}/logo.png`
  const title = listing ? `${listing.title} - BOB ${listing.price}` : 'Pirata Market'
  const description = listing?.description || ''
  const pageUrl = `${siteUrl}/ficha/${slug}`
  const imageUrl = `${siteUrl}/api/og/${slug}?img=1`

  if (img === '1') {
    const titleSafe = title.slice(0, 45).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const descSafe = description.slice(0, 80).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="1200" height="630" fill="#111111"/>
  <image href="${photo}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity="0.55"/>
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect y="200" width="1200" height="430" fill="url(#grad)"/>
  <rect x="40" y="390" width="220" height="55" rx="8" fill="#F5A623"/>
  <text x="150" y="425" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">Ver anuncio</text>
  <text x="40" y="510" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">${titleSafe}</text>
  <text x="40" y="570" font-family="Arial, sans-serif" font-size="26" fill="#cccccc">${descSafe}</text>
  <text x="1160" y="50" font-family="Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.8" text-anchor="end">pirate-market.vercel.app</text>
</svg>`

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 's-maxage=3600')
    return res.status(200).send(png)
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
  res.setHeader('Cache-Control', 's-maxage=3600')
  res.status(200).send(html)
}
