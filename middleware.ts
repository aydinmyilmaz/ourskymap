import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LEGACY_ROUTE_PREFIXES = ['/citymap', '/vinyl', '/soundwave', '/image', '/mockup'];
const LEGACY_API_REGEX = /^\/api\/(citymap|vinyl|soundwave|image|mockup)(\/|$)/i;
const MESSAGE = 'Only OurSkyMap is active on this deployment.';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLegacyRoute = LEGACY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isLegacyApi = LEGACY_API_REGEX.test(pathname);

  if (!isLegacyRoute && !isLegacyApi) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, message: MESSAGE }, { status: 410 });
  }

  return new NextResponse(MESSAGE, {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
