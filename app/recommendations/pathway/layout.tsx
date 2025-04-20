'use client'

import React from 'react'
import { useAuth } from '@/app/components/auth/AuthContext'
import { AuthenticatedLayout } from '@/components/layouts/AuthenticatedLayout'
import { GuestLayout } from '@/components/layouts/GuestLayout'
import HydrationLoading from '../../../components/ui/hydration-loading'

interface PathwayLayoutProps {
  children: React.ReactNode
}

export default function PathwayLayout({ children }: PathwayLayoutProps) {
  const { user, loading } = useAuth()

  if (loading) {
    // Use the HydrationLoading component for a consistent loading experience
    return <HydrationLoading />
  }

  if (user) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>
  }

  // Although middleware should protect this, render GuestLayout as a fallback
  // or if you intend guests to see some version of this page.
  // If this page should *never* be seen by guests, you might redirect or show an error here.
  return <GuestLayout>{children}</GuestLayout>
} 