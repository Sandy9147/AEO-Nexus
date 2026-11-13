import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white font-bold text-xs">
                N
              </div>
              <span className="font-bold text-slate-900 text-base">AEO Nexus</span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              The global AI-powered business operating system. Unify business context, brand identity, Answer Engine Optimization (AEO), and autonomous operations into one high-performance platform.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Production Architecture • Neon Serverless PostgreSQL</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
              Product Suite
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="hover:text-slate-900">Core Features</Link>
              </li>
              <li>
                <Link href="/apps" className="hover:text-slate-900">Apps & Tools Catalog</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-slate-900">Pricing & Plans</Link>
              </li>
              <li>
                <Link href="/apps/ai-business-agent" className="hover:text-slate-900">AI Business Agent</Link>
              </li>
              <li>
                <Link href="/apps/business-profile" className="hover:text-slate-900">Business Profile Manager</Link>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
              Solutions
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/solutions/saas" className="hover:text-slate-900">SaaS & Tech Companies</Link>
              </li>
              <li>
                <Link href="/solutions/ecommerce" className="hover:text-slate-900">Commerce & Direct-to-Consumer</Link>
              </li>
              <li>
                <Link href="/solutions/healthcare" className="hover:text-slate-900">Healthcare & Life Sciences</Link>
              </li>
              <li>
                <Link href="/agency" className="hover:text-slate-900">Agency & Partner OS</Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
              Company & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-slate-900">About AEO Nexus</Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-slate-900">Resources & Blog</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-slate-900">Contact Us</Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-slate-900">Terms of Service</Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-slate-900">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} AEO Nexus Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/legal/privacy" className="hover:text-slate-600">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-600">Terms</Link>
            <Link href="/contact" className="hover:text-slate-600">Security Inquiries</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

