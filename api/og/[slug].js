import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || ''
  const isBot = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|bot|crawler|spider/i.test(userAgent)

  const { slug } = req.query
  const siteUrl = 'https://pirate-market.vercel.app'

  // Si NO es bot, redirigir a la app React normal
  if (!isBot) {
    res.redirect(302, `${siteUrl}/ficha/${slug}#app`)
    return
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, photos, description')
    .eq('slug', slug)
    .single()

  const pageUrl = `${siteUrl}/ficha/${slug}`
  const image = listing?.photos?.[0] || `${siteUrl}/logo.png`
  const title = listing
    ? `${listing.title} - BOB ${listing.price}`
    : 'Pirata Market'
  const description = listing?.description
    || 'Compra y vende sin comisiones en Pirata Market.'

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="Pirata Market" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body></body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Cache-Control', 's-maxage=3600')
  res.status(200).send(html)
}
