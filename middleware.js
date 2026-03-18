import { createClient } from '@supabase/supabase-js'

export const config = {
  matcher: '/ficha/:slug*',
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const slug = url.pathname.replace('/ficha/', '')

  // Solo interceptar si es un bot/crawler (WhatsApp, Telegram, Facebook, etc.)
  const userAgent = request.headers.get('user-agent') || ''
  const isCrawler = /whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot/i.test(userAgent)

  // Si no es un crawler, dejar pasar normal a React
  if (!isCrawler) {
    return undefined
  }

  // Es un crawler — buscar el anuncio en Supabase y devolver HTML con meta tags
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: listing } = await supabase
      .from('listings')
      .select('title, description, price, currency, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (!listing) {
      return undefined // No encontrado, dejar pasar a React
    }

    const siteUrl = `https://${request.headers.get('host')}`
    const pageUrl = `${siteUrl}/ficha/${listing.slug}`
    const imageUrl = listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : `${siteUrl}/logo.png`

    const price = `BOB ${Number(listing.price).toLocaleString('es-BO')}`
    const title = `${listing.title} - ${price} | Pirata Market`
    const description = listing.description
      ? listing.description.substring(0, 150).replace(/\n/g, ' ') + '...'
      : `${price} · ${listing.display_location || 'Santa Cruz'} · Pirata Market`

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph - WhatsApp, Facebook, Telegram, LinkedIn -->
  <meta property="og:type"          content="product" />
  <meta property="og:site_name"     content="Pirata Market" />
  <meta property="og:title"         content="${escapeHtml(title)}" />
  <meta property="og:description"   content="${escapeHtml(description)}" />
  <meta property="og:image"         content="${imageUrl}" />
  <meta property="og:image:width"   content="1200" />
  <meta property="og:image:height"  content="630" />
  <meta property="og:url"           content="${pageUrl}" />

  <!-- Twitter Card -->
  <meta name="twitter:card"         content="summary_large_image" />
  <meta name="twitter:title"        content="${escapeHtml(title)}" />
  <meta name="twitter:description"  content="${escapeHtml(description)}" />
  <meta name="twitter:image"        content="${imageUrl}" />

  <!-- Meta general -->
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Redirigir al usuario real a la SPA -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${pageUrl}">${escapeHtml(listing.title)}</a>...</p>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // cache 1 hora
      },
    })

  } catch (error) {
    console.error('OG middleware error:', error)
    return undefined // Si falla, dejar pasar a React normal
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
