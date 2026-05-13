import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "askmehire",
  description: "AI-powered resume intelligence operating system",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
