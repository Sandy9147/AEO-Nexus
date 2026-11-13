import React from 'react';
import { PublicHeader } from '../../../components/layout/public-header';
import { PublicFooter } from '../../../components/layout/public-footer';

export const metadata = {
  title: 'Terms of Service — AEO Nexus Global Business OS',
  description: 'Terms and conditions governing the use of the AEO Nexus business operating system.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="space-y-2 pb-4 border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3563F6]">
            Legal Agreement
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
          <p className="text-xs text-slate-500">Effective Date: November 13, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing, registering for, or using the AEO Nexus business operating system (&quot;Platform&quot; or &quot;Service&quot;), provided by AEO Nexus Technologies Inc., you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or other legal entity, you represent that you hold the authority to bind such entity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Central Identity & Account Responsibilities</h2>
            <p>
              You must provide accurate, complete information when creating a user account. You are solely responsible for maintaining the confidentiality of your credentials, session tokens, and passwords. You agree to notify AEO Nexus immediately of any unauthorized access to your account or session token compromises.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Multi-Tenant Workspace & Data Boundaries</h2>
            <p>
              Workspaces are logically isolated. Workspace owners and administrators are responsible for managing member invitations, assigning appropriate roles, and ensuring that no unauthorized parties are granted access. Sole-owner accounts cannot be deleted or demoted without first appointing a successor owner.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Answer Engine Optimization & Content Integrity</h2>
            <p>
              You retain all rights and intellectual property in your company data, brand kits, and business profiles. You agree not to upload fraudulent entity data, deceptive claims, or illegal materials to conversational search indexes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
            <p>
              AEO Nexus provides services &quot;as is&quot; without warranties of any kind. Under no circumstances shall AEO Nexus Technologies Inc. be liable for indirect, incidental, or consequential damages resulting from platform downtime, third-party search engine index shifts, or security breaches arising from user credential compromise.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

