/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          soft: 'rgb(var(--c-gold-soft) / <alpha-value>)',
          deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
          wash: 'rgb(var(--c-gold-wash) / <alpha-value>)',
        },
        positive: 'rgb(var(--c-positive) / <alpha-value>)',
        caution: 'rgb(var(--c-caution) / <alpha-value>)',
        critical: 'rgb(var(--c-critical) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
        series: {
          1: 'rgb(var(--s1) / <alpha-value>)',
          2: 'rgb(var(--s2) / <alpha-value>)',
          3: 'rgb(var(--s3) / <alpha-value>)',
          4: 'rgb(var(--s4) / <alpha-value>)',
          other: 'rgb(var(--s-other) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // A dashboard scale: dense body, but display sizes with real presence.
        micro: ['11px', { lineHeight: '1.4', letterSpacing: '0.09em' }],
        tiny: ['12px', { lineHeight: '1.45' }],
        small: ['13px', { lineHeight: '1.55' }],
        base: ['13.5px', { lineHeight: '1.6' }],
        title: ['15px', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        head: ['19px', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        display: ['30px', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        hero: ['44px', { lineHeight: '0.98', letterSpacing: '-0.032em' }],
      },
      borderRadius: {
        card: '16px',
        well: '10px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        pop: 'var(--shadow-pop)',
      },
      spacing: {
        // An 8pt rhythm for section-level gaps.
        section: '28px',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        rise: 'rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        sheen: 'sheen 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      transitionTimingFunction: {
        // A single decelerating curve used across the interface.
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
