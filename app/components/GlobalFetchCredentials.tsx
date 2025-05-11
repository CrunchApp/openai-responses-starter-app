'use client'

import { useEffect } from 'react';

export default function GlobalFetchCredentials() {
  useEffect(() => {
    // Monkey-patch window.fetch to always include credentials for cookie-based auth
    const originalFetch = window.fetch;
    window.fetch = (input, init = {}) => {
      return originalFetch(input, { credentials: 'include', ...init });
    };
  }, []);

  return null;
} 