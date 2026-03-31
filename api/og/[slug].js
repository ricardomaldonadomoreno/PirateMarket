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
  const pageUrl = `${siteUrl}/ficha/${slug}`

  const image = listing?.photos?.[0] || `${siteUrl}/logo.png`

  const title = `${listing.title} - BOB ${listing.price}`

  const html = `
<!DOCTYPE html>
<html>
<head>

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${listing.description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${pageUrl}" />

<meta name="twitter:card" content="summary_large_image" />

</head>
<body></body>
</html>
`

  res.setHeader('Content-Type', 'text/html')
  res.status(200).send(html)
}
