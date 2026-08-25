import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://malilion.github.io/The-Nocturne-Atlas/'),
  title: 'The Nocturne Atlas — Procedural Arcane Realms',
  description: 'Explore an original moonlit wizarding world generated from a single seed.',
  openGraph: {
    title: 'The Nocturne Atlas',
    description: 'Procedural arcane realms generated from a single seed.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Nocturne Atlas moonlit castle' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Nocturne Atlas',
    description: 'Procedural arcane realms generated from a single seed.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
