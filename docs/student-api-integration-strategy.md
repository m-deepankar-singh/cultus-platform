# Student App API Integration Strategy

## 1. Overview
This document outlines the detailed strategy and specific tasks for implementing the general considerations for API integration within the Student UI (Main App), as initially described in Section 5 of `docs/student-ui-backend-integration-plan.md`. The goal is to ensure consistent, robust, and maintainable interactions between the frontend and backend APIs.

## 2. API Client/Wrapper Implementation
**Goal:** Create a standardized way to make API calls from client components, handling authentication, headers, base URLs, and basic error parsing.

-   [ ] **Task: Define Wrapper Structure & Location**
    -   Details: Create a new file, e.g., `lib/api-client.ts` or `lib/fetch-wrapper.ts`.
    -   Details: Define the function signature(s). Consider a single function accepting method, endpoint, payload, etc., or separate functions for GET, POST, PATCH, etc.
    -   Example Signature: `async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }>`
-   [ ] **Task: Implement Base URL Handling**
    -   Details: Prepend the correct base URL (`process.env.NEXT_PUBLIC_APP_URL` or similar) to relative API endpoints passed to the wrapper.
-   [ ] **Task: Implement Default Headers**
    -   Details: Automatically add `Content-Type: application/json` and `Accept: application/json` to requests (where applicable, especially for POST/PATCH).
-   [ ] **Task: Implement Automatic Authentication (Client-Side)**
    -   Details: The Supabase JS client (`createClient` from `@supabase/ssr` used in client components) automatically manages and includes the auth token for same-origin requests. Ensure the wrapper doesn't interfere with this default behavior. *Note: For server components calling internal APIs, auth is handled differently (often via forwarded cookies or direct Supabase client usage).* This wrapper is primarily for client-component-initiated API calls.
-   [ ] **Task: Implement Standardized Response Handling**
    -   Details: Inside the wrapper, check `response.ok`. 
    -   Details: If OK, parse JSON and return `{ data: parsedJson, error: null }`.
    -   Details: If not OK, attempt to parse error details from the response body (if JSON), otherwise use `response.statusText`. Return `{ data: null, error: errorMessage }`.
    -   Details: Handle network errors (e.g., fetch throws) and return `{ data: null, error: networkErrorMessage }`.

## 3. Server State Management (Client-Side)
**Goal:** Use a dedicated library to manage server state fetched via API calls in client components, improving DX and UX with caching, refetching, and state tracking.

-   [ ] **Task: Choose and Install Library**
    -   Details: Select library. Recommendation: TanStack Query (React Query) (`@tanstack/react-query`).
    -   Details: Install using package manager: `pnpm add @tanstack/react-query @tanstack/react-query-devtools`.
-   [ ] **Task: Set up Provider**
    -   Details: Create a `QueryClient` instance.
    -   Details: Wrap the application layout (e.g., in `app/layout.tsx` or a client-side providers component) with `<QueryClientProvider client={queryClient}>`.
    -   Details: Optionally add `ReactQueryDevtools` for debugging.
-   [ ] **Task: Define Query Key Structure**
    -   Details: Establish a consistent convention for query keys (e.g., `['progress']`, `['modules', moduleId]`, `['assessment', assessmentId, 'details']`). Store key factories in a central place if needed.
-   [ ] **Task: Refactor/Implement Data Fetching with `useQuery`**
    -   Details: Identify client components currently fetching data via `useEffect` + `fetch` (or similar).
    -   Details: Replace this logic with `useQuery`, using the API client wrapper created in Step 2 as the query function.
    -   Example: `const { data, isLoading, isError, error } = useQuery({ queryKey: ['progress'], queryFn: () => apiClient<{ products: Product[] }>('/api/app/progress') });`
-   [ ] **Task: Configure Default Options (Optional)**
    -   Details: Configure global defaults for `QueryClient` if needed (e.g., `staleTime`, `cacheTime`).

## 4. Loading and Error State Handling
**Goal:** Provide consistent visual feedback to the user during API interactions.

-   [ ] **Task: Define Standard Loading Components**
    -   Details: Identify or create standard loading indicators (e.g., using Shadcn `Skeleton` for text/blocks, a custom spinner component).
-   [ ] **Task: Define Standard Error Components/Notifications**
    -   Details: Identify or create standard ways to display errors (e.g., using Shadcn `Alert` or `AlertDescription`, or a toast notification library like `sonner`).
-   [ ] **Task: Integrate React Query States into UI**
    -   Details: In components using `useQuery`, use the `isLoading`, `isFetching`, `isError`, and `error` properties to conditionally render loading indicators or error messages.
    -   Example: `if (isLoading) return <LoadingSpinner />; if (isError) return <ErrorMessage error={error?.error} />;`
-   [ ] **Task: Decide on Global vs. Local Loading Strategy**
    -   Details: Determine if a global loading bar/indicator is needed in addition to per-component/per-query indicators.

## 5. Client-Side Validation
**Goal:** Provide immediate feedback for user input in forms before submitting to the API (where applicable).

-   [ ] **Task: Choose and Install Library**
    -   Details: Select library. Recommendation: Zod.
    -   Details: Install using package manager: `pnpm add zod`.
-   [ ] **Task: Integrate with Form Library**
    -   Details: If using a form library (e.g., `react-hook-form`), integrate Zod for schema validation (e.g., using `@hookform/resolvers/zod`).
    -   Details: Install resolver: `pnpm add @hookform/resolvers`.
-   [ ] **Task: Define Schemas**
    -   Details: Identify any student-facing forms that submit data directly (if any beyond simple progress updates).
    -   Details: Create corresponding Zod schemas mirroring expected API payloads.
-   [ ] **Task: Implement Validation Display**
    -   Details: Use form library state to display validation errors inline near form fields.

## 6. Optimistic Updates
**Goal:** Improve perceived performance for frequent, low-risk actions by updating the UI immediately.

-   [ ] **Task: Identify Candidate Actions**
    -   Details: Review student interactions. Good candidates: marking a lesson as watched/completed, simple interactions within a module.
-   [ ] **Task: Implement with React Query `useMutation`**
    -   Details: Use the `onMutate` option of `useMutation` to update the query cache optimistically.
    -   Details: Use `onError` to revert the cache state if the API call fails.
    -   Details: Use `onSettled` to refetch relevant queries to ensure consistency.
-   [ ] **Task: Design Rollback UI**
    -   Details: Ensure the UI gracefully handles the rollback if an optimistic update fails (e.g., temporarily showing the old state, displaying an error message).

## 7. Review and Refinement
-   [ ] **Task: Code Review**
    -   Details: Review implementations of the API client, state management hooks, and UI integrations for consistency and correctness.
-   [ ] **Task: Testing**
    -   Details: Ensure testing plans cover various API interaction scenarios (success, loading, errors, optimistic update success/failure). 