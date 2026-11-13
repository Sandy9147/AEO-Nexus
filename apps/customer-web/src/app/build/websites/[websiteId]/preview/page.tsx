'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@aeo-nexus/ui';
import {
  SectionRenderer,
  WebsiteThemeConfig,
} from '../../../../../components/website-builder/section-renderer';
import { WebsiteDetailDto } from '@aeo-nexus/contracts';

export default function WebsitePreviewPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [activePageId, setActivePageId] = useState<string>('');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    if (!wsId || !token || !websiteId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WebsiteDetailDto | null) => {
        if (data) {
          setWebsite(data);
          const home = data.pages.find((p) => p.isHome) || data.pages[0];
          if (home) setActivePageId(home.id);
        }
      })
      .catch((err) => console.error('Failed to load website preview:', err))
      .finally(() => setLoading(false));
  }, [websiteId]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-slate-400">Loading live preview...</div>;
  }

  if (!website) {
    return <div className="h-screen flex items-center justify-center text-red-500">Website not found</div>;
  }

  const activePage = website.pages.find((p) => p.id === activePageId) || website.pages[0];

  const themeConfig: WebsiteThemeConfig = {
    primaryColor: website.theme?.primaryColor || '#3563F6',
    secondaryColor: website.theme?.secondaryColor || '#6554E8',
    backgroundColor: website.theme?.backgroundColor || '#FFFFFF',
    surfaceColor: website.theme?.surfaceColor || '#F7F9FC',
    textColor: website.theme?.textColor || '#0F172A',
    headingFont: website.theme?.headingFont || 'Inter',
    bodyFont: website.theme?.bodyFont || 'Inter',
    buttonStyle: (website.theme?.buttonStyle as any) || 'ROUNDED',
    borderRadius: website.theme?.borderRadius || '8px',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      {/* Simulation Top Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Link href={`/build/websites/${website.id}/editor`} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold">
            ✕ <span className="hidden sm:inline">Close Preview</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <span className="font-bold text-sm text-slate-200 truncate">{website.name}</span>
          <select
            value={activePageId}
            onChange={(e) => setActivePageId(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none"
          >
            {website.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'desktop' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ Desktop (100%)
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'tablet' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Tablet (768px)
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'mobile' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Mobile (375px)
          </button>
        </div>

        <div>
          <Link href={`/build/websites/${website.id}/settings`}>
            <Button size="sm" variant="primary">Publish Subdomain →</Button>
          </Link>
        </div>
      </header>

      {/* Simulator Frame */}
      <div className="flex-1 bg-slate-900 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
        <div
          className={`bg-white shadow-2xl transition-all duration-300 min-h-[90vh] rounded-b-xl overflow-hidden ${
            device === 'tablet'
              ? 'w-[768px] border-4 border-slate-800 rounded-xl'
              : device === 'mobile'
              ? 'w-[375px] border-4 border-slate-800 rounded-2xl'
              : 'w-full max-w-6xl'
          }`}
          style={{ backgroundColor: themeConfig.backgroundColor }}
        >
          {activePage?.sections && activePage.sections.length > 0 ? (
            activePage.sections.map((sec) => (
              <SectionRenderer
                key={sec.id}
                section={sec}
                theme={themeConfig}
                isEditable={false}
              />
            ))
          ) : (
            <div className="p-20 text-center text-slate-400">
              No sections created on this page yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
