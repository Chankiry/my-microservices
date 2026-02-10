import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { KeycloakProvider } from './components/KeycloakProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Microservices Platform',
  description: 'Modern microservices-based platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <KeycloakProvider>
          {children}
        </KeycloakProvider>
      </body>
    </html>
  );
}
