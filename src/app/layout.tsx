import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "North Sea Surf School",
  description: "Kurse, Verleih und Sessions an der Nordsee buchen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${outfit.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
