import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  const { slug } = req.query

  if (!slug) {
    return res.status(404).send('Not found')
  }

  const userAgent = req.headers['user-agent'] || ''

  // 🤖 Detectar si es un bot/crawler de redes sociales
  const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|discord|slackbot|google/i.test(userAgent)

  // 👤 Si es usuario normal → servir React app
  if (!isCrawler) {
    try {
      const htmlPath = path.join(__dirname, '..', 'dist', 'index.html')
      const html = fs.readFileSync(htmlPath, 'utf8')
      
      res.setHeader('Content-Type', 'text/html')
      return res.status(200).send(html)
    } catch (err) {
      console.error('Error reading index.html:', err)
      return res.status(500).send('Error loading page')
    }
  }

  // 🤖 Si es bot → generar HTML con OG tags
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).send('Server configuration error')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener datos del listing
    const { data: listing, error } = await supabase
      .from('listings')
      .select('title, description, price, photos')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
    }

    const siteUrl = 'https://pirate-market.vercel.app'
    const pageUrl = `${siteUrl}/ficha/${slug}`

    // Valores por defecto si no se encuentra el listing
    let imageUrl = `${siteUrl}/logo.png`
    let title = 'Pirata Market - Comercio sin intermediarios'
    let description = 'Compra y vende sin comisiones'
    let priceText = ''

    if (listing) {
      // Usar la primera foto si existe
      if (listing.photos && listing.photos.length > 0) {
        imageUrl = listing.photos[0]
      }

      // Formatear precio
      priceText = listing.price ? `BOB ${Number(listing.price).toLocaleString('es-BO')}` : ''

      // Título con precio
      title = `${listing.title}${priceText ? ' - ' + priceText : ''} | Pirata Market`

      // Descripción corta
      if (listing.description) {
        description = listing.description
          .substring(0, 150)
          .replace(/\n/g, ' ')
          .trim() + '...'
      }
    }

    // HTML con meta tags para bots
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <title>${title}</title>
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${pageUrl}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Meta tags estándar -->
  <meta name="description" content="${description}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  ${priceText ? `<p>Precio: ${priceText}</p>` : ''}
  <img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto;" />
  <p><a href="${pageUrl}">Ver producto en Pirata Market</a></p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).send(html)

  } catch (err) {
    console.error('Error in OG handler:', err)
    return res.status(500).send('Server error')
  }
}
