# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cultus Platform** is a full-stack AI-powered upskilling platform for educational institutions. It features a dual-architecture system with an Admin Panel for institutional management and a Student App for learning experiences, including an AI-driven "Job Readiness" product with simulated interviews and adaptive assessments.

## Technology Stack

- **Framework**: Next.js 15.2.4 with App Router, TypeScript, React 19
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with JWT-based role-based access control
- **UI**: Shadcn/ui components, Tailwind CSS, Framer Motion
- **Data Fetching**: TanStack Query v5 with query options pattern
- **AI Integration**: Google Generative AI (@google/genai)
- **Storage**: Supabase Storage + Cloudflare R2 for dual storage strategy
- **Deployment**: Vercel and Cloudflare Workers support

## Development Commands

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Production build
pnpm lint                   # Run ESLint
pnpm start                  # Start production server

# Testing
pnpm test                   # Run Jest tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Generate coverage reports

# Deployment
pnpm build:vercel           # Build for Vercel
pnpm build:workers          # Build for Cloudflare Workers
pnpm deploy:workers         # Deploy to Cloudflare Workers
pnpm deploy:workers:staging # Deploy to staging
pnpm preview:workers        # Local Cloudflare Workers preview

# Performance & Analysis
pnpm analyze                # Bundle analysis
pnpm performance:baseline   # Lighthouse baseline
pnpm performance:check      # Lighthouse performance check
```

## Architecture Overview

### Route Structure
- **`app/(auth)/`** - Authentication routes (login, register)
- **`app/(app)/app/`** - Student application routes (protected)
  - `dashboard/` - Student dashboard
  - `course/` - Course viewing interface
  - `assessment/` - Assessment taking
  - `job-readiness/` - AI-powered Job Readiness product
- **`app/(dashboard)/admin/`** - Admin panel routes (protected)
- **`app/api/`** - API routes with separate admin/ and app/ endpoints

### Key Directories
- **`components/`** - React components (ui/, admin/, job-readiness/)
- **`lib/`** - Utilities (supabase/, auth/, ai/, cache/, r2/, schemas/)
- **`hooks/`** - Custom React hooks (queries/, mutations/, job-readiness/)
- **`supabase/`** - Database migrations and functions

### Authentication & Authorization
- **Role-based system**: Admin, Staff, Viewer, Client Staff, Student
- **JWT claims validation** in middleware.ts
- **Row-Level Security (RLS)** policies for data isolation
- **Route protection** via middleware examining user roles

## Development Conventions

### Code Style (from .cursor/rules/)
- Use **functional components** with TypeScript
- **Minimize `'use client'`** - prefer React Server Components
- **Named exports** over default exports
- **Kebab-case** for directories, **PascalCase** for components
- **Descriptive variable names** with auxiliary verbs (isLoading, hasError)

### Data Fetching Patterns
- **TanStack Query v5** with query options pattern
- **Infinite queries** for admin tables with virtualization
- **Optimistic updates** with rollback for mutations
- **Centralized query keys** in `lib/query-keys.ts`
- **Query options** in `lib/query-options.ts` for reusable patterns

### Admin Table Architecture
- **Virtualized tables** using react-window for 60 FPS performance
- **Naming pattern**: `virtualized-{entity}-table.tsx`
- **Server wrappers**: `virtualized-{entity}-table-wrapper.tsx`
- **Infinite scrolling** with pagination and filtering
- **Memory optimization** for large datasets (>10,000 rows)

### File Organization
- **Query hooks**: `hooks/queries/{domain}/`
- **Mutation hooks**: `hooks/mutations/{domain}/`
- **Schemas**: `lib/schemas/` using Zod validation
- **AI services**: `lib/ai/` with modular service architecture

## Key Features

### Job Readiness Product
- **5-star progression system** (Bronze/Silver/Gold tiers)
- **AI-generated assessments** tailored to performance
- **Video interview simulation** with AI analysis
- **Real-world project grading** with AI feedback
- **Promotion exam system** for tier advancement

### Multi-Tenant Architecture
- **Client-based data isolation** using RLS policies
- **Hierarchical access control** (Client → Students → Products → Modules)
- **Customizable product configurations** per client

### Performance Optimizations
- **Custom cache management** with Redis-style operations
- **CDN integration** for global content delivery
- **Bundle optimization** with webpack analysis
- **Image optimization** with WebP format and lazy loading

## Database Schema

### Core Tables
- **clients** - Educational institutions
- **users** - All user accounts with role-based access
- **students** - Student profiles linked to clients
- **products** - Learning products/courses
- **modules** - Course content modules
- **assessments** - Quiz and evaluation data
- **job_readiness_progress** - AI-driven progress tracking

### Security
- **Row-Level Security** enabled on all tables
- **Policy-based access control** by user role and client association
- **JWT token validation** for all database operations

## File Storage Strategy

### Dual Storage System
- **Supabase Storage** - Primary storage for user uploads
- **Cloudflare R2** - CDN-optimized storage for static assets
- **Presigned URLs** for secure direct uploads
- **Metadata tracking** for all uploaded files

## AI Integration

### Services
- **Quiz generation** with difficulty adaptation
- **Project grading** with detailed feedback
- **Interview analysis** with video processing
- **Performance assessment** with learning path optimization

### Best Practices
- **Modular AI services** for different use cases
- **Fallback mechanisms** for service failures
- **Cost optimization** with request batching
- **Background processing** for video analysis

## Testing Strategy

- **Jest** for unit tests with TypeScript support
- **Coverage reports** with detailed metrics
- **Cache performance testing** with dedicated scripts
- **Lighthouse** for performance monitoring

## Deployment

### Vercel Deployment
```bash
pnpm build:vercel
pnpm deploy:vercel
```

### Cloudflare Workers Deployment
```bash
pnpm build:workers
pnpm deploy:workers
```

### Environment Variables
- Check `cloudflare-workers.env.template` for required variables
- Separate configurations for Vercel and Cloudflare Workers
- Database URLs and AI service keys required

## Important Notes

- **Always run `pnpm lint`** before committing changes
- **Use virtualized tables** for admin data management (>1000 rows)
- **Follow RLS policies** when creating new database operations
- **Test AI integrations** with fallback mechanisms
- **Optimize bundle size** using dynamic imports for large components
- **Monitor performance** with Lighthouse and bundle analyzer