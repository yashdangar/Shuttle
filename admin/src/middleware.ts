import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const isLoginPage = request.nextUrl.pathname === '/login';

    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isLoginPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
}; 