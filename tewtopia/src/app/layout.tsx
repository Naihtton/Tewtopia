import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai_Looped, Nunito } from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

const thai = IBM_Plex_Sans_Thai_Looped({
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tewtopia',
  description: 'Connecting students and tutors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${thai.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
