import React from 'react';
import { PublicHeader } from '../../../components/layout/public-header';
import { PublicFooter } from '../../../components/layout/public-footer';

export const metadata = {
  title: 'Privacy Policy — AEO Nexus Global Business OS',
  description: 'How AEO Nexus collects, stores, protects, and isolates your business data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="space-y-2 pb-4 border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
            Data Governance
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Effective Date: November 13, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When you register and operate workspaces on AEO Nexus, we collect identity information (first name, last name, work email address), business context (organization name, legal entity data, industry vertical, and company size), brand tokens (color palettes and editorial voice), and session metadata (IP address and browser user-agent).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Cryptographic Security & Password Storage</h2>
            <p>
              We enforce strict industry-leading cryptographic standards. Passwords are never stored in plaintext and are hashed using Bcrypt with 12 salt rounds. Refresh tokens and verification tokens are never stored in raw form; only one-way SHA-256 hashes are persisted in our PostgreSQL databases.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Multi-Tenant Database Isolation</h2>
            <p>
              Customer relational data is hosted in segregated tables on Neon Serverless PostgreSQL with encrypted connections (TLS 1.3). Cross-workspace queries are strictly rejected by foreign key validation and server-side authorization guards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Third-Party Sharing</h2>
            <p>
              We do not sell, rent, or monetize your company data, brand tokens, or client rosters. Data is processed solely to execute the requested operating system workflows, background BullMQ queues, and answer engine citation telemetry.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Data Retention & Deletion Rights</h2>
            <p>
              Workspace owners may request complete export or permanent deletion of their tenant database records and associated audit logs by contacting security@aeonexus.com.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

