import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boss St. Elo Leaderboard',
  description: 'Apartment Elo rankings and matchup odds tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-pink-50 text-pink-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}