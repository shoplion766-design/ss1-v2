import type { Metadata } from 'next';
import Providers from '../components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SS1 — Support Système One | Prakti Health',
  description: 'Join SS1 and build your financial freedom with premium health products and a 15-level compensation plan. Available in FR / EN / AR.',
  keywords: 'SS1, Support Système One, Prakti Health, affiliate, MLM, health, wellness, compensation plan, FCFA, Africa, Middle East',
  openGraph: {
    title: 'SS1 — Support Système One',
    description: 'A 15-level compensation plan for your financial freedom.',
    type: 'website',
    url: 'https://praktihealthhint.com',
    siteName: 'SS1 — Support Système One',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SS1 — Support Système One',
    description: 'Join thousands of SS1 members building their financial freedom today.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&family=Noto+Sans+Arabic:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="noise">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
