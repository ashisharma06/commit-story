import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commit Story — your repo, told as a story",
  description:
    "Turn any public GitHub repository's history into a readable, terminal-style narrative.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Browser extensions can add attributes to <html> before React hydrates.
  return (
    <html
      lang="en"
      className={`${geistMono.variable} min-h-dvh antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background font-mono text-text">
        {children}
      </body>
    </html>
  );
}
