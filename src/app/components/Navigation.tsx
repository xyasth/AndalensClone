'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Home, 
  Brain, 
  Upload,
  Database,
  FolderOpen,
  User,
  LogOut,
  LogIn
} from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navItems = [
    { href: '/', label: 'Home', icon: Home, public: true },
    { href: '/dashboard', label: 'Dashboard', icon: FolderOpen, protected: true },
    { href: '/upload', label: 'Upload', icon: Upload, protected: true },
  ];

  // Hide navigation on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Database className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">PhotoCluster AI</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation Items */}
            {navItems.map((item) => {
              // Show public routes to everyone, protected routes only to authenticated users
              if (item.protected && !session) return null;
              
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname?.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Auth Section */}
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
              {status === 'loading' ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              ) : session ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="w-8 h-8 p-1 bg-gray-200 rounded-full" />
                    )}
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                      {session.user?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:block">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;