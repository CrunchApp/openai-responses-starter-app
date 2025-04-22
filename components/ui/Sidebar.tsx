'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import AvatarSelector from '@/components/profile/AvatarSelector';
import {
  Home,
  User,
  BookOpen,
  GraduationCap,
  LogOut,
  ChevronRight,
  // Settings,
  LogIn,
  Menu,
  X,
  Sparkles,
  Camera
} from 'lucide-react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useToast } from '@/hooks/use-toast';

export function Sidebar() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

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
    // Prevent multiple sign-out clicks
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Reset the sign-out state to allow retry
      setIsSigningOut(false);
    }
  };

  const openAvatarSelector = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to customize your avatar",
        variant: "destructive"
      });
      return;
    }
    setIsAvatarSelectorOpen(true);
  };

  const closeAvatarSelector = () => {
    setIsAvatarSelectorOpen(false);
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/recommendations', label: 'Recommendations', icon: BookOpen },
    { href: '/chat', label: 'Vista Assistant', icon: GraduationCap },
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
                width={96}
                height={96}
                className="mr"
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
          <div className={`flex items-center p-2 transition-all duration-300 ${isCollapsed ? 'flex-col space-y-2 justify-center' : 'space-x-4'}`}>
            <div className="relative group">
              <Avatar 
                className={`border-2 border-primary/20 cursor-pointer group-hover:border-primary transition-all duration-300 ${isCollapsed ? 'h-16 w-16' : 'h-24 w-24'}`}
                onClick={openAvatarSelector}
              >
                <AvatarImage 
                  src={user?.user_metadata?.avatar_url || ''} 
                  alt={profile?.first_name || 'User'} 
                />
                <AvatarFallback 
                  className={`bg-gradient-to-br from-primary/20 to-primary/10 text-primary transition-all duration-300 ${isCollapsed ? 'text-sm' : 'text-3xl'}`}
                >
                  {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  {profile?.last_name?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera icon overlay on hover */}
              <div 
                className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                onClick={openAvatarSelector}
              >
                <Camera className={`text-white transition-all duration-300 ${isCollapsed ? 'h-4 w-4' : 'h-7 w-7'}`} />
              </div>
            </div>
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
          <div className={`flex items-center p-2 transition-all duration-300 ${isCollapsed ? 'flex-col space-y-2' : 'space-x-4'}`}>
            <Avatar 
              className={`border-2 border-primary/20 transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-24 w-24'}`}
            >
              <AvatarFallback 
                className={`bg-gradient-to-br from-primary/20 to-primary/10 text-primary transition-all duration-300 ${isCollapsed ? 'text-sm' : 'text-3xl'}`}
              >?</AvatarFallback>
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
                    ${isCollapsed ? 'justify-center' : ''}
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
            className={`w-full flex items-center border-primary/20 hover:bg-primary/10 group transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <motion.span
                  initial={false}
                  animate={isCollapsed ? 'collapsed' : 'expanded'}
                  variants={contentVariants}
                >
                  Signing Out...
                </motion.span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 text-primary group-hover:text-primary-foreground group-hover:scale-110 transition-transform duration-300" />
                <motion.span
                  initial={false}
                  animate={isCollapsed ? 'collapsed' : 'expanded'}
                  variants={contentVariants}
                  className="ml-2"
                >
                  Sign Out
                </motion.span>
              </>
            )}
          </Button>
        ) : (
          <Link href="/auth/login">
            <Button 
              className={`w-full flex items-center bg-gradient-to-r from-primary to-primary/90 group transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
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

      {/* Avatar Selector Modal */}
      <AvatarSelector 
        isOpen={isAvatarSelectorOpen} 
        onClose={closeAvatarSelector} 
      />
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