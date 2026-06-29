import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "KLM AI Clinic — AI-Powered Healthcare Platform",
  description:
    "KLM AI Clinic offers an AI-powered front desk, smart appointment booking, medication reminders, WhatsApp & email support, and real-time patient dashboards. Experience next-generation digital healthcare.",
  keywords: [
    "AI healthcare",
    "clinic AI assistant",
    "appointment booking",
    "patient portal",
    "medication reminders",
    "hospital SaaS",
    "KLM AI Clinic",
  ],
  openGraph: {
    title: "KLM AI Clinic — AI-Powered Healthcare Platform",
    description:
      "Book appointments, communicate with doctors, manage medical records, and experience next-generation digital healthcare.",
    type: "website",
    locale: "en_US",
    siteName: "KLM AI Clinic",
  },
  twitter: {
    card: "summary_large_image",
    title: "KLM AI Clinic — AI-Powered Healthcare Platform",
    description:
      "Book appointments, communicate with doctors, manage medical records, and experience next-generation digital healthcare.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
