import '../styles/globals.css';
import { ReactNode } from 'react';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'AI Sports Guru',
  description: 'Your AI-powered sports betting advisor for NFL, NBA, MLB, NHL, NCAAF, NCAAB and WNBA.'
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Persistent navigation bar */}
        <Navbar />
        {/* Main content area with max width and responsive padding */}
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
