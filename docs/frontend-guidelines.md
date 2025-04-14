# Frontend Development Guidelines

## 1. Overview

This document provides guidelines for the frontend development of the Upskilling Platform, encompassing both the Admin Panel (`/admin`) and the Main App (`/app`). It aims to ensure consistency, maintainability, performance, and adherence to modern best practices, leveraging the Next.js framework with TypeScript.

These guidelines are based on the project's PRD and the `optimized-nextjs-typescript-best-practices-modern-ui-ux` rule.

## 2. Core Principles & Technology

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **UI Library**: React
*   **Styling**: Tailwind CSS (Recommended for utility-first styling)
*   **Component Library**: Shadcn UI / Radix UI (Recommended for accessible, unstyled primitives)
*   **Architecture**: Prioritize React Server Components (RSC) and Next.js Server-Side Rendering (SSR) features. Minimize client-side rendering and state (`'use client'`, `useEffect`, `useState`).
*   **Code Style**: Adhere to functional and declarative programming patterns. Follow project linting and formatting rules (ESLint, Prettier).
*   **Mobile First**: Design and implement UI with a mobile-first approach, ensuring full responsiveness across common device sizes (smartphones, tablets, desktops) as required by the PRD.
*   **Accessibility (a11y)**: Strive for WCAG compliance. Use semantic HTML and ARIA attributes where necessary. Leverage accessible component primitives (e.g., from Radix UI).

## 3. Code Structure & Organization

*   **Monorepo Structure**: Frontend code for both `/admin` and `/app` will reside within the Next.js application structure, likely utilizing route groups or distinct sections within the `app` directory (e.g., `app/(dashboard)` seems to be in use for Admin/Main sections).
*   **Directory Naming**: Use `lowercase-with-dashes` for directory names (e.g., `components/auth-forms`, `app/(dashboard)/users`).
*   **Component Structure**: Organize components logically (Confirmed structure in `components/`):
    *   `components/ui`: General UI primitives (Likely Shadcn UI based on convention).
    *   `components/common`: Shared components used across both Admin Panel and Main App (if any).
    *   `components/admin`: Components specific to the Admin Panel (Likely within feature folders like `users`, `clients`, etc.).
    *   `components/app`: Components specific to the Main App (Likely within feature folders).
    *   Specific feature components exist (e.g., `dashboard`, `users`, `clients`, `products`, `modules`, `question-banks`, `analytics`).
    *   Core layout components like `dashboard-header.tsx` and `dashboard-sidebar.tsx` exist directly in `components/`.
*   **File Structure**: Within a component or feature directory:
    *   Exported component (`index.tsx` or `component-name.tsx`).
    *   Sub-components (if complex).
    *   Helper functions (`lib/` or `utils/` subdirectories).
    *   Static content/constants.
    *   Type definitions (`types.ts` or co-located).
*   **Base Layouts**: Core layout (`app/layout.tsx`) includes shared providers like `ThemeProvider` and `SidebarProvider`.
*   **Component Library**: Shadcn UI is strongly indicated by the `components/ui` directory and likely used for accessible primitives.

## 4. Component Development

*   **React Server Components (RSC)**: Default to RSC for data fetching and rendering static or server-rendered content. Use RSC for components that don't require interactivity or browser APIs.
*   **Client Components**: Use `'use client'` directive *only* when necessary (e.g., for event handlers, state management hooks like `useState`/`useEffect`, browser APIs).
    *   Keep Client Components small and push state/effects down the tree as much as possible.
    *   Pass RSCs as children or props to Client Components where feasible (`<ClientComponent><ServerComponent /></ClientComponent>`).
*   **Props**: Use clear, descriptive prop names. Define types/interfaces for props.
*   **Naming**: Use descriptive variable names (e.g., `isLoading`, `hasError`, `assessmentData`).
*   **Readability**: Write concise, clean code. Use comments for complex logic only.
*   **JSDoc**: Use JSDoc comments for functions and components to enhance documentation and IDE IntelliSense.

## 5. Styling

*   **Tailwind CSS**: Utilize utility classes for styling. Configure `tailwind.config.js` with project-specific themes (colors, spacing, fonts).
*   **Consistency**: Maintain a consistent visual design across both Admin Panel and Main App, adhering to the UI/UX highlights in the PRD (clean, professional, clear hierarchy).
*   **Responsiveness**: Implement responsive design using Tailwind's breakpoint utilities (`sm:`, `md:`, `lg:`, etc.). Test thoroughly on different screen sizes.

## 6. State Management

