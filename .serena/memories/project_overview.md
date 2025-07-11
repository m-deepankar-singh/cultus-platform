# Cultus Platform - Project Overview

**Cultus Platform** is a full-stack AI-powered upskilling platform for educational institutions featuring:
- Dual-architecture system with Admin Panel and Student App
- AI-driven "Job Readiness" product with simulated interviews
- Adaptive assessments and learning experiences

## Technology Stack
- **Framework**: Next.js 15.2.4 with App Router, TypeScript, React 19  
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with JWT-based role-based access control
- **UI**: Shadcn/ui components, Tailwind CSS, Framer Motion
- **Data Fetching**: TanStack Query v5 with query options pattern
- **AI Integration**: Google Generative AI (@google/genai)
- **Storage**: Supabase Storage + Cloudflare R2 dual strategy
- **Deployment**: Vercel and Cloudflare Workers support

## Route Structure
- `app/(auth)/` - Authentication routes (login, register)
- `app/(app)/app/` - Student application routes (protected)
- `app/(dashboard)/admin/` - Admin panel routes (protected)  
- `app/api/` - API routes with separate admin/ and app/ endpoints