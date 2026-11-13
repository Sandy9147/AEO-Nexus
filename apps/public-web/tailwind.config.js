/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@aeo-nexus/ui/src/tailwind.preset.js')],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  plugins: [],
};
