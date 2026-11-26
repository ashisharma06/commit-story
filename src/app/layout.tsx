import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Browser extensions can add attributes to <html> before React hydrates.
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-mono text-text">
        {children}
      </body>
    </html>
  );
}
