import { NextResponse } from 'next/server'

// /admin и вложенные пути отдаются как единственный маршрут витрины /,
// адресная строка остаётся /admin — вход в админку прямым набором в браузере.
// Next.js 16: соглашение proxy (бывший middleware)

const proxy = (request) => {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}

export default proxy
