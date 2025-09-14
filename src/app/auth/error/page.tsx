'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Not Linked',
          description: 'This email address is already associated with another account. Please sign in using your original method, or contact support if you need help linking accounts.',
          suggestion: 'Try clearing your browser data or use a different email address.'
        };
      case 'OAuthCallback':
        return {
          title: 'OAuth Callback Error',
          description: 'There was an error during the authentication process.',
          suggestion: 'Please try signing in again.'
        };
      case 'OAuthCreateAccount':
        return {
          title: 'Account Creation Error',
          description: 'We were unable to create your account.',
          suggestion: 'Please try again or contact support.'
        };
      case 'EmailCreateAccount':
        return {
          title: 'Email Account Creation Error',
          description: 'We were unable to create an account with your email.',
          suggestion: 'Please check your email address and try again.'
        };
      case 'Callback':
        return {
          title: 'Callback Error',
          description: 'There was an error in the authentication callback.',
          suggestion: 'Please try signing in again.'
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth Sign In Error',
          description: 'There was an error signing in with your OAuth provider.',
          suggestion: 'Please try again or use a different sign in method.'
        };
      case 'EmailSignin':
        return {
          title: 'Email Sign In Error',
          description: 'There was an error sending the sign in email.',
          suggestion: 'Please check your email address and try again.'
        };
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          description: 'The credentials you provided are incorrect.',
          suggestion: 'Please check your username and password.'
        };
      case 'SessionRequired':
        return {
          title: 'Session Required',
          description: 'You must be signed in to access this page.',
          suggestion: 'Please sign in to continue.'
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'An unknown error occurred during authentication.',
          suggestion: 'Please try again or contact support if the issue persists.'
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorInfo.title}</h1>
          <p className="text-gray-600 mb-4">{errorInfo.description}</p>
          <p className="text-sm text-gray-500 mb-6">{errorInfo.suggestion}</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-500">Error code: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}