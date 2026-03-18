import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(400).send('Missing slug')
  }

  const userAgent = req.headers['user-agent'] || ''
  const isCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|vkshare|bot|crawler|spider|preview|opengraph|og-imageproxy/i.test(userAgent)

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: listing } = await supabase
      .from('listings')
      .select('title, description, price, currency, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    const siteUrl = `https://${req.headers.host}`
    const pageUrl = `${siteUrl}/ficha/${listing?.slug || slug}`
    const imageUrl = listing?.photos?.length > 0
      ? listing.photos[0]
      : `${siteUrl}/logo.png`
    const price = listing ? `BOB ${Number(listing.price).toLocaleString('es-BO')}` : ''
    const title = listing
      ? `${listing.title} - ${price} | Pirata Market`
      : 'Pirata Market'
    const description = listing?.description
      ? listing.description.substring(0, 150).replace(/\n/g, ' ') + '...'
      : `${price} · ${listing?.display_location || 'Santa Cruz'} · Pirata Market`

    const e = (str) => String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // Si es crawler: devolver HTML minimo solo con meta tags
    if (isCrawler) {
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${e(title)}</title>
  <meta property="og:type"         content="product" />
  <meta property="og:site_name"    content="Pirata Market" />
  <meta property="og:title"        content="${e(title)}" />
  <meta property="og:description"  content="${e(description)}" />
  <meta property="og:image"        content="${imageUrl}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"          content="${pageUrl}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image"       content="${imageUrl}" />
  <meta name="description"         content="${e(description)}" />
</head>
<body>
  <h1>${e(listing?.title || 'Pirata Market')}</h1>
  <p>${e(description)}</p>
  <img src="${imageUrl}" alt="${e(listing?.title || '')}" />
  <a href="${pageUrl}">Ver anuncio</a>
</body>
</html>`

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.status(200).send(html)
    }

    // Si es usuario normal: devolver index.html de React con base href
    const indexPath = join(process.cwd(), 'dist', 'index.html')
    let html = readFileSync(indexPath, 'utf-8')
    html = html.replace('<head>', `<head><base href="${siteUrl}/" />`)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send(html)

  } catch (err) {
    console.error('OG error:', err)
    try {
      const indexPath = join(process.cwd(), 'dist', 'index.html')
      const html = readFileSync(indexPath, 'utf-8')
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    } catch (e) {
      return res.status(500).send('Error')
    }
  }
}
