import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Additional middleware logic if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes that don't require auth
        const publicRoutes = ['/', '/auth/signin', '/auth/error'];
        
        if (publicRoutes.includes(pathname)) {
          return true;
        }
        
        // Protected routes - require authentication
        const protectedRoutes = ['/dashboard', '/upload', '/clustering'];
        
        if (protectedRoutes.some(route => pathname.startsWith(route))) {
          return !!token;
        }
        
        return true;
      }
    },
    pages: {
      signIn: '/auth/signin'
    }
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};