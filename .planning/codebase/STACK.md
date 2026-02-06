# Technology Stack

**Analysis Date:** 2026-02-05

## Languages

**Primary:**
- TypeScript 5 - All source code in `src/` directory
- TSX - React components with TypeScript

**Secondary:**
- JavaScript - Next.js configuration files
- JSON - Configuration and data files

## Runtime

**Environment:**
- Node.js 20.x (inferred from @types/node: ^20)

**Package Manager:**
- npm - Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework with App Router, server actions, API routes
- React 19.2.4 - UI library

**AI & LLM:**
- Genkit 1.2.0 - AI workflow framework (Firebase Google Genkit)
- @genkit-ai/googleai 1.28.0 - Google Generative AI plugin (Gemini models)
- @genkit-ai/firebase 1.8.0 - Firebase integration for Genkit
- @genkit-ai/next 1.8.0 - Next.js integration for Genkit

**State Management & Data Fetching:**
- @tanstack/react-query 5.66.0 - Server state management, caching, mutations
- @tanstack-query-firebase/react 1.0.5 - Firebase integration for React Query

**Form Handling:**
- react-hook-form 7.54.2 - Efficient form state management
- @hookform/resolvers 3.9.0 - Validation resolver support (Zod integration)

**Validation:**
- zod 3.24.2 - TypeScript-first schema validation (AI payload validation, form validation)

**UI Components & Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- tailwindcss-animate 1.0.7 - Animation utilities for Tailwind
- class-variance-authority 0.7.1 - Component variant management
- tailwind-merge 3.4.0 - Tailwind class merging
- Radix UI - Unstyled, accessible component primitives:
  - @radix-ui/react-accordion 1.2.3
  - @radix-ui/react-alert-dialog 1.1.6
  - @radix-ui/react-avatar 1.1.3
  - @radix-ui/react-checkbox 1.1.4
  - @radix-ui/react-dialog 1.1.15
  - @radix-ui/react-dropdown-menu 2.1.6
  - @radix-ui/react-label 2.1.8
  - @radix-ui/react-popover 1.1.6
  - @radix-ui/react-progress 1.1.2
  - @radix-ui/react-select 2.2.6
  - @radix-ui/react-separator 1.1.8
  - @radix-ui/react-slot 1.2.4
  - @radix-ui/react-tabs 1.1.3
  - @radix-ui/react-toast 1.2.6
  - @radix-ui/react-tooltip 1.1.8

**Charts & Data Visualization:**
- recharts 2.15.4 - React charts library (`src/components/ui/chart.tsx` wraps Recharts)

**UI Utilities:**
- cmdk 1.1.1 - Command palette/menu component
- lucide-react 0.475.0 - Icon library
- react-day-picker 9.13.0 - Calendar component
- date-fns 3.6.0 - Date manipulation utilities
- clsx 2.1.1 - Conditional className utility

**Testing:**
- No testing framework detected in dependencies

**Build/Dev:**
- PostCSS 8 - CSS processing (Tailwind dependency)
- ESLint 9.39.2 - Code linting
- eslint-config-next 16.1.4 - Next.js ESLint configuration

## Key Dependencies

**Critical:**
- firebase 11.8.1 - Client-side Firebase SDK (authentication, Firestore)
- firebase-admin 12.2.0 - Server-side Firebase Admin SDK (required for Node.js runtime)
- @google-cloud/logging 11.0.0 - Google Cloud Logging for observability

**Infrastructure:**
- @upstash/redis 1.34.0 - Redis client (HTTP-based, no TLS required)
- @upstash/ratelimit 2.0.2 - Rate limiting via Upstash Redis

**Utilities:**
- dotenv 16.5.0 - Environment variable loading from .env files
- genkit-cli 1.8.0 - CLI for Genkit development

## Configuration

**Environment:**
- Configured via `next.config.js` which reads `FIREBASE_WEBAPP_CONFIG` on Firebase App Hosting
- Falls back to NEXT_PUBLIC_* environment variables in `.env.local` for local development
- Two environment files present:
  - `.env.development.local` - Local development configuration
  - `.env.production.local` - Production configuration (not committed)

**Key Config Files:**
- `tsconfig.json` - TypeScript compilation settings, path aliases (@/* → ./src/*)
- `next.config.js` - Next.js configuration (Firebase config parsing, image patterns, server action limits)
- `firebase.json` - Firebase project configuration (Firestore rules, indexes)
- `.eslintrc.json` - ESLint configuration (extends Next.js core-web-vitals and typescript)
- `components.json` - UI component shadcn/radix configuration
- `firestore.indexes.json` - Firestore composite indexes

**Runtime Configuration:**
- Server Actions: 4MB body size limit (`experimental.serverActions.bodySizeLimit`)
- External Packages: `@genkit-ai/firebase` and `firebase-admin` marked for server-only bundling

## Platform Requirements

**Development:**
- Node.js 20.x
- npm for dependency management
- TypeScript 5 compiler
- ESLint 9 for code quality

**Production:**
- Firebase App Hosting (primary deployment target, provides FIREBASE_WEBAPP_CONFIG at build time)
- Application Default Credentials or explicit Firebase service account credentials
- Gemini API key (Google AI Studio or Google Cloud project)
- Optional: Upstash Redis for rate limiting (falls back to in-memory rate limiting if unavailable)

**Build Output:**
- Next.js optimized static and server-rendered pages
- TypeScript strict mode enabled (strict: true in tsconfig.json)
- Build errors ignored for TypeScript (ignoreBuildErrors: true in next.config.js) - allows build completion with type errors

---

*Stack analysis: 2026-02-05*
