'use client';

import React from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { AuthProvider } from '@/app/components/auth/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
} 