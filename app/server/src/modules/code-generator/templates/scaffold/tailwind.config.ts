import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/config/**/*.{ts,tsx}',
    './src/content/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input, var(--border))',
        ring: 'var(--ring, var(--accent))',
        background: 'var(--background)',
        foreground: 'var(--foreground, var(--text-primary))',
        primary: {
          DEFAULT: 'var(--primary, var(--accent))',
          foreground: 'var(--primary-foreground, #ffffff)',
        },
        secondary: {
          DEFAULT: 'var(--secondary, var(--surface))',
          foreground: 'var(--secondary-foreground, var(--text-primary))',
        },
        muted: {
          DEFAULT: 'var(--muted, var(--surface))',
          foreground: 'var(--muted-foreground, var(--text-muted))',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground, #ffffff)',
        },
        card: {
          DEFAULT: 'var(--card, var(--surface-elevated))',
          foreground: 'var(--card-foreground, var(--text-primary))',
        },
        popover: {
          DEFAULT: 'var(--popover, var(--surface-elevated))',
          foreground: 'var(--popover-foreground, var(--text-primary))',
        },
        destructive: {
          DEFAULT: 'var(--destructive, #ef4444)',
          foreground: 'var(--destructive-foreground, #ffffff)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
