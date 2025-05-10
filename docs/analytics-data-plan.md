# Analytics Dashboard - Real Data Implementation Plan

This document outlines the steps to replace dummy data in the Analytics Dashboard with real data, using Next.js Server Actions for backend logic and aligning with progress calculations from `CoursesDashboard.tsx`.

## 1. Analytics Feature - Requirements Definition

- [x] **Learner Engagement Metrics:** (Formerly User Engagement)
  - [x] **Monthly Active Learners (MAL):** (Formerly MAU)
    - **Definition:** Count of unique learners who have had qualifying activity (e.g., login, key content interaction) within the last 30 rolling days.
    - **Display:** Single number in a `DataCard` and potentially a trend chart in `LearnerEngagement.tsx` (or a similarly named component).
- [x] **Completion Rate Metrics:**
  - [x] **Module Completion Rate (Per Module):**
    - **Definition:** For each module (Course or Assessment type), the percentage of enrolled learners who have successfully completed it.
    - **Display:** List or chart in `CompletionRates.tsx` showing module name and its completion rate.
  - [x] **Overall Module Completion Rate (Summary):**
    - **Definition:** Average completion rate across all modules.
    - **Display:** Single number in a `DataCard`.
- [x] **Product Performance Metrics (Based on `CoursesDashboard.tsx` logic):**
  - [x] **Average Product Progress (Per Product):**
    - **Definition:** For each Product, the average of individual learner's "product progress percentages". A learner's "product progress percentage" for a Product is the average of their `progress_percentage` across all Modules of that Product.
    - **Display:** List or chart in `ProductPerformance.tsx` showing Product name and average progress.
  - [x] **Overall Average Product Progress (Summary):**
    - **Definition:** Grand average of all calculated individual learner-product progress percentages.
    - **Display:** Single number in a `DataCard`.
- [x] **Client Usage Metrics (If B2B model applies):**
  - [x] **Active Learners per Client (MAL per Client):**
    - **Definition:** For each client, count of unique learners associated with that client active in the last 30 days.
    - **Display:** List or chart in `ClientUsage.tsx` showing client name and their MAL.
  - [x] **Average Product Progress per Client:**
    - **Definition:** For each client, average of their learners' "product progress percentages" across all Products those learners engage with.
    - **Display:** List or chart in `ClientUsage.tsx`.
  - [x] **Total Active Learners Across Clients (Summary):**
    - **Definition:** Sum of MAL across all clients.
    - **Display:** Single number in a `DataCard`.

## 2. Backend Development - Analytics Server Actions

Define Next.js Server Actions for fetching analytics data. These actions will typically reside in `.ts` or `.tsx` files (e.g., `app/actions/analytics.ts`) and be marked with `'use server'`. All actions must be protected to ensure only 'Admin' or 'Staff' roles can execute them.

- [x] **Server Action for Monthly Active Learners (MAL):**
  - [x] **Function Signature (example):** `async function getMonthlyActiveLearners(): Promise<{ malCount: number }>`
  - [x] **DB Query Logic:** (As previously defined) Count distinct active learners from `auth.users.last_sign_in_at` or activity log.
- [x] **Server Action for Module Completion Rates:**
  - [x] **Function Signature (example):** `async function getModuleCompletionRates(): Promise<Array<{ moduleId: string, moduleName: string, moduleType: "Course" | "Assessment", completionRate: number, totalEnrolled: number, totalCompleted: number }>>`
  - [x] **DB Query Logic:** (As previously defined) Calculate completion rates per module.
- [x] **Server Action for Product Performance:**
  - [x] **Function Signature (example):** `async function getProductPerformance(): Promise<Array<{ productId: string, productName: string, averageOverallProductProgress: number, totalEngagedLearners: number, totalEligibleLearners: number, completionRate: number, completedCount: number, enrolledCount: number }>>`
  - [x] **DB Query Logic (Implemented):** Calculate average product progress, engaged vs eligible learners, and true completion rates based on all modules a student has access to.
