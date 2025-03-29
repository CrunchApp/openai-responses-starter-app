'use client';

import React from 'react';
import { GuestNavbar } from '@/components/ui/GuestNavbar';

interface GuestLayoutProps {
  children: React.ReactNode;
}

export function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <GuestNavbar />
      <main>
        {children}
      </main>
    </div>
  );
} 