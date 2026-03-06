import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { LiveAlertsProvider } from "@/components/LiveAlertsProvider";
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
  title: "Jhol Khol - Government Transparency Platform",
  description: "Track government schemes, report irregularities, and ensure accountability in governance. Empowering citizens with transparency.",
  keywords: ["government transparency", "public schemes", "accountability", "corruption reporting", "civic tech"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LiveAlertsProvider>
          {children}
          <Toaster richColors position="top-right" expand={true} />
        </LiveAlertsProvider>
      </body>
    </html>
  );
}
