'use client';

import React from 'react';
import Link from 'next/link';
import { Linkedin, Instagram, Twitter } from 'lucide-react';

const VistaFooter = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="relative z-50 bg-background border-t border-border/40 py-10 mt-auto shadow-lg">
      <div className="container mx-auto px-4 text-sm text-muted-foreground">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-10">
          {/* About/Main Site */}
          <div className="md:w-1/4 mb-6 md:mb-0">
            <h3 className="font-bold text-lg text-primary mb-3">Vista Consultants</h3>
            <p className="mb-4 text-foreground/80">
              Expert guidance in education, career, finance, and business.
            </p>
            <Link href="https://www.vista-consultants.com" target="_blank" rel="noopener noreferrer" className="inline-block text-primary font-medium hover:underline">
              Visit Main Site →
            </Link>
          </div>

          {/* App Links */}
          <div className="md:w-1/4 mb-6 md:mb-0">
            <h3 className="font-bold text-lg text-primary mb-3">Vista Education Adviser</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Notice</Link></li>
            </ul>
          </div>

          {/* Explore */}
          <div className="md:w-1/4 mb-6 md:mb-0">
            <h3 className="font-bold text-lg text-primary mb-3">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="https://www.vista-consultants.com/services" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Our Services</Link></li>
              <li><Link href="https://www.vista-consultants.com/contact" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="md:w-1/4 flex flex-col items-start">
            <h3 className="font-bold text-lg text-primary mb-3">Connect with Us</h3>
            <div className="flex gap-4 mt-1">
              <Link href="https://www.linkedin.com/company/vista-consultaning/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-primary transition-colors">
                <Linkedin className="h-6 w-6" />
              </Link>
              <span className="text-muted-foreground/60 cursor-not-allowed" aria-label="Instagram (coming soon)">
                <Instagram className="h-6 w-6 opacity-60" />
              </span>
              <span className="text-muted-foreground/60 cursor-not-allowed" aria-label="X (coming soon)">
                <Twitter className="h-6 w-6 opacity-60" />
              </span>
            </div>
            <span className="mt-3 text-xs text-muted-foreground/70">More social channels coming soon</span>
          </div>
        </div>
        <div className="mt-10 border-t border-border/30 pt-6 text-center text-xs text-muted-foreground">
          &copy; {currentYear} Vista Global Consultants Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default VistaFooter; 