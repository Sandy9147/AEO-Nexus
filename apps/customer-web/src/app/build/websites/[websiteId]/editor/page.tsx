'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@aeo-nexus/ui';
import {
  SectionRenderer,
  SectionData,
  WebsiteThemeConfig,
} from '../../../../../components/website-builder/section-renderer';
import { WebsiteDetailDto, SectionType, SectionTypeEnum } from '@aeo-nexus/contracts';

function WebsiteEditorInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const websiteId = params.websiteId as string;
  const initialPageId = searchParams.get('pageId') || '';

  const [website, setWebsite] = useState<WebsiteDetailDto | null>(null);
  const [activePageId, setActivePageId] = useState<string>(initialPageId);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'UNSAVED'>('SAVED');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load website data
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
          const defaultPage =
            (initialPageId && data.pages.find((p) => p.id === initialPageId)) ||
            data.pages.find((p) => p.isHome) ||
            data.pages[0];

          if (defaultPage) {
            setActivePageId(defaultPage.id);
            setSections(defaultPage.sections || []);
          }
        }
      })
      .catch((err) => console.error('Failed to load website for editor:', err))
      .finally(() => setLoading(false));
  }, [websiteId, initialPageId]);

  // Switch page
  const handlePageChange = (pageId: string) => {
    if (!website) return;
    const targetPage = website.pages.find((p) => p.id === pageId);
    if (targetPage) {
      setActivePageId(pageId);
      setSections(targetPage.sections || []);
      setSelectedSectionId(null);
    }
  };

  // Persist sections to backend
  const saveSections = useCallback(
    async (updatedSections: SectionData[]) => {
      setSaveStatus('SAVING');
      const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
      const token = localStorage.getItem('aeo_access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      try {
        const res = await fetch(
          `${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/pages/${activePageId}/sections`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sections: updatedSections }),
          },
        );

        if (res.ok) {
          setSaveStatus('SAVED');
        } else {
          setSaveStatus('UNSAVED');
        }
      } catch (e) {
        console.error('Failed to save sections:', e);
        setSaveStatus('UNSAVED');
      }
    },
    [websiteId, activePageId],
  );

  // Section actions
  const handleAddSection = (type: SectionType) => {
    const newSection: SectionData = {
      id: `sec_${type.toLowerCase()}_${Date.now()}`,
      type,
      order: sections.length,
      content: {
        headline: `New ${type} Section`,
        title: `New ${type} Section`,
        subheadline: 'Enter compelling content and clear action steps here.',
        subtitle: 'Enter compelling content and clear action steps here.',
      },
    };

    const updated = [...sections, newSection];
    setSections(updated);
    setSelectedSectionId(newSection.id);
    setIsLibraryOpen(false);
    saveSections(updated);
  };

  const handleMoveSection = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Reorder indices
    newSections.forEach((s, idx) => {
      s.order = idx;
    });

    setSections(newSections);
    saveSections(newSections);
  };

  const handleDuplicateSection = (index: number) => {
    const original = sections[index];
    const duplicate: SectionData = {
      ...original,
      id: `sec_${original.type.toLowerCase()}_${Date.now()}`,
      order: index + 1,
      content: JSON.parse(JSON.stringify(original.content || {})),
    };

    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicate);
    newSections.forEach((s, idx) => {
      s.order = idx;
    });

    setSections(newSections);
    setSelectedSectionId(duplicate.id);
    saveSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    const newSections = sections.filter((_, idx) => idx !== index);
    newSections.forEach((s, idx) => {
      s.order = idx;
    });

    setSections(newSections);
    setSelectedSectionId(null);
    saveSections(newSections);
  };

  const handleRegenerateSection = async (index: number) => {
    const section = sections[index];
    const wsId = localStorage.getItem('aeo_active_workspace_id') || '';
    const token = localStorage.getItem('aeo_access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(
        `${apiUrl}/workspaces/${wsId}/build/websites/${websiteId}/pages/${activePageId}/sections/${section.id}/regenerate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sectionType: section.type }),
        },
      );

      if (res.ok) {
        const regenerated = await res.json();
        const newSections = [...sections];
        newSections[index] = {
          ...regenerated,
          id: section.id,
          order: section.order,
        };
        setSections(newSections);
        saveSections(newSections);
      }
    } catch (e) {
      console.error('Failed to regenerate section:', e);
    }
  };

  const handleUpdateContentField = (key: string, value: any) => {
    if (!selectedSectionId) return;
    const newSections = sections.map((s) => {
      if (s.id === selectedSectionId) {
        return {
          ...s,
          content: {
            ...s.content,
            [key]: value,
          },
        };
      }
      return s;
    });

    setSections(newSections);
    setSaveStatus('UNSAVED');
    saveSections(newSections);
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const activePage = website?.pages?.find((p) => p.id === activePageId);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-slate-400">Loading editor...</div>;
  }

  if (!website) {
    return <div className="h-screen flex items-center justify-center text-red-500">Website not found</div>;
  }

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
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/build/websites/${website.id}`} className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
            ← <span className="hidden sm:inline">Hub</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-bold text-sm text-slate-900 truncate max-w-[150px] sm:max-w-xs">{website.name}</span>

          {/* Page Selector */}
          <select
            value={activePageId}
            onChange={(e) => handlePageChange(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {website.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Device Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🖥️ Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'tablet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📱 Tablet (768px)
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              device === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📱 Mobile (375px)
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-400">
            {saveStatus === 'SAVING' ? '💾 Saving...' : saveStatus === 'SAVED' ? '✓ Saved' : '● Unsaved'}
          </span>
          <Link href={`/build/websites/${website.id}/preview`}>
            <Button size="sm" variant="outline">Preview</Button>
          </Link>
          <Link href={`/build/websites/${website.id}/settings`}>
            <Button size="sm" variant="primary">Publish →</Button>
          </Link>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar / Section Library */}
        <div className="w-16 sm:w-64 bg-white border-r border-slate-200 flex flex-col z-20 flex-shrink-0">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">Sections</span>
            <Button size="sm" variant="outline" onClick={() => setIsLibraryOpen(!isLibraryOpen)} className="w-full sm:w-auto text-xs">
              + Add Section
            </Button>
          </div>

          {/* Section Outline */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={`p-2.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  selectedSectionId === sec.id
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="truncate">
                  <span className="opacity-40 mr-1.5">{idx + 1}.</span>
                  <span>{sec.type}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100">
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'UP'); }}>⬆️</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'DOWN'); }}>⬇️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-slate-200/60 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div
            className={`bg-white shadow-2xl transition-all duration-300 min-h-full rounded-b-xl overflow-hidden ${
              device === 'tablet'
                ? 'w-[768px]'
                : device === 'mobile'
                ? 'w-[375px]'
                : 'w-full max-w-5xl'
            }`}
          >
            {sections.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <span className="text-4xl block">📄</span>
                <p className="font-bold text-slate-700">This page has no sections yet</p>
                <p className="text-xs text-slate-500">Click "+ Add Section" to add content blocks.</p>
                <Button size="sm" variant="primary" onClick={() => setIsLibraryOpen(true)}>Add Section</Button>
              </div>
            ) : (
              sections.map((sec, idx) => (
                <SectionRenderer
                  key={sec.id}
                  section={sec}
                  theme={themeConfig}
                  isEditable={true}
                  isSelected={selectedSectionId === sec.id}
                  onSelect={() => setSelectedSectionId(sec.id)}
                  onMoveUp={() => handleMoveSection(idx, 'UP')}
                  onMoveDown={() => handleMoveSection(idx, 'DOWN')}
                  onDuplicate={() => handleDuplicateSection(idx)}
                  onDelete={() => handleDeleteSection(idx)}
                  onRegenerate={() => handleRegenerateSection(idx)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Inspector Panel */}
        {selectedSection && (
          <div className="w-72 sm:w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto z-20 flex-shrink-0">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Inspector</span>
                <h3 className="font-bold text-sm text-slate-900">{selectedSection.type}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSectionId(null)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Common field editors */}
              {(selectedSection.content.badge !== undefined || selectedSection.type === 'HERO') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={selectedSection.content.badge || ''}
                    onChange={(e) => handleUpdateContentField('badge', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {(selectedSection.content.headline !== undefined || selectedSection.content.title !== undefined) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Headline / Title</label>
                  <input
                    type="text"
                    value={selectedSection.content.headline || selectedSection.content.title || ''}
                    onChange={(e) => {
                      if (selectedSection.content.headline !== undefined) handleUpdateContentField('headline', e.target.value);
                      else handleUpdateContentField('title', e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {(selectedSection.content.subheadline !== undefined || selectedSection.content.subtitle !== undefined) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Subheadline / Subtitle</label>
                  <textarea
                    rows={3}
                    value={selectedSection.content.subheadline || selectedSection.content.subtitle || ''}
                    onChange={(e) => {
                      if (selectedSection.content.subheadline !== undefined) handleUpdateContentField('subheadline', e.target.value);
                      else handleUpdateContentField('subtitle', e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectedSection.content.primaryCta && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">Primary Button</span>
                  <input
                    type="text"
                    placeholder="Button Text"
                    value={selectedSection.content.primaryCta.text || ''}
                    onChange={(e) =>
                      handleUpdateContentField('primaryCta', {
                        ...selectedSection.content.primaryCta,
                        text: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Link URL (e.g. /contact)"
                    value={selectedSection.content.primaryCta.href || ''}
                    onChange={(e) =>
                      handleUpdateContentField('primaryCta', {
                        ...selectedSection.content.primaryCta,
                        href: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              )}

              {selectedSection.content.body !== undefined && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Body Text</label>
                  <textarea
                    rows={4}
                    value={selectedSection.content.body || ''}
                    onChange={(e) => handleUpdateContentField('body', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-blue-600"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === selectedSection.id);
                    if (idx >= 0) handleRegenerateSection(idx);
                  }}
                >
                  ✨ AI Regenerate Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === selectedSection.id);
                    if (idx >= 0) handleDeleteSection(idx);
                  }}
                >
                  Delete Section
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Section Library Modal / Drawer */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Visual Section</h3>
                <p className="text-xs text-slate-500">Choose from 16 allowlisted responsive block templates</p>
              </div>
              <button type="button" onClick={() => setIsLibraryOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 overflow-y-auto">
              {SectionTypeEnum.options.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleAddSection(st)}
                  className="p-3 rounded-xl border border-slate-200 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-all group"
                >
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 block">{st}</span>
                  <span className="text-[10px] text-slate-400">Pre-styled block</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WebsiteEditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400">Loading editor...</div>}>
      <WebsiteEditorInner />
    </Suspense>
  );
}