- [x] **Server Action for Client Usage:**
  - [x] **Function Signature (example):** `async function getClientUsage(): Promise<{ clientMetrics?: Array<{ clientId: string, clientName: string, activeLearnersInClient: number, averageProductProgressInClient: number }>, error?: string }>`
  - [x] **DB Query Logic (Implemented):** Count active learners (using is_active flag) per client and calculate average product progress per client based on student progress across all products.
- [x] **Server Action for Summary DataCards:**
  - [x] **Function Signature (example):** `async function getAnalyticsSummary(): Promise<{ summary?: AnalyticsSummary, error?: string }>`
  - [x] **DB Query Logic (Implemented):** Aggregates results from other analytics actions, providing overall MAL, weighted overall product progress, and granular product engagement counts (Eligible, Completed, In Progress, Not Started), and total active learners across clients. Overall module summaries removed as per user request.

## 3. Frontend Development - Analytics Dashboard Integration

Update components in `components/analytics/` to call Server Actions and display real data. Server Actions can be called directly in Server Components or from Client Components (often via `startTransition` for pending/error states), or by fetching in parent Server Components and passing data down.

- [ ] **General Data Fetching Setup:**
  - [ ] Import and call Server Actions directly within analytics Server Components where possible.
  - [x] For Client Components needing data, fetch in the nearest parent Server Component and pass data down as props.
- [ ] **Update `LearnerEngagement.tsx` (or similar):**
  - [ ] Call the `getMonthlyActiveLearners` Server Action.
  - [ ] Display the MAL count and optional trend.
- [x] **Update `UserEngagement.tsx`:**
  - [x] Receives `malCount` and `error` props from parent component.
  - [x] Displays live MAL count.
  - [x] Keeps existing chart structure but uses dummy data (with a note).
- [x] **Update `CompletionRates.tsx`:**
  - [x] Call the `getModuleCompletionRates` Server Action.
  - [x] Display data.
  - [x] Receives `rates` and `error` props from parent component.
  - [x] Displays data in a paginated table.
- [x] **Update `ProductPerformance.tsx`:**
  - [x] Call the `getProductPerformance` Server Action.
  - [x] Display data.
  - [x] Receives `products` and `error` props from parent component.
  - [x] Displays data in a paginated table with granular counts.
- [x] **Update `ClientUsage.tsx`:**
  - [x] Call the `getClientUsage` Server Action.
  - [x] Display data.
  - [x] Receives `clientMetrics` and `error` props from parent component.
  - [x] Displays data in a paginated table.
- [x] **Update `DataCard.tsx` Instances (Summary Cards):**
  - [x] The parent page (`app/(dashboard)/analytics/page.tsx`) now calls `getAnalyticsSummary`.
  - [x] Data is passed down to `AnalyticsDashboard` (Client Component).
  - [x] A new Server Component (`AnalyticsSummaryDataCards`) receives the props and renders the summary cards.

## 4. Integration & Testing

- [x] **Backend Testing (Server Actions):**
  - [x] Test each Server Action function directly (e.g., by calling it within a test environment or dedicated test files).
  - [x] Verify correct data structure and values returned.
  - [x] Test role-based protection mechanisms for each action.
  - [x] Test edge cases and error handling within actions.
- [ ] **Frontend Testing:**
  - [ ] Test components to ensure data from Server Actions is displayed correctly.
  - [ ] Verify loading and error state handling for Server Action calls.
  - [ ] Perform end-to-end testing of the Analytics Dashboard.
- [ ] **Data Accuracy Validation:** (As previously defined) Cross-reference with DB.

## 5. Documentation (Brief)

- [ ] Document the Server Action functions (purpose, parameters, return values, role protection) in your project's relevant documentation (e.g., code comments, internal developer docs).
- [ ] Add comments in the backend (Server Action files) and frontend code explaining complex queries or data transformations.

This plan provides a detailed roadmap. Remember to adapt specific DB queries based on your exact Supabase schema. 