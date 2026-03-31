import { NextResponse } from 'next/server'

export function middleware(req) {
  const userAgent = req.headers.get('user-agent') || ''
  const url = req.nextUrl

  const isBot =
    /facebook|whatsapp|twitter|telegram|linkedin|discord|bot|crawler|spider/i.test(
      userAgent
    )

  if (url.pathname.startsWith('/ficha/') && isBot) {
    const slug = url.pathname.replace('/ficha/', '')

    return NextResponse.rewrite(
      new URL(`/api/og?slug=${slug}`, req.url)
    )
  }

  return NextResponse.next()
}
