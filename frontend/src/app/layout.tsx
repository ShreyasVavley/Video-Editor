import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cloud-Native Non-Linear Video Editor (NLE)',
  description: 'Self-hosted browser-based video editing platform with local FFmpeg processing core.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body
        className="h-full antialiased bg-background text-slate-100 flex flex-col"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
