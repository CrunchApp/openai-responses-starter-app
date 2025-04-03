'use client';

import React, { useState, useEffect } from 'react';
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
  X,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { gsap } from 'gsap';

export function Sidebar() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Add subtle animations to decorative elements
  useEffect(() => {
    const decorElements = document.querySelectorAll('.sidebar-decor');
    
    decorElements.forEach(el => {
      gsap.to(el, {
        y: `${Math.random() * 20 - 10}px`,
        opacity: Math.random() * 0.3 + 0.2,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);

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
    expanded: { width: '18rem' },
    collapsed: { width: '5.5rem' },
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
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="sidebar-decor absolute w-24 h-24 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/10 blur-xl"
             style={{ top: '15%', right: '-20px' }}></div>
        <div className="sidebar-decor absolute w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-primary/10 blur-xl"
             style={{ bottom: '10%', left: '-40px' }}></div>
      </div>
    
      <div className="flex items-center justify-between p-4 relative">
        <Link href="/dashboard" className="flex items-center z-10">
          <motion.div
            initial={false}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            variants={contentVariants}
          >
            <div className="p-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl">
              <Image
                src="/vista_logo.png"
                alt="Vista Logo"
                width={48}
                height={48}
                className="mr-2"
              />
            </div>
          </motion.div>
          <motion.div
            initial={false}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            variants={contentVariants}
            className="font-bold text-xl ml-2 text-primary"
          >
            {/* <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Vista
            </span> */}
          </motion.div>
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors focus:outline-none hidden md:block"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>
        <button
          onClick={toggleMobileSidebar}
          className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors focus:outline-none md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-4 relative z-10">
        {loading ? (
          <div className="flex items-center space-x-4 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center space-x-3 p-2">
            <Avatar className="border-2 border-primary/20">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url || ''} 
                alt={profile?.first_name || 'User'} 
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                {profile?.last_name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <motion.div
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              variants={contentVariants}
            >
              <p className="font-medium line-clamp-1 text-foreground">
                {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user.email}
              </p>
              <p className="text-xs text-foreground/60 line-clamp-1">{user.email}</p>
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-2">
            <Avatar className="border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">?</AvatarFallback>
            </Avatar>
            <motion.div
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              variants={contentVariants}
            >
              <p className="font-medium text-foreground">Guest</p>
              <p className="text-xs text-foreground/60">Not signed in</p>
            </motion.div>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 relative z-10">
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isHovered = hoveredItem === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center py-2.5 px-3 rounded-lg transition-all duration-300 relative overflow-hidden
                    ${active
                      ? 'text-primary-foreground'
                      : 'text-foreground hover:text-primary'
                    }
                  `}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Background that animates on hover or when active */}
                  <motion.div 
                    className={`absolute inset-0 rounded-lg z-0 ${
                      active 
                        ? 'bg-gradient-to-r from-primary to-primary/90'
                        : 'bg-primary/10'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: active || isHovered ? 1 : 0,
                      scale: active || isHovered ? 1 : 0.9,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                  
                  {/* Icon wrapper with subtle animation */}
                  <div className="relative z-10">
                    <item.icon className={`h-5 w-5 transition-transform duration-300 ${active || isHovered ? 'scale-110' : 'scale-100'}`} />
                  </div>
                  
                  <motion.span
                    initial={false}
                    animate={isCollapsed ? 'collapsed' : 'expanded'}
                    variants={contentVariants}
                    className="ml-3 font-medium relative z-10"
                  >
                    {item.label}
                  </motion.span>
                  
                  {/* Show a sparkle on active item */}
                  {active && !isCollapsed && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto relative z-10"
                    >
                      <Sparkles className="h-4 w-4 text-primary-foreground opacity-70" />
                    </motion.div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 mt-auto relative z-10">
        {user ? (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center border-primary/20 hover:bg-primary/10 group"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 text-primary group-hover:text-primary-foreground group-hover:scale-110 transition-transform duration-300" />
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
            <Button 
              className="w-full flex items-center justify-center bg-gradient-to-r from-primary to-primary/90 group"
              variant="default"
            >
              <LogIn className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
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
        <Button 
          size="icon" 
          className="bg-gradient-to-r from-primary/90 to-primary text-white shadow-md hover:shadow-lg hover:from-primary hover:to-primary"
          onClick={toggleMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <motion.div
        initial="expanded"
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className="hidden md:flex h-screen flex-col border-r border-primary/10 bg-gradient-to-b from-background to-background/90 backdrop-blur-sm sticky top-0 left-0 z-20"
        transition={{ duration: 0.3, ease: "easeInOut" }}
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
            className="fixed top-0 left-0 z-50 md:hidden h-screen w-72 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm shadow-xl"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderSidebarContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 