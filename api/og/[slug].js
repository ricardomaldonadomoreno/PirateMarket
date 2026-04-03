import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  const { slug } = req.query

  // 🔍 Detectar el User-Agent
  const userAgent = req.headers['user-agent'] || ''

  // 🤖 Detectar si es un bot/crawler de redes sociales
  const isBot = /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|discord|slackbot|googlebot|bingbot|prerender/i.test(userAgent)

  // 👤 Si es usuario NORMAL → redirigir a la app React
  if (!isBot) {
    try {
      // Leer el index.html de React compilado
      const htmlPath = path.join(__dirname, '..', '..', 'dist', 'index.html')
      const html = fs.readFileSync(htmlPath, 'utf8')
      
      res.setHeader('Content-Type', 'text/html')
      return res.status(200).send(html)
    } catch (err) {
      console.error('Error leyendo index.html:', err)
      // Si falla, redirigir al home
      return res.redirect(302, '/')
    }
  }

  // 🤖 Si es BOT → generar HTML con meta tags
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, photos, description')
    .eq('slug', slug)
    .single()

  const siteUrl = 'https://pirata-market.vercel.app'
  const pageUrl = `${siteUrl}/ficha/${slug}`

  const image = listing?.photos?.[0] || `${siteUrl}/logo.png`

  const title = listing?.title 
    ? `${listing.title} - BOB ${listing.price}` 
    : 'Pirata Market'

  const description = listing?.description || 'Comercio sin intermediarios'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />

<title>${title}</title>

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />

</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${image}" alt="${title}" style="max-width:100%;height:auto;" />
</body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  res.status(200).send(html)
}
