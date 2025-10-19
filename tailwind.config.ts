import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        // Redefine the default 'spin' keyframes for a custom effect
        move_up: {
          '0%': { transform: 'translateY(-100px)' },
          '100%': { transform: 'translateY(0px)' }, // Spins twice as fast
        },
        move_down: {
          '0%': { transform: 'translateY(100px)' },
          '100%': { transform: 'translateY(0px)' }, // Spins twice as fast
        },
      },
      animation: {
        // Override the 'animate-spin' utility to use the new keyframes
        spin: 'spin 2s linear infinite',
        move_up: 'move_up 1s linear ease-in-out',
        move_down: 'move_down 1s ease-in-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
