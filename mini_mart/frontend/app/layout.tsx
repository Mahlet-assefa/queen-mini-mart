import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Kim Mart | Sales & Inventory',
  description: 'Kim Mart store operations dashboard',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
