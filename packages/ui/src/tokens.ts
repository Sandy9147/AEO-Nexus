/**
 * AEO Nexus Official Brand & Design System Tokens
 */
export const tokens = {
  colors: {
    primary: '#3563F6',
    primaryHover: '#2952db',
    violetAccent: '#6554E8',
    violetAccentHover: '#5241d6',
    background: '#F7F9FC',
    surface: '#FFFFFF',
    softBlue: '#EAF0FF',
    softViolet: '#EEF0FF',
    success: '#16A36A',
    warning: '#E59A27',
    danger: '#E53E3E',
    border: '#E2E8F0',
    textMain: '#1E293B',
    textMuted: '#64748B',
  },
  fonts: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
  },
  radii: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    elevation: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
  },
} as const;

export type DesignTokens = typeof tokens;
