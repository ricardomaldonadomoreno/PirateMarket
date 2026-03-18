import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(400).send('Missing slug')
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    const { data: listing, error } = await supabase
      .from('listings')
      .select('title, description, price, currency, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error || !listing) {
      return res.redirect(302, `/ficha/${slug}`)
    }

    const siteUrl = `https://${req.headers.host}`
    const pageUrl = `${siteUrl}/ficha/${listing.slug}`
    const imageUrl = listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : `${siteUrl}/logo.png`

    const price = `BOB ${Number(listing.price).toLocaleString('es-BO')}`
    const title = `${listing.title} - ${price} | Pirata Market`
    const description = listing.description
      ? listing.description.substring(0, 150).replace(/\n/g, ' ') + '...'
      : `${price} · ${listing.display_location || 'Santa Cruz'} · Pirata Market`

    const e = (str) => String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
  <meta http-equiv="refresh"       content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${pageUrl}">${e(listing.title)}</a>...</p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).send(html)

  } catch (err) {
    console.error('OG error:', err)
    return res.redirect(302, `/ficha/${slug}`)
  }
}
