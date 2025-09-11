import './globals.css';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Photo Clustering Gallery',
  description: 'Intelligent photo organization using face recognition and clustering',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}