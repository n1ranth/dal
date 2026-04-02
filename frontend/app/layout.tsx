import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SmoothCursor } from "@/components/smooth-cursor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dataset Dashboard",
  description: "Black and white shadcn dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothCursor />
        {children}
      </body>
    </html>
  );
}
