'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomerShell } from '../../components/layout/customer-shell';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
} from '@aeo-nexus/ui';
import { SessionInfo } from '@aeo-nexus/contracts';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'business';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile / Account
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Business Profile
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [businessSize, setBusinessSize] = useState('');
  const [description, setDescription] = useState('');

  // Brand Profile
  const [primaryColor, setPrimaryColor] = useState('#3563F6');
  const [secondaryColor, setSecondaryColor] = useState('#6554E8');
  const [brandVoice, setBrandVoice] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Preferences
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // Security Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    const userStr = localStorage.getItem('aeo_user');

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserEmail(u.email || '');
        setUserName(`${u.firstName || ''} ${u.lastName || ''}`.trim());
      } catch {
        // Ignore
      }
    }

    if (!token || !wsId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);

        // Fetch Business, Brand, Preferences, and Sessions in parallel
        const [bizRes, brandRes, prefRes, sessRes] = await Promise.all([
          fetch(`${API_BASE}/workspaces/${wsId}/business-profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/workspaces/${wsId}/brand-profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/workspaces/${wsId}/preferences`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/auth/sessions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [bizJson, brandJson, prefJson, sessJson] = await Promise.all([
          bizRes.json(),
          brandRes.json(),
          prefRes.json(),
          sessRes.json(),
        ]);

        if (bizRes.ok && bizJson.data) {
          setBusinessName(bizJson.data.businessName || '');
          setWebsite(bizJson.data.website || '');
          setIndustry(bizJson.data.industry || '');
          setCountry(bizJson.data.country || '');
          setBusinessSize(bizJson.data.businessSize || '');
          setDescription(bizJson.data.description || '');
        }

        if (brandRes.ok && brandJson.data) {
          if (brandJson.data.primaryColor) setPrimaryColor(brandJson.data.primaryColor);
          if (brandJson.data.secondaryColor) setSecondaryColor(brandJson.data.secondaryColor);
          if (brandJson.data.brandVoice) setBrandVoice(brandJson.data.brandVoice);
          if (brandJson.data.logoUrl) setLogoUrl(brandJson.data.logoUrl);
        }

        if (prefRes.ok && prefJson.data) {
          setTimezone(prefJson.data.timezone || 'UTC');
          setCurrency(prefJson.data.currency || 'USD');
          setEmailNotifications(prefJson.data.emailNotifications ?? true);
          setWeeklyDigest(prefJson.data.weeklyDigest ?? true);
        }

        if (sessRes.ok && sessJson.data) {
          setSessions(sessJson.data);
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [API_BASE]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!token || !wsId) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/business-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName,
          website: website || null,
          industry,
          country,
          businessSize,
          description: description || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Failed to update business profile');
      }
      setStatusMsg({ type: 'success', text: 'Business profile successfully saved' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!token || !wsId) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/brand-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          brandVoice,
          logoUrl: logoUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Failed to update brand kit');
      }
      setStatusMsg({ type: 'success', text: 'Brand kit tokens successfully saved' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const token = localStorage.getItem('aeo_access_token');
    const wsId = localStorage.getItem('aeo_active_workspace_id');
    if (!token || !wsId) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timezone,
          currency,
          emailNotifications,
          weeklyDigest,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'Failed to save preferences');
      }
      setStatusMsg({ type: 'success', text: 'Workspace preferences updated' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    const token = localStorage.getItem('aeo_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setStatusMsg({ type: 'success', text: 'Session successfully revoked' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Unable to revoke session' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Workspace & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your organizational context, brand guidelines, workspace preferences, and device security.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Tabs Toolbar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2">
        {[
          { id: 'business', label: '🏢 Business Context' },
          { id: 'brand', label: '🎨 Brand Identity' },
          { id: 'preferences', label: '⚙️ Preferences' },
          { id: 'security', label: '🛡️ Security & Sessions' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setStatusMsg(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#3563F6] text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="inline-block animate-spin text-2xl text-[#3563F6] mb-2">⟳</div>
          <p className="text-xs text-slate-500">Loading configuration...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === 'business' && (
            <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base text-slate-900">Organization Profile</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update corporate parameters used by search indexers and AI reasoning models.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveBusiness} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Company Name</label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Official Website</label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Industry</label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Country</label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Business Size</label>
                    <Input
                      value={businessSize}
                      onChange={(e) => setBusinessSize(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Operating Summary</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3563F6]"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: BRAND IDENTITY */}
          {activeTab === 'brand' && (
            <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base text-slate-900">Brand Kit & Colors</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Visual color tokens and voice standards for outbound marketing.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveBrand} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Secondary Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Editorial Tone of Voice</label>
                  <Input
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="e.g. Authoritative, innovative, transparent"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Logo URL</label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/logo.svg"
                    className="text-xs"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Brand Kit'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base text-slate-900">Workspace Preferences</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure regional localization and automated notifications.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSavePreferences} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Timezone</label>
                    <Input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Currency Symbol</label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="rounded border-slate-300 text-[#3563F6] focus:ring-[#3563F6]"
                    />
                    <span>Receive email notifications for critical workspace alerts</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={weeklyDigest}
                      onChange={(e) => setWeeklyDigest(e.target.checked)}
                      className="rounded border-slate-300 text-[#3563F6] focus:ring-[#3563F6]"
                    />
                    <span>Receive weekly executive intelligence digest</span>
                  </label>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? 'Saving...' : 'Update Preferences'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 4: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-base text-slate-900">Account Identity</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Central identity credentials authenticated by AEO Nexus.
                  </CardDescription>
                </CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                    <span className="text-[10px] text-slate-400 block uppercase">Name</span>
                    <span className="font-semibold text-slate-800">{userName || 'User'}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-[#F7F9FC]">
                    <span className="text-[10px] text-slate-400 block uppercase">Email</span>
                    <span className="font-semibold text-slate-800">{userEmail}</span>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100">
                  <CardTitle className="text-base text-slate-900">Active Device Sessions</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Sessions authorized to access your identity. Remote termination immediately revokes refresh access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No active sessions found.</div>
                  ) : (
                    sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {sess.userAgent ? sess.userAgent.substring(0, 40) + '...' : 'Web Session'}
                            </span>
                            {sess.isCurrent && (
                              <Badge variant="success" className="text-[9px]">
                                Current Device
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            IP: {sess.ipAddress || '127.0.0.1'} • Created:{' '}
                            {new Date(sess.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-rose-600 hover:text-rose-700"
                            onClick={() => handleRevokeSession(sess.id)}
                          >
                            Revoke Access
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <CustomerShell>
      <Suspense
        fallback={
          <div className="p-12 text-center">
            <div className="inline-block animate-spin text-2xl text-[#3563F6]">⟳</div>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </CustomerShell>
  );
}

