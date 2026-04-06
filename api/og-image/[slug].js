import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const slug = req.url.split('/api/og-image/')[1]?.split('?')[0]

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
  const photo = listing?.photos?.[0] || `${siteUrl}/logo.png`
  const title = listing ? `${listing.title} - BOB ${listing.price}` : 'Pirata Market'
  const description = listing?.description || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
          backgroundColor: '#111',
        }}
      >
        {/* Foto de fondo */}
        <img
          src={photo}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0.6,
          }}
        />

        {/* Overlay degradado */}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '60%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          }}
        />

        {/* Badge "Read More" estilo imagen 2 */}
        <div
          style={{
            position: 'absolute',
            bottom: '160px',
            left: '40px',
            background: '#F5A623',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '28px',
            padding: '10px 28px',
            borderRadius: '8px',
          }}
        >
          Ver anuncio →
        </div>

        {/* Título */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '40px',
            right: '40px',
            color: 'white',
            fontSize: '52px',
            fontWeight: 'bold',
            lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </div>

        {/* Descripción */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '40px',
            right: '40px',
            color: '#ccc',
            fontSize: '28px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {description.slice(0, 80)}
        </div>

        {/* Logo/branding */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '40px',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            opacity: 0.8,
          }}
        >
          🏴‍☠️ pirate-market.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
