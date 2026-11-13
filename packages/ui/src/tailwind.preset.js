/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        nexus: {
          primary: '#3563F6',
          'primary-hover': '#2952db',
          violet: '#6554E8',
          'violet-hover': '#5241d6',
          bg: '#F7F9FC',
          surface: '#FFFFFF',
          'soft-blue': '#EAF0FF',
          'soft-violet': '#EEF0FF',
          success: '#16A36A',
          warning: '#E59A27',
          border: '#E2E8F0',
          text: '#1E293B',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
