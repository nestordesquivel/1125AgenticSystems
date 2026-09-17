import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://global-energy-atlas.wise-pike-0684.chatgpt.site'),
  title: 'Global Energy Atlas',
  description:
    'Executive comparison of energy consumption, electricity prices, energy mix, production and trade across 15 major markets.',
  openGraph: {
    title: 'Global Energy Atlas',
    description: '15 markets · Consumption, prices, energy mix & trade',
    type: 'website',
    url: 'https://global-energy-atlas.wise-pike-0684.chatgpt.site',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Global Energy Atlas — 15 markets, consumption, prices, energy mix and trade' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Energy Atlas',
    description: '15 markets · Consumption, prices, energy mix & trade',
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
