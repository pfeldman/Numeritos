import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Numeritos',
  description: 'Juego de lógica: adiviná los 4 numeritos secretos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
