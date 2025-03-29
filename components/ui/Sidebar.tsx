'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Home,
  User,
  BookOpen,
  MessageSquare,
  LogOut,
  ChevronRight,
  // Settings,
  LogIn,
  Menu,
  X
} from 'lucide-react';

export function Sidebar() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/recommendations', label: 'Recommendations', icon: BookOpen },
    { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
    // { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Sidebar animations
  const sidebarVariants = {
    expanded: { width: '16rem' },
    collapsed: { width: '5rem' },
  };

  const mobileSidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: '-100%', opacity: 0 },
  };

  const contentVariants = {
    expanded: { opacity: 1, display: 'block' },
    collapsed: { opacity: 0, display: 'none', transition: { display: { delay: 0.2 } } },
  };

  // Render the sidebar content
  const renderSidebarContent = () => (
    <>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <motion.div
            initial={false}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            variants={contentVariants}
            className="font-bold text-xl ml-2"
          >
            Vista
          </motion.div>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none hidden md:block"
        >
          <ChevronRight
            className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>
        <button
          onClick={toggleMobileSidebar}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 py-2">
        {loading ? (
          <div className="flex items-center space-x-4 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center space-x-4 p-2">
            <Avatar>
              <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt={profile?.first_name || 'User'} />
              <AvatarFallback>
                {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                {profile?.last_name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <motion.div
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              variants={contentVariants}
            >
              <p className="font-medium line-clamp-1">
                {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{user.email}</p>
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center space-x-4 p-2">
            <Avatar>
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <motion.div
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              variants={contentVariants}
            >
              <p className="font-medium">Guest</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Not signed in</p>
            </motion.div>
          </div>
        )}
      </div>

      <div className="p-2 flex-1">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <motion.span
                  initial={false}
                  animate={isCollapsed ? 'collapsed' : 'expanded'}
                  variants={contentVariants}
                  className="ml-3"
                >
                  {item.label}
                </motion.span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 mt-auto">
        {user ? (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <motion.span
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              variants={contentVariants}
              className="ml-2"
            >
              Sign Out
            </motion.span>
          </Button>
        ) : (
          <Link href="/auth/login">
            <Button className="w-full flex items-center justify-center" variant="default">
              <LogIn className="h-4 w-4" />
              <motion.span
                initial={false}
                animate={isCollapsed ? 'collapsed' : 'expanded'}
                variants={contentVariants}
                className="ml-2"
              >
                Sign In
              </motion.span>
            </Button>
          </Link>
        )}
      </div>
    </>
  );

  // Render desktop and mobile versions
  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={toggleMobileSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <motion.div
        initial="expanded"
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className="hidden md:flex h-screen flex-col border-r bg-background sticky top-0 left-0"
        transition={{ duration: 0.3 }}
      >
        {renderSidebarContent()}
      </motion.div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 md:hidden"
            onClick={toggleMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileSidebarVariants}
            className="fixed top-0 left-0 z-50 md:hidden h-screen w-64 bg-background"
            transition={{ duration: 0.3 }}
          >
            {renderSidebarContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 