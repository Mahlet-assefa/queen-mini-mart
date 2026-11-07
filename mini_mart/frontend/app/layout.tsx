import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Queen Mart | Sales & Inventory',
  description: 'Queen Mart store operations dashboard',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
