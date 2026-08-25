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
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        {children}
      </body>
    </html>
  );
}