import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(404).end()
  }

  const userAgent = req.headers['user-agent'] || ''

  const isCrawler =
    /bot|crawler|spider|facebook|whatsapp|telegram|twitter|linkedin|discord|slack|google|bing|preview|meta|opengraph/i.test(
      userAgent
    )

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

    const supabaseKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: listing, error } = await supabase
      .from('listings')
      .select('title, description, price, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    const siteUrl = 'https://pirate-market.vercel.app'
    const pageUrl = `${siteUrl}/ficha/${slug}`

    // Usuarios normales → redirigir a React
    if (!isCrawler) {
      res.setHeader('Location', pageUrl)
      return res.status(302).end()
    }

    let imageUrl = `${siteUrl}/logo.png`

    if (listing?.photos?.length > 0) {
      imageUrl = listing.photos[0]
    }

    const price = listing
      ? `BOB ${Number(listing.price).toLocaleString('es-BO')}`
      : ''

    const title = listing
      ? `${listing.title} - ${price} | Pirata Market`
      : 'Pirata Market'

    const description = listing?.description
      ? listing.description.substring(0, 150).replace(/\n/g, ' ') + '...'
      : 'Pirata Market - Comercio sin intermediarios'

    const e = (str) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${e(title)}</title>

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Pirata Market" />
<meta property="og:title" content="${e(title)}" />
<meta property="og:description" content="${e(description)}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${pageUrl}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${e(title)}" />
<meta name="twitter:description" content="${e(description)}" />
<meta name="twitter:image" content="${imageUrl}" />

</head>
<body></body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')

    return res.status(200).send(html)

  } catch (err) {
    console.error('OG error:', err)
    return res.status(500).end()
  }
}
