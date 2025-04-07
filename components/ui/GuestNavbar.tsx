'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageSquare, LogIn } from 'lucide-react';
import Image from 'next/image';

export function GuestNavbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center mr-8">
              <Image
                src="/vista_logo.png"
                alt="Vista Logo"
                width={96}
                height={96}
                className="mr-2"
              />
            </Link>
            
            <nav className="hidden md:flex items-center space-x-4">
              <Link 
                href="/recommendations" 
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive('/recommendations')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Recommendations
              </Link>
              <Link 
                href="/chat" 
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive('/chat')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Assistant
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            {/* <Link href="/auth/signup">
              <Button size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
            </Link> */}
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="flex md:hidden mt-2 border-t pt-2">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Link 
              href="/recommendations"
              className={`flex justify-center items-center px-3 py-2 rounded-md text-sm ${
                isActive('/recommendations')
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-muted'
              }`}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Recommendations
            </Link>
            <Link 
              href="/chat"
              className={`flex justify-center items-center px-3 py-2 rounded-md text-sm ${
                isActive('/chat')
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-muted'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Assistant
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 