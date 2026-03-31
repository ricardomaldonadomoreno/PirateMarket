import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

  // 👤 Usuario normal → servir React index.html
  if (!isCrawler) {
    try {
      const filePath = path.join(process.cwd(), 'dist', 'index.html')
      const html = fs.readFileSync(filePath, 'utf8')

      res.setHeader('Content-Type', 'text/html')
      return res.status(200).send(html)
    } catch (err) {
      return res.status(404).end()
    }
  }

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

    const supabaseKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: listing } = await supabase
      .from('listings')
      .select('title, description, price, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    const siteUrl = 'https://pirate-market.vercel.app'
    const pageUrl = `${siteUrl}/ficha/${slug}`

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

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${imageUrl}" />

</head>
<body></body>
</html>
`

    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)

  } catch (err) {
    console.error(err)
    return res.status(500).end()
  }
}
