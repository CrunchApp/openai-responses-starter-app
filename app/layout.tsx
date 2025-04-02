import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/auth/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import AuthSynchronizer from "@/components/AuthSynchronizer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vista Education Adviser",
  description: "AI-powered education and career advisor",
  icons: {
    icon: '/vista_logo.svg',
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
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
