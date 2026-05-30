/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sasl: {
          green: '#00A86B',
          'green-light': '#00C97D',
          'green-dark': '#008050',
          orange: '#FF7F11',
          'orange-light': '#FF9A3D',
          'orange-dark': '#E06500',
          dark: '#0f0f1a',
          light: '#F8F9FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'mesh-ping': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'fade-up': 'fadeSlideUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
        'like-pop': 'likePop 0.4s ease-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,168,107,0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(255,127,17,0.6), 0 0 60px rgba(0,168,107,0.2)' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% center' },
          '50%': { backgroundPosition: '200% center' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        likePop: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.3)' },
          '60%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      boxShadow: {
        'sasl': '0 8px 32px rgba(0,168,107,0.1), 0 2px 8px rgba(255,127,17,0.06)',
        'sasl-lg': '0 20px 60px rgba(0,168,107,0.15), 0 8px 20px rgba(255,127,17,0.08)',
        'sasl-inner': 'inset 0 1px 0 rgba(255,255,255,0.8)',
        'glow-green': '0 0 30px rgba(0,168,107,0.3)',
        'glow-orange': '0 0 30px rgba(255,127,17,0.3)',
      },
      backgroundImage: {
        'sasl-gradient': 'linear-gradient(135deg, #00A86B 0%, #059669 30%, #FF7F11 70%, #EA580C 100%)',
        'sasl-radial': 'radial-gradient(ellipse at center, rgba(0,168,107,0.1) 0%, transparent 70%)',
        'mesh-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300A86B' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}