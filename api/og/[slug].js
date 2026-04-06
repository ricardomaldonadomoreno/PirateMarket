import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

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

  // Si viene ?img=1 devuelve la imagen PNG diseñada
  if (img === '1') {
    return new ImageResponse(
      (
        <div style={{
          width: '1200px', height: '630px',
          display: 'flex', position: 'relative',
          backgroundColor: '#111', overflow: 'hidden',
        }}>
          <img src={photo} style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '65%', display: 'flex',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '160px', left: '40px',
            background: '#F5A623', color: '#000',
            fontWeight: 'bold', fontSize: '28px',
            padding: '10px 28px', borderRadius: '8px', display: 'flex',
          }}>
            Ver anuncio →
          </div>
          <div style={{
            position: 'absolute', bottom: '75px',
            left: '40px', right: '40px',
            color: 'white', fontSize: '50px', fontWeight: 'bold',
            display: 'flex',
          }}>
            {title.slice(0, 45)}
          </div>
          <div style={{
            position: 'absolute', bottom: '28px',
            left: '40px', right: '40px',
            color: '#ccc', fontSize: '26px', display: 'flex',
          }}>
            {description.slice(0, 80)}
          </div>
          <div style={{
            position: 'absolute', top: '28px', right: '40px',
            color: 'white', fontSize: '22px', opacity: 0.8, display: 'flex',
          }}>
            🏴‍☠️ pirate-market.vercel.app
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const userAgent = req.headers['user-agent'] || ''
  const isBot = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|bot|crawler|spider/i.test(userAgent)

  // Si es bot devuelve HTML con metatags
  if (isBot) {
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
    return res.status(200).send(html)
  }

  // Si es usuario normal devuelve el index.html de React
  const fs = await import('fs')
  const path = await import('path')
  const indexPath = path.join(process.cwd(), 'index.html')
  const indexHtml = fs.readFileSync(indexPath, 'utf8')
  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(indexHtml)
}
