# Tech Stack

This document outlines the technology stack chosen for the Upskilling Platform, based on the requirements and considerations detailed in the Product Requirements Document (PRD).

## Core Framework

*   **Framework**: Next.js
    *   **Reasoning**: A full-stack React framework used for both the frontend UI (Admin Panel and Main App) and the backend API layer (via API Routes). Chosen for its integration capabilities, performance features, and seamless deployment experience with Vercel.

## Frontend

*   **Language**: TypeScript / JavaScript
    *   **Reasoning**: Standard languages for Next.js development, enabling type safety and modern JavaScript features.
*   **UI Library**: React
    *   **Reasoning**: The underlying library for Next.js, providing a component-based architecture for building user interfaces.
*   **Styling**: (To be determined - e.g., Tailwind CSS, CSS Modules)
    *   **Note**: The specific styling approach needs confirmation but should prioritize consistency, maintainability, and mobile responsiveness as per the PRD.

## Backend

*   **Runtime**: Node.js
    *   **Reasoning**: The runtime environment for Next.js applications.
*   **API Layer**: Next.js API Routes
    *   **Reasoning**: Integrated solution within the Next.js framework for building backend API endpoints.

## Database

*   **Database**: Supabase Database (PostgreSQL)
    *   **Reasoning**: Managed PostgreSQL service providing the primary data store for users, clients, products, modules, questions, and progress tracking. Chosen for its integration with Supabase Auth, real-time capabilities, and Row-Level Security (RLS) features crucial for data isolation.

## Authentication

*   **Service**: Supabase Auth
    *   **Reasoning**: Handles user authentication (login, password reset, session management) for both the Admin Panel (`platform.com/admin`) and the Main App (`platform.com/app`). Integrates directly with the Supabase Database for user profiles and RLS.

## Storage

*   **Service**: Supabase Storage
    *   **Reasoning**: S3-compatible object storage used for hosting uploaded MP4 course video files. Integrates with the Supabase ecosystem.
    *   **Future Consideration**: Cloudflare R2 mentioned as a potential alternative for future scaling or cost optimization.

## Infrastructure & Deployment

*   **Hosting**: Vercel
    *   **Reasoning**: Platform for deploying the Next.js application (frontend and backend), providing CI/CD, automatic scaling (serverless functions), custom domain support (with paths like `platform.com/admin`, `platform.com/app`), and HTTPS.
*   **CI/CD**: Vercel
    *   **Reasoning**: Integrated continuous integration and deployment pipeline triggered by repository commits.

## Key Considerations from PRD

*   **Row-Level Security (RLS)**: Critical implementation within Supabase to enforce data isolation between clients and user roles.
*   **Scalability**: Leveraging Vercel's serverless architecture and optimizing Supabase database queries.
*   **Mobile Responsiveness**: A primary requirement for both Admin Panel and Main App UIs.
*   **Data Privacy**: Compliance with relevant regulations (e.g., GDPR) must be ensured. 