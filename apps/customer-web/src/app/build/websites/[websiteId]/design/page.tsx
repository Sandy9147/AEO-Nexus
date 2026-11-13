'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CustomerShell } from '../../../../../components/layout/customer-shell';
import { Card, Button } from '@aeo-nexus/ui';
import { WebsiteDetailDto } from '@aeo-nexus/contracts';

export default function WebsiteDesignPage() {
  const params = useParams();
  const websiteId = params.websiteId as string;

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [primaryColor, setPrimaryColor] = useState('#3563F6');
  const [secondaryColor, setSecondaryColor] = useState('#6554E8');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [surfaceColor, setSurfaceColor] = useState('#F7F9FC');
  const [textColor, setTextColor] = useState('#0F172A');
  const [headingFont, setHeadingFont] = useState('Inter');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [buttonStyle, setButtonStyle] = useState<'ROUNDED' | 'PILL' | 'SQUARE'>('ROUNDED');
  const [borderRadius, setBorderRadius] = useState('8px');
  const [sectionSpacing, setSectionSpacing] = useState<'COMPACT' | 'MEDIUM' | 'RELAXED'>('MEDIUM');

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
          if (data.theme) {
            setPrimaryColor(data.theme.primaryColor || '#3563F6');
            setSecondaryColor(data.theme.secondaryColor || '#6554E8');
            setBackgroundColor(data.theme.backgroundColor || '#FFFFFF');
            setSurfaceColor(data.theme.surfaceColor || '#F7F9FC');
            setTextColor(data.theme.textColor || '#0F172A');
            setHeadingFont(data.theme.headingFont || 'Inter');
            setBodyFont(data.theme.bodyFont || 'Inter');
            setButtonStyle((data.theme.buttonStyle as any) || 'ROUNDED');
            setBorderRadius(data.theme.borderRadius || '8px');
            setSectionSpacing((data.theme.sectionSpacing as any) || 'MEDIUM');
          }
        }
      })
      .catch((err) => console.error('Failed to load theme:', err))
      .finally(() => setLoading(false));
  }, [websiteId]);

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/theme`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          backgroundColor,
          surfaceColor,
          textColor,
          headingFont,
          bodyFont,
          buttonStyle,
          borderRadius,
          sectionSpacing,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to update theme:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/build/websites/${websiteId}`} className="text-xs font-semibold text-blue-600 hover:underline">
                ← {website?.name || 'Website Hub'}
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Theme & Design System</h1>
            <p className="text-sm text-slate-600 mt-1">
              Customize colors, typography, and button geometries across your entire website.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/build/websites/${websiteId}/editor`}>
              <Button variant="outline">Open Editor</Button>
            </Link>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
            ✓ Theme settings saved successfully!
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading design settings...</div>
        ) : (
          <form onSubmit={handleSaveTheme} className="space-y-6">
            {/* Color Palette */}
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Color Palette</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Primary Accent</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-slate-800">{primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Secondary Accent</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-slate-800">{secondaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Background Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-slate-800">{backgroundColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Surface / Card Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-slate-800">{surfaceColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Text Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-slate-800">{textColor}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Typography & Buttons */}
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Typography & Geometry</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Heading Typography</label>
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Inter">Inter (Clean Modern)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Outfit">Outfit (Display)</option>
                    <option value="DM Sans">DM Sans</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Button Geometry</label>
                  <select
                    value={buttonStyle}
                    onChange={(e) => setButtonStyle(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ROUNDED">Rounded (8px)</option>
                    <option value="PILL">Pill (Fully Rounded)</option>
                    <option value="SQUARE">Square (Sharp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Section Spacing</label>
                  <select
                    value={sectionSpacing}
                    onChange={(e) => setSectionSpacing(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="COMPACT">Compact</option>
                    <option value="MEDIUM">Medium (Balanced)</option>
                    <option value="RELAXED">Relaxed (Spacious)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Live Interactive Preview Swatch */}
            <Card className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Component Preview</h2>
              <div
                className="p-8 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-6"
                style={{ backgroundColor: surfaceColor, borderColor: '#E2E8F0' }}
              >
                <div>
                  <h3 className="text-xl font-bold tracking-tight mb-1" style={{ color: textColor }}>
                    Previewing Theme Swatch
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your buttons, cards, and text will render in this style.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`px-5 py-2.5 text-xs font-semibold text-white shadow-sm ${
                      buttonStyle === 'PILL' ? 'rounded-full' : buttonStyle === 'SQUARE' ? 'rounded-none' : 'rounded-lg'
                    }`}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary Button
                  </button>
                  <button
                    type="button"
                    className={`px-5 py-2.5 text-xs font-semibold border border-slate-300 bg-white ${
                      buttonStyle === 'PILL' ? 'rounded-full' : buttonStyle === 'SQUARE' ? 'rounded-none' : 'rounded-lg'
                    }`}
                    style={{ color: textColor }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Theme Settings'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </CustomerShell>
  );
}
