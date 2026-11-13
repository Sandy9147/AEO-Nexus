import React from 'react';
import Link from 'next/link';
import { PublicHeader } from '../../components/layout/public-header';
import { PublicFooter } from '../../components/layout/public-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@aeo-nexus/ui';

export const metadata = {
  title: 'Sign In — AEO Nexus Portals',
  description: 'Access your Customer Dashboard, Agency Portal, or Administration control center.',
};

const PORTALS = [
  {
    name: 'Customer Workspace',
    desc: 'Access your business dashboard, brand kit, and active workspace tools.',
    port: 'http://localhost:3001/login',
    badge: 'Customer',
    icon: '🏢',
    primary: true,
  },
  {
    name: 'Agency Partner Portal',
    desc: 'Manage multiple client organizations, cross-tenant campaigns, and agency billing.',
    port: 'http://localhost:3002/login',
    badge: 'Agencies',
    icon: '👥',
    primary: false,
  },
  {
    name: 'Platform Administration',
    desc: 'Platform operations, system audit logs, and support agent access.',
    port: 'http://localhost:3003/login',
    badge: 'Admins',
    icon: '🛡️',
    primary: false,
  },
  {
    name: 'Superadmin Control Center',
    desc: 'Root platform governance, multi-region database metrics, and master controls.',
    port: 'http://localhost:3004/login',
    badge: 'Superadmin',
    icon: '⚡',
    primary: false,
  },
];

export default function PublicLoginPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col antialiased">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <Badge variant="primary">Centralized Identity</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Select Your Portal
          </h1>
          <p className="text-sm text-slate-600">
            AEO Nexus utilizes a single master identity service. Select the application context you wish to access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PORTALS.map((p) => (
            <Card
              key={p.name}
              className={`p-6 space-y-4 shadow-sm flex flex-col justify-between transition ${
                p.primary
                  ? 'border-[#3563F6] ring-1 ring-[#3563F6] bg-white'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{p.icon}</span>
                  <Badge variant={p.primary ? 'primary' : 'outline'} className="text-[10px]">
                    {p.badge}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <a href={p.port} className="block">
                  <Button variant={p.primary ? 'primary' : 'outline'} className="w-full text-xs">
                    Sign In to {p.badge} →
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-slate-500 pt-4">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="text-[#3563F6] font-semibold hover:underline">
            Register your business workspace
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

