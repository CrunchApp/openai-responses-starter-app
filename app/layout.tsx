import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/auth/AuthContext";
import AuthSynchronizer from "@/components/AuthSynchronizer";

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
    url: "https://app.vista-consultants.com", // Update with your actual domain when deployed
    siteName: "Vista Education Adviser",
    images: [
      {
        url: "/vista_logo.png", // Relative path works for OpenGraph
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
    images: ["/vista_logo.png"], // Relative path works for Twitter cards too
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthSynchronizer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
