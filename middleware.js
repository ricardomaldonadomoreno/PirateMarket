export default function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";
  const url = new URL(request.url);

  const isBot =
    /facebook|whatsapp|twitter|telegram|linkedin|discord|bot|crawler|spider/i.test(
      userAgent
    );

  if (url.pathname.startsWith("/ficha/") && isBot) {
    const slug = url.pathname.replace("/ficha/", "");

    return Response.rewrite(
      `${url.origin}/api/og?slug=${slug}`
    );
  }

  return;
}

export const config = {
  matcher: ["/ficha/:path*"]
};
