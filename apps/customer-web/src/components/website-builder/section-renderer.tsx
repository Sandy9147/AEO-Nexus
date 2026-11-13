'use client';

import React from 'react';
import { SectionType } from '@aeo-nexus/contracts';

export interface SectionData {
  id: string;
  type: SectionType;
  order: number;
  content: Record<string, any>;
}

export interface WebsiteThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
  buttonStyle?: 'ROUNDED' | 'PILL' | 'SQUARE';
  borderRadius?: string;
  sectionSpacing?: 'COMPACT' | 'MEDIUM' | 'RELAXED';
}

interface SectionRendererProps {
  section: SectionData;
  theme?: WebsiteThemeConfig;
  isEditable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
}

export function SectionRenderer({
  section,
  theme = {},
  isEditable = false,
  isSelected = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onRegenerate,
}: SectionRendererProps) {
  const {
    primaryColor = '#3563F6',
    secondaryColor = '#6554E8',
    backgroundColor = '#FFFFFF',
    surfaceColor = '#F7F9FC',
    textColor = '#0F172A',
    borderRadius = '8px',
    buttonStyle = 'ROUNDED',
  } = theme;

  const btnRadiusClass =
    buttonStyle === 'PILL' ? 'rounded-full' : buttonStyle === 'SQUARE' ? 'rounded-none' : 'rounded-lg';

  const content = section.content || {};

  const renderInner = () => {
    switch (section.type) {
      case 'ANNOUNCEMENT_BAR':
        return (
          <div
            className="w-full py-2.5 px-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-3 transition-colors"
            style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
          >
            <span>{content.message || content.text || '✨ New feature released! Discover how to automate your business.'}</span>
            {content.linkText && (
              <span className="underline font-semibold cursor-pointer opacity-90 hover:opacity-100">
                {content.linkText} →
              </span>
            )}
          </div>
        );

      case 'NAVIGATION':
        return (
          <header className="w-full border-b border-slate-100 py-4 px-6 flex items-center justify-between" style={{ backgroundColor }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                {(content.brandName || 'N')[0]}
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ color: textColor }}>
                {content.brandName || 'BrandName'}
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: textColor }}>
              {(content.links || [
                { label: 'Home', href: '/' },
                { label: 'Services', href: '/services' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ]).map((l: any, i: number) => (
                <span key={i} className="hover:opacity-75 cursor-pointer">
                  {l.label}
                </span>
              ))}
            </nav>
            <div>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium text-white shadow-sm ${btnRadiusClass}`}
                style={{ backgroundColor: primaryColor }}
              >
                {content.ctaText || 'Get Started'}
              </button>
            </div>
          </header>
        );

      case 'HERO':
        return (
          <section className="py-20 px-6 text-center max-w-5xl mx-auto" style={{ color: textColor }}>
            {content.badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                ✨ {content.badge}
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              {content.headline || 'Turn Market Opportunity Into High-Converting Execution'}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              {content.subheadline || 'The unified platform connecting deep market discovery, autonomous planning, and visual web deployment.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                className={`px-6 py-3.5 text-base font-semibold text-white shadow-md hover:shadow-lg transition-all ${btnRadiusClass}`}
                style={{ backgroundColor: primaryColor }}
              >
                {content.primaryCta?.text || 'Start Free Trial'}
              </button>
              {content.secondaryCta?.text && (
                <button
                  type="button"
                  className={`px-6 py-3.5 text-base font-semibold border border-slate-300 hover:bg-slate-50 transition-colors ${btnRadiusClass}`}
                  style={{ color: textColor }}
                >
                  {content.secondaryCta.text}
                </button>
              )}
            </div>
          </section>
        );

      case 'LOGO_STRIP':
        return (
          <section className="py-12 border-y border-slate-100 px-6 text-center" style={{ backgroundColor: surfaceColor }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
              {content.headline || 'TRUSTED BY INNOVATIVE BRANDS WORLDWIDE'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-60">
              {(content.logos || ['Acme Corp', 'Apex Global', 'Nova Systems', 'Starlight Tech', 'Vanguard']).map((brand: any, i: number) => (
                <span key={i} className="text-sm md:text-base font-bold tracking-tight text-slate-700">
                  {typeof brand === 'string' ? brand : brand.name}
                </span>
              ))}
            </div>
          </section>
        );

      case 'FEATURES':
        return (
          <section className="py-20 px-6 max-w-6xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Platform Capabilities'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Built from the ground up for modern enterprise execution and Answer Engine Optimization.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(content.features || [
                { title: 'Answer Engine Optimization', description: 'Monitor and amplify brand citations across modern AI conversational search engines.', icon: '🎯' },
                { title: 'Autonomous Business Roadmaps', description: 'Transform qualitative strategic goals into measurable operational initiatives.', icon: '🗺️' },
                { title: 'Visual Section Builder', description: 'Publish blazing-fast, responsive web landing pages without touching code.', icon: '⚡' },
              ]).map((feat: any, i: number) => (
                <div key={i} className="p-8 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: surfaceColor }}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl mb-6 shadow-sm" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                    {feat.icon || '✨'}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'SERVICES':
        return (
          <section className="py-20 px-6 max-w-6xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Our Services & Offerings'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Tailored capabilities engineered to drive sustainable business growth.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(content.services || [
                { name: 'Citation Intelligence', description: 'Continuous diagnostic audits of brand presence across conversational search models.' },
                { name: 'Strategic Execution', description: 'Phased roadmapping, milestone verification, and asset harmonization.' },
                { name: 'Turnkey Edge Publishing', description: 'Instant, secure deployment on global CDN edge subdomains.' },
              ]).map((svc: any, i: number) => (
                <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">{svc.name}</h3>
                    <p className="text-sm text-slate-600 mb-6">{svc.description}</p>
                  </div>
                  <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: primaryColor }}>
                    Learn more →
                  </span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'ABOUT':
        return (
          <section className="py-20 px-6 max-w-5xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'About Our Mission'}</h2>
              <p className="text-xl font-medium text-slate-700 mb-6">{content.subtitle || 'Empowering business teams with autonomous strategic execution.'}</p>
              <p className="text-base text-slate-600 leading-relaxed">{content.body || 'We bridge the gap between strategic intent and digital execution. Our platform unifies market discovery, structured roadmaps, and visual builders.'}</p>
            </div>
            {content.stats && content.stats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center pt-8 border-t border-slate-200">
                {content.stats.map((st: any, i: number) => (
                  <div key={i}>
                    <div className="text-3xl font-extrabold mb-1" style={{ color: primaryColor }}>{st.value}</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{st.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case 'IMAGE_TEXT':
        return (
          <section className="py-20 px-6 max-w-6xl mx-auto" style={{ color: textColor }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <span className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: primaryColor }}>
                  {content.eyebrow || 'Strategic Advantage'}
                </span>
                <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Built for Speed, Governance, and Authority'}</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">{content.body || 'Unlike fragmented tools that create operational silos, our unified workflow ensures full context carries from initial research into final published landing pages.'}</p>
                {content.bullets && (
                  <ul className="space-y-3 mb-8">
                    {content.bullets.map((b: string, i: number) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {content.buttonText && (
                  <button type="button" className={`px-5 py-2.5 text-sm font-semibold text-white ${btnRadiusClass}`} style={{ backgroundColor: primaryColor }}>
                    {content.buttonText}
                  </button>
                )}
              </div>
              <div className="order-1 md:order-2 rounded-2xl overflow-hidden border border-slate-200 shadow-lg min-h-[300px] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="text-center p-8">
                  <span className="text-4xl mb-2 block">🖥️</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Visual Showcase</span>
                </div>
              </div>
            </div>
          </section>
        );

      case 'GALLERY':
        return (
          <section className="py-20 px-6 max-w-6xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">{content.title || 'Visual Showcase'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Explore our featured deliverables and product highlights.'}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(content.items || ['Platform Dashboard', 'AEO Audit Matrix', 'Strategy Visualizer', 'No-Code Canvas']).map((item: any, i: number) => (
                <div key={i} className="aspect-square rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-4 text-center hover:bg-slate-200/60 transition-colors">
                  <span className="text-2xl mb-2">🖼️</span>
                  <span className="text-xs font-semibold text-slate-700">{typeof item === 'string' ? item : item.title}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'PROCESS_STEPS':
        return (
          <section className="py-20 px-6 max-w-5xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'How It Works'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Four streamlined steps from research to live public deployment.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {(content.steps || [
                { step: '01', title: 'Discover', description: 'Identify market opportunities and citation gaps.' },
                { step: '02', title: 'Plan', description: 'Generate measurable goals and execution roadmaps.' },
                { step: '03', title: 'Build', description: 'Design responsive landing pages visually.' },
                { step: '04', title: 'Publish', description: 'Deploy instantly to global edge subdomains.' },
              ]).map((st: any, i: number) => (
                <div key={i} className="p-6 rounded-xl border border-slate-200 relative" style={{ backgroundColor: surfaceColor }}>
                  <div className="text-2xl font-black mb-3 opacity-30" style={{ color: primaryColor }}>{st.step || `0${i + 1}`}</div>
                  <h3 className="text-lg font-bold mb-2">{st.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'PRICING':
        return (
          <section className="py-20 px-6 max-w-5xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Transparent, Predictable Pricing'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Choose the plan that fits your business scale.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {(content.tiers || [
                { name: 'Starter', price: '$49/mo', description: 'For emerging businesses establishing presence.', features: ['1 Live Subdomain', 'Monthly AEO Audit', 'Standard Support'], ctaText: 'Get Started' },
                { name: 'Pro', price: '$149/mo', description: 'For growth teams demanding deep visibility.', features: ['5 Live Subdomains', 'Weekly AEO Diagnostics', 'AI Roadmaps', 'Priority Support'], highlighted: true, ctaText: 'Start Pro' },
              ]).map((tier: any, i: number) => (
                <div
                  key={i}
                  className={`p-8 rounded-2xl border transition-all ${
                    tier.highlighted ? 'border-blue-600 shadow-xl ring-2 ring-blue-500/20' : 'border-slate-200 shadow-sm'
                  }`}
                  style={{ backgroundColor: surfaceColor }}
                >
                  {tier.highlighted && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white mb-4 inline-block" style={{ backgroundColor: primaryColor }}>
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="text-4xl font-extrabold mb-3" style={{ color: primaryColor }}>{tier.price}</div>
                  <p className="text-xs text-slate-600 mb-6">{tier.description}</p>
                  <ul className="space-y-3 mb-8">
                    {(tier.features || []).map((f: string, fi: number) => (
                      <li key={fi} className="text-xs text-slate-700 flex items-center gap-2">
                        <span className="font-bold text-emerald-600">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`w-full py-3 text-sm font-semibold transition-all ${
                      tier.highlighted ? 'text-white shadow-md' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    } ${btnRadiusClass}`}
                    style={{ backgroundColor: tier.highlighted ? primaryColor : undefined }}
                  >
                    {tier.ctaText || 'Select Plan'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );

      case 'FAQ':
        return (
          <section className="py-20 px-6 max-w-4xl mx-auto" style={{ color: textColor }}>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Frequently Asked Questions'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Have questions? We have clear answers.'}</p>
            </div>
            <div className="space-y-4">
              {(content.faqs || [
                { question: 'What is Answer Engine Optimization (AEO)?', answer: 'AEO focuses on structuring your content so generative AI models cite your business as the definitive answer to conversational search queries.' },
                { question: 'How quickly can I publish a website?', answer: 'Within minutes. Generate your layout from your business profile, customize visually, and publish to your platform subdomain with one click.' },
                { question: 'Can I connect custom domain names in the future?', answer: 'Yes. Platform subdomains are live now, and custom domain mapping is supported on our enterprise roadmaps.' },
              ]).map((faq: any, i: number) => (
                <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white">
                  <h3 className="text-base font-bold mb-2 flex items-center justify-between">
                    <span>{faq.question}</span>
                    <span className="text-slate-400">▾</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'TESTIMONIALS':
        return (
          <section className="py-20 px-6 max-w-5xl mx-auto" style={{ color: textColor }}>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">{content.title || 'Verified Customer Perspectives'}</h2>
              <p className="text-slate-600">{content.subtitle || 'Real feedback from forward-thinking business owners.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(content.testimonials || [
                { quote: 'AEO Nexus completely transformed how conversational engines discover and cite our brand.', author: 'Customer Perspective', role: 'Pilot Participant' },
                { quote: 'Moving from market discovery to a live website in an afternoon is an incredible unlock.', author: 'Growth Leader', role: 'Pilot Participant' },
                { quote: 'The visual section editor gives us full control without messy code or fragile templates.', author: 'Agency Founder', role: 'Pilot Participant' },
              ]).map((t: any, i: number) => (
                <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <p className="text-sm text-slate-700 italic mb-6">"{t.quote}"</p>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.author}</div>
                    <div className="text-[10px] text-slate-500">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'CONTACT':
        return (
          <section className="py-20 px-6 max-w-4xl mx-auto" style={{ color: textColor }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">{content.headline || 'Get In Touch'}</h2>
                <p className="text-slate-600 mb-8">{content.subheadline || 'Reach out to our specialists to explore how our autonomous platform can help your business.'}</p>
                <div className="space-y-4 text-sm text-slate-700">
                  {content.email && <div>📧 <span className="font-semibold">{content.email}</span></div>}
                  {content.phone && <div>📞 <span className="font-semibold">{content.phone}</span></div>}
                  {content.address && <div>📍 <span className="font-semibold">{content.address}</span></div>}
                </div>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" placeholder="Jane Doe" className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly={isEditable} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" placeholder="jane@example.com" className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly={isEditable} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
                  <textarea rows={3} placeholder="How can we help your business?" className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly={isEditable} />
                </div>
                <button type="button" className={`w-full py-3 text-sm font-semibold text-white ${btnRadiusClass}`} style={{ backgroundColor: primaryColor }}>
                  Send Message
                </button>
              </div>
            </div>
          </section>
        );

      case 'CTA':
        return (
          <section className="py-20 px-6 text-center" style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                {content.headline || 'Ready to Accelerate Your Market Execution?'}
              </h2>
              <p className="text-base sm:text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                {content.subheadline || 'Join innovative businesses leveraging AEO Nexus to automate discovery, planning, and web deployment.'}
              </p>
              <button
                type="button"
                className={`px-8 py-3.5 text-base font-bold bg-white text-slate-900 shadow-lg hover:bg-slate-100 transition-all ${btnRadiusClass}`}
              >
                {content.buttonText || 'Get Started Today'}
              </button>
            </div>
          </section>
        );

      case 'FOOTER':
        return (
          <footer className="border-t border-slate-200 py-12 px-6" style={{ backgroundColor: surfaceColor, color: textColor }}>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: textColor }}>{content.brandName || 'BrandName'}</span>
                <span>•</span>
                <span>{content.copyright || `© ${new Date().getFullYear()} All rights reserved.`}</span>
              </div>
              <div className="flex items-center gap-6">
                {(content.links || [
                  { label: 'Home', href: '/' },
                  { label: 'About', href: '/about' },
                  { label: 'Services', href: '/services' },
                  { label: 'Contact', href: '/contact' },
                ]).map((l: any, i: number) => (
                  <span key={i} className="cursor-pointer hover:underline">
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </footer>
        );

      default:
        return (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200">
            Unknown section type: {section.type}
          </div>
        );
    }
  };

  return (
    <div
      onClick={isEditable ? onSelect : undefined}
      className={`relative transition-all ${
        isEditable
          ? isSelected
            ? 'ring-2 ring-blue-500 ring-offset-2 shadow-md cursor-pointer'
            : 'hover:ring-1 hover:ring-slate-300 cursor-pointer'
          : ''
      }`}
    >
      {isEditable && isSelected && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-slate-900/90 text-white p-1 rounded-lg shadow-lg text-xs backdrop-blur-sm">
          <span className="px-2 py-0.5 font-bold uppercase text-[10px] tracking-wider text-blue-300">
            {section.type}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            className="p-1 hover:bg-slate-800 rounded"
            title="Move Up"
          >
            ⬆️
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            className="p-1 hover:bg-slate-800 rounded"
            title="Move Down"
          >
            ⬇️
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
            className="p-1 hover:bg-slate-800 rounded"
            title="Duplicate"
          >
            📋
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRegenerate?.(); }}
            className="p-1 hover:bg-slate-800 rounded text-blue-300"
            title="Regenerate with AI"
          >
            ✨
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-1 hover:bg-red-800 text-red-300 rounded"
            title="Delete Section"
          >
            🗑️
          </button>
        </div>
      )}
      {renderInner()}
    </div>
  );
}
