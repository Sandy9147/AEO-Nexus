'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@aeo-nexus/ui';

const NAV_LINKS = [
  { name: 'Features', href: '/features' },
  { name: 'Apps & Tools', href: '/apps' },
  { name: 'Solutions', href: '/solutions' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'For Agencies', href: '/agency' },
  { name: 'Resources', href: '/resources' },
  { name: 'About', href: '/about' },
];

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              AEO Nexus
            </span>
            <span className="text-[10px] font-semibold text-[#3563F6] uppercase tracking-wider">
              Business OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[#3563F6] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm" className="text-xs">
              Get Started Free →
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-6 space-y-4 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button variant="primary" className="w-full text-xs">
                Get Started Free →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

