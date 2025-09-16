import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refreshAccessToken(token: any) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      })

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.log(error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
          ].join(' '),
          access_type: "offline",
          prompt: "consent",
        }
      }
    })
  ],
  callbacks: {
    async signIn() {
      return true; 
    },
    async jwt({ token, account, user }) {
      console.log('🔧 JWT callback - token:', !!token, 'account:', !!account, 'user:', !!user);
      
      // Initial sign in
      if (account && user) {
        console.log('🔧 Initial sign in - user data:', {
          id: user.id,
          email: user.email,
          name: user.name
        });
        
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          }
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        console.log('🔧 Token still valid, returning existing token');
        return token
      }

      console.log('🔧 Token expired, refreshing...');
      // Access token has expired, try to update it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      console.log('🔧 Session callback - token user:', !!token?.user, 'session user:', !!session?.user);
      
      if (token) {
        // Make sure user data is properly passed to session
        session.user = token.user as any
        session.accessToken = token.accessToken as string
        session.error = token.error as string
      }

      console.log('🔧 Final session:', {
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        hasAccessToken: !!session?.accessToken
      });

      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  debug: true, 
  session: {
    strategy: 'jwt' 
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };