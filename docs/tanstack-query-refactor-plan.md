# TanStack Query Refactoring Plan

## 1. Overview

This document outlines the plan and process for refactoring existing client-side data fetching logic (typically `useEffect` + `fetch`) to use TanStack Query (`@tanstack/react-query`). The goal is to improve server state management, caching, background updates, and overall developer experience for data fetching in client components.

## 2. Prerequisites (Completed)

- [x] **TanStack Query Installation**: `@tanstack/react-query` and `@tanstack/react-query-devtools` are installed.
- [x] **API Client Wrapper**: A standardized API client wrapper (`lib/api-client.ts`) is implemented for making API calls.
- [x] **QueryClientProvider Setup**: The application is wrapped with `<QueryProvider>` (likely in `app/layout.tsx` via `components/providers/query-provider.tsx`), making `QueryClient` available.
  - Initial global defaults set in `QueryClient`: `staleTime: 5 minutes`, `refetchOnWindowFocus: false` to reduce excessive refetching.
- [x] **Query Key Factories**: A centralized file (`lib/query-keys.ts`) for generating query keys is created and populated.

## 3. General Refactoring Steps for Each Component

For each identified client component that fetches data, the following steps will be taken:

1.  **Identify Target**: Confirm the component is a client component (`'use client';`) and uses `useEffect` with `fetch` (or a similar manual fetching pattern) for its primary data.
2.  **Import Dependencies**:
    *   Import `useQuery` from `'@tanstack/react-query'`.
    *   Import the `apiClient` from `'@/lib/api-client'`.
    *   Import the `queryKeys` object from `'@/lib/query-keys'`.
3.  **Remove Old State Management**:
    *   Remove `useState` hooks previously used for storing the fetched data, loading state, and error state related to the data fetch.
4.  **Remove Old Data Fetching Logic**:
    *   Remove the `useEffect` hook that contained the `fetch` call and subsequent state updates (`setData`, `setIsLoading`, `setError`).
5.  **Implement `useQuery` Hook**:
    *   Call `useQuery` at the top level of the component.
    *   **`queryKey`**: Provide a unique and descriptive query key using the appropriate factory from `queryKeys`. Example: `queryKeys.someEntityById(entityId)`.
    *   **`queryFn`**: This asynchronous function will perform the data fetching.
        *   It should call `apiClient` with the correct API endpoint and expected data type.
        *   **Crucially**, if `apiClient` returns an error (e.g., `result.error` is truthy), the `queryFn` **must throw an `Error`** (e.g., `throw new Error(result.error);`). TanStack Query expects errors to be thrown to correctly manage `isError` and `error` states.
        *   If `apiClient` successfully returns data (even if `result.data` is `null`), the `queryFn` should return `result.data`.
    *   **`enabled`**: (Optional) If the query depends on a variable (e.g., an ID from params) that might not be available initially, use the `enabled: !!variableName` option to prevent the query from running until the variable is present.
    *   **Type Hinting**: Specify the expected data type and error type for `useQuery` for better type safety: `useQuery<ExpectedDataType | null, Error>({...})`.
6.  **Handle Data-Dependent Effects**:
    *   If the old `useEffect` (that was removed in step 4) contained logic that needed to run *after* data was successfully fetched (e.g., initializing form state from fetched data, setting up timers based on fetched values), move this logic into a *new* `useEffect` hook.
    *   This new `useEffect` should have the `data` object returned by `useQuery` in its dependency array. Also include `isLoading` and `isError` in the dependency array to ensure the effect only runs when data is truly available and not in a loading or error state. Example: `useEffect(() => { if (data && !isLoading && !isError) { /* logic using data */ } }, [data, isLoading, isError]);`
7.  **Update UI Rendering**:
    *   Use the `isLoading` boolean returned by `useQuery` to display loading indicators (e.g., skeletons).
    *   Use the `isError` boolean and the `error` object (which will be an `Error` instance) returned by `useQuery` to display error messages (e.g., `error?.message`).
    *   Use the `data` object returned by `useQuery` to render the successfully fetched information. Remember that `data` can be `undefined` initially, or `null` if the API successfully returns no data for a valid request.
