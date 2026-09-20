# SchemaTeX Web - Premium Landing Page

Beautiful, minimal landing page for SchemaTeX RTL visualization tool. Built with React, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- **Luxurious Design**: Premium typography with Geist font family, elegant spacing, and refined aesthetic
- **Scroll Animations**: Hero section smoothly transforms into sticky header on scroll
- **Responsive**: Mobile-first design that looks stunning on all devices
- **Performance**: Optimized with Vite for instant load times
- **Interactive**: Smooth animations and microinteractions using Framer Motion

## Getting Started

```bash
cd web
npm install
npm run dev
```

The app will open at `http://localhost:3000`.

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Header.tsx        # Sticky header with scroll transformation
│   ├── Hero.tsx          # Large hero section with animations
│   ├── Features.tsx      # Feature grid with staggered reveal
│   ├── HowItWorks.tsx    # Step-by-step walkthrough
│   ├── CTA.tsx           # Call-to-action section
│   └── Footer.tsx        # Footer with links
├── hooks/
│   └── useInView.ts      # Intersection observer hook
├── App.tsx               # Main app component
├── main.tsx              # Entry point
└── index.css             # Global styles with Tailwind
```

## Design Philosophy

- **Minimal & Clean**: No clutter, generous white space
- **Premium Typography**: Geist font stack for sophistication
- **Purposeful Motion**: Animations serve the design, not distract
- **Neutral Palette**: Slate-based colors for professional appearance
- **Focus on Content**: Clean layout puts the message first

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Lightning-fast bundler
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Google Fonts** - Geist font family

## Customization

Edit content in individual component files. Styling is handled through Tailwind classes with custom configuration in `tailwind.config.js`.
