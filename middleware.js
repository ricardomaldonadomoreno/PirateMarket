import { createClient } from '@supabase/supabase-js'

export const config = {
  matcher: '/ficha/:slug*',
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const slug = url.pathname.replace('/ficha/', '').split('?')[0]

  const userAgent = request.headers.get('user-agent') || ''

  // Lista ampliada de crawlers
  const isCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|vkshare|bot|crawler|spider|preview/i.test(userAgent)

  if (!isCrawler) return undefined

  try {
    // ⚠️ Edge Functions usan SUPABASE_URL sin prefijo VITE_
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars in middleware')
      return undefined
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: listing, error } = await supabase
      .from('listings')
      .select('title, description, price, currency, photos, slug, display_location')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error || !listing) {
      console.error('Listing not found:', slug, error)
      return undefined
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
  <meta property="og:type"         content="product" />
  <meta property="og:site_name"    content="Pirata Market" />
  <meta property="og:title"        content="${escapeHtml(title)}" />
  <meta property="og:description"  content="${escapeHtml(description)}" />
  <meta property="og:image"        content="${imageUrl}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"          content="${pageUrl}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image"       content="${imageUrl}" />
  <meta name="description"         content="${escapeHtml(description)}" />
  <meta http-equiv="refresh"       content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${pageUrl}">${escapeHtml(listing.title)}</a>...</p>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('Middleware error:', error)
    return undefined
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
