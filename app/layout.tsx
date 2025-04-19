import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/auth/AuthContext";
import AuthSynchronizer from "@/components/AuthSynchronizer";
import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vista Education Adviser",
  description: "AI-powered education and career advisor",
  icons: {
    icon: '/vista_logo.png',
  },
  openGraph: {
    title: "Vista Education Adviser",
    description: "AI-powered education and career advisor",
    url: "https://app.vista-consultants.com",
    siteName: "Vista Education Adviser",
    images: [
      {
        url: "/vista_logo.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vista Education Adviser",
    description: "AI-powered education and career advisor",
    images: ["/vista_logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex flex-col min-h-full`}>
        <AuthProvider>
          <AuthSynchronizer />
          <I18nProvider>
            <main className="flex-grow">
              {children}
            </main>
          </I18nProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
