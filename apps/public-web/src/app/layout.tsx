import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AEO Nexus — Global AI-Powered Business Operating System',
  description:
    'Unify workflows, intelligent autonomous agents, customer telemetry, and agency operations in a single operating system.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F7F9FC] text-[#1E293B] antialiased">{children}</body>
    </html>
  );
}
