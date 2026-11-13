'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardTitle, CardDescription, Button, Input, Badge } from '@aeo-nexus/ui';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('Sales & Enterprise Plans');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="primary">Direct Communication</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Get in Touch With Our Team
          </h1>
          <p className="text-sm text-slate-600">
            Have questions about enterprise deployments, agency partnerships, or security audits? We are here to help.
          </p>
        </div>

        <Card className="border-slate-200 bg-white p-6 sm:p-10 shadow-sm max-w-2xl mx-auto">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <CardTitle className="text-xl text-slate-900">Inquiry Dispatched</CardTitle>
              <CardDescription className="text-xs text-slate-500 max-w-md mx-auto">
                Thank you, {name}. A member of our engineering leadership or enterprise solutions group will reply to {email} within 24 hours.
              </CardDescription>
              <Link href="/">
                <Button variant="outline" size="sm" className="mt-4 text-xs">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Work Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="jane@company.com"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Company Name</label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Global Inc."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Inquiry Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                  >
                    <option>Sales & Enterprise Plans</option>
                    <option>Agency Partner Program</option>
                    <option>Security & Compliance Inquiries</option>
                    <option>Technical Support</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Message / Scope</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Tell us about your organization's goals or questions..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full text-xs">
                  Submit Inquiry →
                </Button>
              </div>
            </form>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}