8.  **Test Thoroughly**:
    *   Verify successful data loading and display.
    *   Verify loading states are shown correctly.
    *   Verify error states (network errors, API errors) are handled gracefully.
    *   Test edge cases (e.g., no data found, invalid IDs).
    *   Check browser console for errors.
    *   Use React Query Devtools to inspect query state.

## 4. Identified Components for Refactor

The following client components have been identified as candidates for refactoring:

### Component 1: Assessment Overview Page

*   **Path**: `app/(app)/app/assessment/[id]/page.tsx`
*   **Current Method**: `useEffect` + `fetch`
*   **API Endpoint**: `/api/app/assessments/[moduleId]/details`
*   **Query Key Factory**: `queryKeys.assessmentDetails(moduleId)`
*   **Status**: **Done**
*   **Notes**: Refactored. Testing indicated a backend issue with timestamp parsing for "null" string values in `assessment_progress`, which was subsequently addressed in the API handler.

### Component 2: Take Assessment Page

*   **Path**: `app/(app)/app/assessment/[id]/take/page.tsx`
*   **Current Method**: `useEffect` + `fetch`
*   **API Endpoint**: `/api/app/assessments/[moduleId]/details`
*   **Query Key Factory**: `queryKeys.assessmentDetails(moduleId)`
*   **Status**: **Done** (Refactored, requires thorough testing by user)
*   **Notes**:
    *   Initial data fetch refactored to `useQuery`.
    *   Logic for initializing `answers` and `timeRemaining` from fetched data moved to a `useEffect` hook dependent on `assessmentData` from `useQuery`.
    *   Local error state (`submissionError`) added for the `handleSubmitAssessment` function to handle errors from the server action, separate from the initial data load error state.

### Component 3: Course Player Page

*   **Path**: `app/(app)/app/course/[id]/page.tsx`
*   **Current Method**: `useEffect` + `fetch` (Presumed, based on earlier search)
*   **API Endpoint**: `/api/app/courses/[moduleId]/content` (Presumed, based on earlier search)
*   **Query Key Factory**: `queryKeys.courseContent(moduleId)` or `queryKeys.moduleById(moduleId)` if "course" and "module" are used interchangeably for the ID. `courseContent` seems more specific if the endpoint is `/content`.
ye*   **Status**: **To Do (Skipped for now - Complex)**
*   **Notes**: Will need to read the file to confirm exact endpoint, data structure, and existing state management before refactoring. Marked as complex and deferred by user.

## 5. Strategy for Discovering Other Components

*   **Semantic Search**: Continue using codebase search for patterns like `fetch(` in files marked with `'use client';` and containing `useEffect`.
*   **Manual Review**: Systematically review components within `app/(app)/...` and `app/(dashboard)/...` directories, particularly those responsible for displaying data fetched from the API.
*   **Network Tab**: Use browser developer tools' network tab during application testing to identify client-side API calls that are not yet managed by TanStack Query.

## 6. Future Work / Considerations (Post-Refactor)

*   **Mutations**: Implement `useMutation` for operations that modify server data (POST, PUT, DELETE requests), such as saving progress, submitting assessments, updating user profiles, etc. This is addressed by the `saveAssessmentProgressAction` and `submitAssessmentAction` in `TakeAssessmentPage` but could be standardized.
*   **Optimistic Updates**: For relevant mutations, consider implementing optimistic updates to improve perceived performance.
*   **Advanced Caching & Refetching Strategies**: 
    *   Continuously review and fine-tune global and per-query `staleTime`, `cacheTime`, `refetchOnWindowFocus`, `refetchOnMount`, and `refetchOnReconnect` settings based on application needs and user experience. The initial global defaults are `staleTime: 5 minutes` and `refetchOnWindowFocus: false`.
    *   Identify queries that benefit from more aggressive or less aggressive caching/refetching.
*   **Pagination and Infinite Scrolling**: For long lists, implement pagination or infinite scrolling patterns using TanStack Query's dedicated hooks if applicable.
*   **Error Handling Standardization**: Develop a more standardized approach for displaying user-facing error messages (e.g., using a global notification/toast system triggered by query errors or mutation errors).

---

This plan should provide a good roadmap. We can add more components to Section 4 as they are identified. 