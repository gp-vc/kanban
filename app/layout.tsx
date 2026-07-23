import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GPVC Task Management',
  description: 'GPVC 구성원 전용 칸반 보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