*   **Server State**: Manage server state (data fetched from the API/database) using solutions like TanStack React Query (v5+) or potentially Next.js's built-in caching and data fetching mechanisms with RSC.
*   **Client State**: For client-side state:
    *   Prefer local component state (`useState`, `useReducer`) for component-specific logic.
    *   Use React Context API for simple state sharing between closely related components.
    *   Consider Zustand for more complex global or cross-component client state if needed, but use sparingly.
*   **Avoid Overuse of Global State**: Minimize reliance on global state stores. Fetch data at the component level where possible, especially with RSCs.
*   **Course/Assessment State**: Handle specific state requirements like assessment timers and course progress/resume functionality within their respective client components, potentially using local state or context.

## 7. Data Fetching & API Interaction

*   **RSC Data Fetching**: Fetch data directly within RSCs using `async/await`. Leverage Next.js caching (`fetch` extensions, `cache`) for performance.
*   **Client Data Fetching**: Use TanStack React Query or similar libraries (like SWR) within Client Components for features requiring client-side fetching, mutations, caching, and background updates.
*   **API Endpoints**: Interact with backend API routes defined within the Next.js application or directly with Supabase functions if applicable.
*   **Loading States**: Always provide clear loading indicators (e.g., skeletons, spinners) during data fetching operations.
*   **Error Handling**: Implement robust error handling for API calls. Display user-friendly error messages. See Section 8.

## 8. Error Handling & Validation

*   **Client-Side Validation**: Use Zod for validating form inputs and other user-provided data before submission.
*   **Error Boundaries**: Implement React Error Boundaries to catch rendering errors in component subtrees and display fallback UI.
*   **API Errors**: Handle API errors gracefully. Use `try...catch` blocks or error handling mechanisms provided by data fetching libraries.
*   **Guard Clauses**: Use guard clauses and early returns to handle preconditions and invalid states cleanly.
*   **User Feedback**: Provide clear, actionable feedback for errors (e.g., using toast notifications, inline form errors).
*   **Edge Cases**: Consider edge cases outlined in the PRD (e.g., assessment time expiration, network errors during video load/assessment submission).

## 9. Performance Optimization

*   **Code Splitting**: Leverage Next.js automatic code splitting. Use dynamic imports (`next/dynamic`) for large components or libraries that are not needed immediately.
*   **Image Optimization**: Use `next/image` for automatic image optimization (resizing, format conversion to WebP, lazy loading).
*   **Minimize Client Bundle Size**: Be mindful of dependencies added to Client Components. Audit bundle size periodically.
*   **Memoization**: Use `React.memo` for functional components and `useMemo`/`useCallback` hooks judiciously to prevent unnecessary re-renders in Client Components.
*   **Debouncing/Throttling**: Apply debouncing or throttling for expensive operations or frequent events (e.g., search inputs, window resize).
*   **Video Performance**: Ensure efficient loading and playback of course videos (MP4s from Supabase Storage). Consider optimizing video files and potentially exploring streaming solutions later if needed.

## 10. Specific UI/UX Considerations (from PRD)

*   **Admin Panel**: Focus on efficient data management interfaces (tables, forms) for managing users, clients, products, modules, and question banks. Ensure role-based views are correctly implemented. **Include an "Export to Excel" button in relevant progress monitoring views.**
*   **Main App**: Prioritize a clear and intuitive student experience.
    *   **Dashboard**: Implement the hierarchical Product > Module structure effectively. Use visual cues (icons, progress bars/percentages, status tags) for module status and progress.
    *   **Course Module**: Ensure seamless sequential navigation, reliable MP4 video playback (using a suitable player library if needed), and accurate progress tracking/resume functionality.
    *   **Assessment Module**: Implement the timed assessment flow carefully, including clear instructions, a visible timer, straightforward question presentation (MCQ/MSQ), and reliable submission logic (including auto-submit on timeout). Display results clearly.
*   **Feedback**: Provide actionable feedback for all user interactions (loading states, success messages, validation errors, assessment submission confirmation).

## 11. Testing

*   **Unit Testing**: Write unit tests for components and utility functions using Jest and React Testing Library.
*   **Integration Testing**: Test interactions between components and data fetching logic.
*   **End-to-End (E2E) Testing**: Consider E2E tests (e.g., using Playwright or Cypress) for critical user flows (login, course completion, assessment taking).
*   **Focus**: Prioritize testing complex logic, data transformations, and critical UI interactions.

## 12. Documentation

*   **JSDoc**: Document components, props, and complex functions using JSDoc comments.
*   **READMEs**: Maintain README files for complex features or components if necessary.

By following these guidelines, we aim to build a high-quality, performant, and maintainable frontend for the Upskilling Platform. 