# Student Dashboard Integration Plan

## 1. Overview
This document provides a detailed step-by-step plan for implementing the Student Dashboard UI and related student-facing pages. The primary component for the dashboard will be an enhanced version of `components/courses-dashboard.tsx`, which now includes expandable module lists. This plan expands on Section 2 of `docs/student-ui-backend-integration-plan.md`.

## 2. Prerequisites
- [X] Backend API `GET /api/app/progress` (or direct database queries via server-side Supabase client) is implemented, tested, and returns the expected data structure.
- [X] Student authentication is fully functional.
- [X] Basic navigation to the dashboard page (`/app/dashboard`) is set up.
- [X] GSAP is installed and basic setup (`lib/gsap.ts`) is complete.
- (Optional) If Club GSAP plugins are required: (details omitted for brevity)

## 3. Frontend Implementation Steps

### 3.0. GSAP Setup and Configuration
-   [X] **Task: Install GSAP**
-   [X] **Task: Register GSAP Plugins**

### 3.1. Dashboard Page (`app/(app)/app/dashboard/page.tsx`) Data Fetching
-   [X] **Task: Implement Data Fetching Logic in RSC**
-   [X] **Task: Pass Fetched Data to `CoursesDashboard` Component**

### 3.2. Enhancing `components/courses-dashboard.tsx` for Real Data & UI States
-   [X] **Task: Modify `CoursesDashboard` to Accept and Process Real Data**
-   [X] **Task: Implement UI States and Error Handling in `CoursesDashboard` (with GSAP)**

### 3.3. Displaying Products and Modules (Dashboard & Product Details Page)

-   [X] **Task: Refine Product Display Logic & Animations on Dashboard**
    -   Details: Product cards on dashboard animate on load/filter change.
-   [X] **Task: Implement Navigation from Product Card to Product Details Page**
    -   Details:
        -   Created placeholder page: `app/(app)/app/product-details/[productId]/page.tsx`.
        -   `CoursesDashboard` product cards now link to `/app/product-details/[productId]`.
-   [X] **Task: Implement Data Fetching for `ProductDetailsPage`**
    -   Details:
        -   Implemented data fetching in `app/(app)/app/product-details/[productId]/page.tsx` (RSC).
        -   Fetches product details, modules, and student progress.
        -   Includes check for student access via client assignment.
        -   Defined necessary TypeScript interfaces.
-   [X] **Task: Implement UI for `ProductDetailsPage`**
    -   Details:
        -   Displays product name and description.
        -   Lists modules using Card components.
        -   Shows module type, name, status, and progress.
        -   Includes CTA button linking to appropriate module page.
-   [X] **Task: (Optional) Implement Expand/Collapse for Product Modules on Dashboard (Animated with GSAP)**
    -   Details: Added state, toggle button, and GSAP animations for expanding/collapsing module lists within dashboard product cards.
-   [X] **Task: (Optional) Adapt Module Item Display on Dashboard**
    -   Details: Implemented rendering for individual modules (name, type, status, link) within the expandable section on dashboard cards.

### 3.4. Layout, Styling, and Responsiveness
-   [X] **Task: Review and Refine Layout (Dashboard & Product Details Page)**
    -   Details: Ensured layout effectively displays products/modules. Maintained consistent spacing/hierarchy.
-   [X] **Task: Apply Consistent Styling (Dashboard & Product Details Page)**
    -   Details: Refined styling for consistency, adjusted spacing, button variants, card appearance.
-   [ ] **Task: Ensure Responsiveness (Dashboard & Product Details Page)**

### 3.5. Accessibility (A11y)
-   [ ] **Task: Ensure Keyboard Navigation (Dashboard & Product Details Page)**
-   [ ] **Task: Implement ARIA Attributes (Dashboard & Product Details Page)**
-   [ ] **Task: Check Color Contrast (Dashboard & Product Details Page)**
-   [ ] **Task: Consider `prefers-reduced-motion` (Dashboard & Product Details Page)**

## 4. Testing
-   [ ] **Task: Unit/Component Tests (`CoursesDashboard`, `ProductDetailsPage`)**
-   [ ] **Task: Integration Tests (Dashboard interactions - including expand/collapse, Product Details Page interactions)**
-   [ ] **Task: End-to-End (E2E) Test (Full student flow from dashboard to product details, module interaction, dashboard expand/collapse)**

## 5. Documentation
-   [X] **Task: Update Relevant Documentation**
    -   Details: This plan is kept up-to-date. `docs/student-ui-backend-integration-plan.md` reflects this plan's role. 