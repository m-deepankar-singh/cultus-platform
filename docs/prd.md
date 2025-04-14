# PRD: Upskilling Platform

## 1. Product overview
### 1.1 Document title and version
*   PRD: Upskilling Platform
*   Version: 1.1

### 1.2 Product summary
This document outlines the requirements for a modular upskilling platform designed primarily for university clients. The platform aims to provide a flexible solution where universities can select specific modules, such as assessments and courses, to create customized learning experiences for their students.

The system consists of two main components: an Admin Panel for platform administrators and staff, and a Main App for student users. The platform will be accessible via a single domain with specific paths (`platform.com/admin` and `platform.com/app`). The architecture prioritizes modularity, allowing different clients to have unique combinations of features or share standardized product configurations.

The Admin Panel supports role-based access control for managing clients, products, modules, users, and monitoring progress. The Main App provides students access to their assigned learning Products and nested Modules, enabling them to complete courses and assessments while tracking their progress. Both applications will be fully functional on mobile devices.

## 2. Goals
### 2.1 Business goals
*   Provide a scalable and customizable upskilling platform for university clients.
*   Enable universities to select and configure specific learning modules (assessments, courses) based on their needs.
*   Streamline platform administration for internal staff and provide appropriate oversight for client staff and stakeholders.
*   Establish a flexible architecture that supports both shared and fully customized product offerings for clients.
*   Generate revenue through university partnerships and platform usage.

### 2.2 User goals
*   **Students:** Access assigned learning Products and Modules easily via a hierarchical dashboard, complete courses and assessments seamlessly, track learning progress accurately, and resume interrupted course sessions.
*   **Platform Admin:** Manage the entire platform lifecycle, including creating and configuring products and modules (using central question banks), managing user roles and permissions, overseeing clients, and ensuring system integrity.
*   **Platform Staff:** Manage client relationships, assign pre-defined products to clients, and manage student access for those clients efficiently (knowing all students under a client get access to all assigned products).
*   **Platform Viewer (Stakeholders):** Gain a high-level overview of student engagement and progress across all participating universities.
*   **Client Staff (University):** Monitor the progress and performance of students specifically from their own institution, and be notified of updates to assigned Products/Modules.

### 2.3 Non-goals
*   Direct-to-consumer sales of courses or assessments to individual learners.
*   Functionality as a marketplace for third-party content creators to sell modules.
*   In-depth social networking features (e.g., student forums, direct messaging).
*   Native mobile applications (iOS/Android) in the initial version. The focus is on a responsive web application functional on mobile.
*   Branching course paths in the initial version.
*   Product/Module versioning in the initial version.
*   Multi-language support (English-only for MVP).
*   Linking external videos (e.g., YouTube) in the initial version; focus is on uploaded videos.

## 3. User personas
### 3.1 Key user types
*   Platform Administrator
*   Platform Staff
*   Platform Viewer
*   Client Staff
*   Student

### 3.2 Basic persona details
*   **Platform Administrator**: The primary technical or product owner responsible for the overall platform configuration, including creating core products, adding/defining modules using central question banks, managing system-level settings, and assigning roles to Platform Staff and Viewers.
*   **Platform Staff**: Internal team members who manage relationships with university clients, onboard new clients, assign pre-defined products to clients, and manage student enrollment/access for specific universities (understanding all students inherit access).
*   **Platform Viewer**: Internal or external stakeholders who require read-only access to view aggregated student progress data across all clients for reporting or oversight purposes.
*   **Client Staff**: University administrators or faculty who need read-only access to monitor the progress and performance data *only* for students associated with their specific university. Receives notifications about updates to assigned Products/Modules.
*   **Student**: End-users (university students) who log into the main application to access and complete the courses and assessments within assigned Products, viewing them in a hierarchical dashboard.

### 3.3 Role-based access
*   **Admin**: Full CRUD (Create, Read, Update, Delete) access within the Admin Panel. Can manage clients, products, modules (including managing course and assessment question banks), all user types (Staff, Viewer, Client Staff, Students), assign roles, configure assessment time limits/scoring, and view all progress data. Only role that can create Products and add Modules to them.
*   **Staff**: Access within the Admin Panel. Can manage assigned clients, assign existing products to clients (updates are immediate), manage student access for those clients (enroll/unenroll - access is client-wide), and view progress data for their assigned clients. Cannot create products or modules or manage question banks.
*   **Viewer**: Read-only access within the Admin Panel. Can view aggregated student progress reports and dashboards across all clients. Cannot modify any data or settings.
*   **Client Staff**: Read-only access within the Admin Panel, restricted to viewing student progress data *only* for their affiliated university/client. Cannot modify data or view data from other clients. Receives notifications on product/module updates.
*   **Student**: Access only to the Main App. Can view assigned Products and nested Modules, interact with module content (watch videos, take quizzes/assessments with potential time limits), and view their own progress (course progress tracked by percentage, assessment by completion/score). No access to the Admin Panel.

## 4. Functional requirements
*   **Admin Panel: User Management** (Priority: High)
    *   Admin can create, view, update, and deactivate Staff, Viewer, and Client Staff accounts.
    *   Admin can assign appropriate roles (Staff, Viewer, Client Staff) to users, associating Client Staff with a specific Client.
    *   Secure authentication mechanism for all Admin Panel users via `platform.com/admin`.
*   **Admin Panel: Client Management** (Priority: High)
    *   Admin/Staff can create, view, update, and manage university clients.
    *   Client records should include relevant details (name, contact info, associated Client Staff users).
*   **Admin Panel: Product Management** (Priority: High)
    *   Admin can create, view, update, and manage Products.
    *   A Product acts as a container for one or more Modules.
    *   Updates to Products/Modules are immediate for all assigned clients. Admins/Staff should coordinate updates.
*   **Admin Panel: Module Management** (Priority: High)
    *   Admin can add and configure specific Modules (Assessment, Course) within a Product.
    *   Configuration options for Assessment modules (e.g., question types - MCQ/MSQ, time limits per assessment, score per question).
    *   Configuration options for Course modules (e.g., linking uploaded videos, adding quizzes from the course question bank). Courses follow a strictly linear/sequential structure.
*   **Admin Panel: Question Bank Management** (Priority: High)
    *   Admin can manage separate central question banks for Course quizzes and Assessments.
    *   Admin can create, edit, delete, and potentially tag questions within the banks.
    *   Questions from the banks can be reused across multiple Course/Assessment Modules.
*   **Admin Panel: Product Assignment** (Priority: High)
    *   Admin/Staff can assign one or more existing Products to a Client.
*   **Admin Panel: Student Management** (Priority: High)
    *   Admin/Staff can add/invite/enroll students and associate them with a specific Client.
    *   All students enrolled under a client automatically gain access to all products assigned to that client. Access control is not per student per product.
    *   Functionality for bulk student import/management (desirable).
*   **Admin Panel: Progress Monitoring** (Priority: High)
    *   Viewer role can access dashboards/reports showing aggregated student progress across all clients.
    *   Client Staff role can access dashboards/reports showing student progress limited to their specific client.
    *   Course completion tracked by percentage threshold (based on completed lessons/quizzes).
    *   Assessment progress tracked by completion status and score (pass/fail derived from score). Timestamps or attempt counts are not tracked in MVP.
    *   **Admin/Staff/Client Staff roles should be able to export detailed learner progress data (per client or overall for Admin) to an Excel file.**
*   **Admin Panel: Notification System** (Priority: Medium)
    *   Mechanism to notify Client Staff (e.g., via email or in-app notification) when a Product/Module assigned to their client is updated by an Admin.
*   **Main App: Authentication** (Priority: High)
    *   Students can securely log in to the Main App via `platform.com/app`.
    *   **Login requires the student's email to have been previously registered/enrolled via the Admin Panel.**
    *   Password reset functionality.
*   **Main App: Dashboard** (Priority: High)
    *   Upon login, students see a hierarchical list of Products assigned to them, with nested Modules (Courses/Assessments) visible within each Product.
    *   Clear indication of progress for each Module (e.g., Not Started, In Progress [%], Completed, Score).
*   **Main App: Assessment Module** (Priority: High)
    *   Students can launch and take assigned assessments (MCQs, MSQs) within the configured time limit.
    *   Interface for answering questions and submitting the assessment.
    *   MSQ scoring is all-or-nothing per question.
    *   Display of results/score upon completion (if configured).
    *   Track assessment completion status and score. No detailed progress tracking during the assessment.
*   **Main App: Course Module** (Priority: High)
    *   Students can launch and engage with assigned courses following a linear sequence.
    *   Embedded video player for uploaded MP4 course content (hosted on Supabase Storage initially).
    *   Integration of quizzes (MCQs) within the course structure, drawing from the course question bank.
    *   Track overall course progress (e.g., percentage completed based on watched videos/completed quizzes).
    *   Students can exit a course and resume later from their last viewed point.
*   **Platform: Modularity & Customization** (Priority: High)
    *   Backend architecture supports associating different combinations of modules with products.
    *   Database schema designed to isolate client data effectively.
    *   Frontend components are reusable and adaptable for different module types.
*   **Platform: Mobile Responsiveness** (Priority: High)
    *   Both Admin Panel and Main App UI must be fully functional and usable on common mobile device screen sizes (smartphones, tablets).

## 5. User experience
### 5.1. Entry points & first-time user flow
*   **Admin Panel Users (Admin, Staff, Viewer, Client Staff):** Access via `platform.com/admin`. Login using credentials provided by the Admin. First login may require password setup. Dashboard tailored to role permissions.
*   **Students (Main App Users):** Access via `platform.com/app`. Login using credentials provisioned by Admin/Staff. Dashboard displays assigned learning Products hierarchically, with Modules nested inside.

### 5.2. Core experience
*   **Admin creates a product:** Admin logs into Admin Panel -> Navigates to 'Products' -> Clicks 'Create New Product' -> Enters product details -> Navigates to 'Modules' section within the new product -> Adds 'Course Module' -> Configures linear course structure (adds lessons, uploads MP4 video for each, adds quizzes using course question bank) -> Adds 'Assessment Module' -> Configures assessment (adds MCQ/MSQ questions from assessment question bank, sets time limit, defines score per question).
    *   Use intuitive forms and clear navigation between product and module creation/editing. Provide access to question banks during module configuration.
*   **Staff assigns product & enrolls students:** Staff logs into Admin Panel -> Navigates to 'Clients' -> Selects a Client -> Navigates to 'Assigned Products' -> Clicks 'Assign Product' -> Selects the product -> Navigates to 'Students' section for the Client -> Enrolls students (manually or bulk upload). Staff understands enrollment grants access to *all* assigned products for that client.
    *   Provide clear workflows for assigning resources and managing student lists per client.
*   **Student takes a course:** Student logs into Main App -> Expands an assigned 'Product' on dashboard -> Clicks on the nested 'Course' Module -> Follows the linear sequence: Watches introductory video -> Navigates to next lesson/video -> Takes an embedded quiz -> Exits course -> Logs back in later -> Clicks same course -> System resumes playback/position from where they left off.
    *   Ensure seamless MP4 playback, intuitive sequential navigation within the course, and reliable progress saving based on percentage completion.
*   **Student takes an assessment:** Student logs into Main App -> Expands an assigned 'Product' -> Clicks on the nested 'Assessment' Module -> Reads instructions, noting the time limit -> Starts assessment -> Answers series of MCQ/MSQ questions within the time limit -> Submits assessment -> Views score/result (if applicable).
    *   Present questions clearly, provide straightforward navigation, enforce time limit, ensure reliable submission, apply all-or-nothing MSQ scoring, and display results appropriately.
*   **Client Staff views progress:** Client Staff logs into Admin Panel -> Views dashboard pre-filtered for their university -> Navigates to 'Progress Reports' -> Selects a specific Product -> Views progress for nested Course (% complete) and Assessment (completion status/score) for their students. Receives notifications if Admin updates the Product/Modules.
    *   Display data clearly using tables or charts; ensure filtering options are intuitive and restricted correctly. Highlight recent updates if applicable.

### 5.3. Advanced features & edge cases
*   Handling assessment submission precisely when the time limit expires.
*   Concurrent student sessions (preventing issues if logged in on multiple devices).
*   Error handling for failed video loads or assessment submissions (e.g., network issues).
*   Admin/Staff coordination regarding immediate updates to live Products/Modules. Need for clear communication channels or scheduling.
*   Accessibility considerations (WCAG compliance).
*   Password complexity rules and recovery mechanisms.
*   Archiving or soft-deleting clients, products, or users instead of permanent deletion.
*   Managing the question banks effectively as they grow.

### 5.4. UI/UX highlights
*   Clean, professional, and consistent design across both Admin Panel and Main App.
*   Clear visual hierarchy and information architecture, including the hierarchical Product/Module view on the student dashboard.
*   Fully responsive design, ensuring usability on desktop, tablet, and smartphone screen sizes.
*   Actionable feedback for user interactions (e.g., confirmation messages, loading indicators, time remaining for assessments).
*   Intuitive navigation and clear labeling of all features and functions in English (MVP).

## 6. Narrative
Priya is a Platform Administrator tasked with creating versatile upskilling tools for universities. She needs a system that's both powerful and flexible. She uses the new platform's Admin Panel (`platform.com/admin`) to define a "Data Science Fundamentals" product. She adds a Course module with sequentially ordered lessons, uploading MP4 videos and adding quizzes using the central course question bank. She then adds an Assessment module, selecting MCQs/MSQs from the assessment bank and setting a 60-minute time limit. John, a Platform Staff member, assigns this product to "Metropolis University." He enrolls 50 computer science students, knowing they will all instantly see this Product on their dashboards. Maria, one of the students, logs into the Main App (`platform.com/app`) on her tablet, sees the "Data Science Fundamentals" Product, expands it, completes the Course module over a few evenings (appreciating the resume functionality), and then successfully passes the timed Assessment. Prof. Davis, the Client Staff representative, logs into the Admin Panel, easily reviews Maria's progress (course % completion, assessment score) alongside her peers for just his university, having received a notification earlier when Priya slightly updated one of the quiz questions.

## 7. Success metrics
### 7.1. User-centric metrics
*   Student course completion rate (based on reaching percentage threshold).
*   Student assessment average scores and pass rates (%).
*   Student active usage time (average session duration, frequency of logins).
*   Task success rate for Admin/Staff (e.g., time to create client, assign product, enroll student, create/update module).
*   User satisfaction surveys (CSAT/NPS) for Students, Admin, Staff, and Client Staff.
*   Feature adoption rate for Course vs. Assessment modules.
*   Mobile vs. Desktop usage ratio for Main App and Admin Panel.

### 7.2. Business metrics
*   Number of active university clients.
*   Client churn rate (%).
*   Total number of active student users.
*   Product attachment rate (average number of products used per client).
*   Monthly Recurring Revenue (MRR) or Annual Contract Value (ACV).

### 7.3. Technical metrics
*   Application uptime / Availability (target > 99.9%) for `platform.com/app` and `platform.com/admin`.
*   Average API response time (ms).
*   Page load speed (Core Web Vitals) on desktop and mobile.
*   Error rate (frontend/backend exceptions per 1000 requests).
*   Database connection pool usage and query performance (especially progress tracking).
*   Scalability events (successful auto-scaling instances on Vercel/Supabase).
*   Video start-up time and buffering frequency (from Supabase Storage).

## 8. Technical considerations
### 8.1. Integration points
*   **Authentication:** Supabase Auth for handling all user logins, password management, and session control for `platform.com/admin` and `platform.com/app`.
*   **Database:** Supabase Database (PostgreSQL) for storing all application data, including centralized question banks.
*   **Storage:** Supabase Storage (S3 compatible) for hosting uploaded MP4 course video files. (Future: Consider Cloudflare R2).
*   **Deployment:** Vercel for CI/CD and hosting of the Next.js application (frontend and backend API routes) accessible via a single domain with paths.

### 8.2. Data storage & privacy
*   Implement row-level security (RLS) in Supabase rigorously to enforce data isolation between clients and user roles.
*   Store sensitive data like assessment answers securely. Use appropriate encryption where necessary.
*   Ensure compliance with relevant data privacy regulations (e.g., GDPR).
*   Regular automated backups configured within Supabase.
*   Anonymize or aggregate data for cross-client reporting viewed by the Viewer role.

### 8.3. Scalability & performance
*   Leverage Vercel's serverless architecture for automatic scaling.
*   Optimize database queries, especially for progress tracking and question bank retrieval. Use indexing effectively.
*   Monitor Supabase resource usage (database, storage, auth) and plan for tier upgrades.
*   Optimize video delivery from Supabase Storage. CDN integration is deferred but consider for future performance scaling.
*   Ensure performant mobile experience through responsive design and optimized asset loading.

### 8.4. Potential challenges
*   Implementing and testing RLS thoroughly for all roles and data access patterns.
*   Designing efficient schemas for question banks and linking them to modules.
*   Managing large volumes of student progress data efficiently (percentage tracking for courses).
*   Ensuring smooth video streaming performance across devices and network conditions.
*   Communication and coordination around immediate product/module updates affecting live clients.
*   Ensuring Admin Panel and Main App provide a seamless experience on various mobile device sizes and browsers.

## 9. Milestones & sequencing
### 9.1. Project estimate
*   Large: 6-10 weeks (for Minimum Viable Product including core roles and modules)

### 9.2. Team size & composition
*   Medium Team: 3-5 total people
    *   1 Product Manager, 2-3 Full-stack Engineers (Next.js/Supabase), 1 QA Specialist

### 9.3. Suggested phases
*   **Phase 1:** Foundation & Admin Core (3-4 weeks)
    *   Key deliverables: Tech stack setup, Admin Panel login (`platform.com/admin`), User management (Admin, Staff, Viewer, Client Staff roles), Client management, Product management (basic CRUD), Basic database schema, Mobile responsive layout shell for Admin Panel.
*   **Phase 2:** Module & Question Bank Implementation (3-4 weeks)
    *   Key deliverables: Module management within Products (Admin adds Course/Assessment), Assessment module backend (question association, submission logic, time limits, scoring), Course module backend (video upload to Supabase Storage, linear structure, quiz association), Central Question Bank management UI/API (Admin only), Product assignment logic (Staff).
*   **Phase 3:** Student App & Core Functionality (3-4 weeks)
    *   Key deliverables: Main App login (`platform.com/app`), Student hierarchical dashboard (Product > Module), Assessment module frontend (taking timed MCQs/MSQs, all-or-nothing scoring), Course module frontend (MP4 video player, basic quiz interaction, progress save/resume), Basic progress tracking implementation (course %, assessment score), Basic Client Staff view, Mobile responsive layout/functionality for Main App.
*   **Phase 4:** Roles, Notifications & Polish (2-3 weeks)
    *   Key deliverables: Implement Staff, Viewer, Client Staff permissions accurately, Implement notification system for Client Staff on updates, Refine progress dashboards, Bulk student import (CSV), Comprehensive testing (including mobile), Bug Fixing, Deployment preparation.

## 10. User stories

### 10.1. Admin login
*   **ID**: US-001
*   **Description**: As a Platform Administrator, I want to securely log into the Admin Panel (`platform.com/admin`) so that I can manage the platform.
*   **Acceptance criteria**:
    *   An Admin Panel login page exists at `platform.com/admin`.
    *   I can enter my email and password.
    *   Upon successful authentication via Supabase Auth, I am redirected to the Admin dashboard.
    *   If authentication fails, an appropriate error message is displayed.
    *   Password reset functionality is available.
    *   Login form is usable on desktop and mobile devices.

### 10.2. Admin manages platform staff
*   **ID**: US-002
*   **Description**: As a Platform Administrator, I want to create, view, update, and deactivate Platform Staff accounts so that I can manage my team's access.
*   **Acceptance criteria**:
    *   There is a user management section in the Admin Panel.
    *   I can filter the user list to show only Platform Staff.
    *   I can create a new user account with the 'Staff' role, providing necessary details (e.g., name, email).
    *   The new Staff user receives necessary credentials or instructions to log in.
    *   I can view a list of existing Staff users.
    *   I can edit the details of a Staff user.
    *   I can deactivate/activate a Staff user account.

### 10.3. Admin manages viewer users
*   **ID**: US-003
*   **Description**: As a Platform Administrator, I want to create, view, update, and deactivate Platform Viewer accounts so that I can grant stakeholders viewing permissions.
*   **Acceptance criteria**:
    *   In the user management section, I can filter the user list to show only Platform Viewers.
    *   I can create a new user account with the 'Viewer' role, providing necessary details.
    *   The new Viewer user receives credentials to log in.
    *   I can view a list of existing Viewer users.
    *   I can edit the details of a Viewer user.
    *   I can deactivate/activate a Viewer user account.

### 10.4. Admin manages client staff users
*   **ID**: US-004
*   **Description**: As a Platform Administrator, I want to create and manage Client Staff accounts and associate them with specific clients, so that university personnel can monitor their students.
*   **Acceptance criteria**:
    *   When creating or editing a user, I can assign the 'Client Staff' role.
    *   If assigning the 'Client Staff' role, I must associate the user with one specific Client (University).
    *   I can view Client Staff users and see which Client they are associated with.
    *   I can update the associated Client for a Client Staff user.
    *   I can deactivate/activate Client Staff user accounts.

### 10.5. Admin manages clients (universities)
*   **ID**: US-005
*   **Description**: As a Platform Administrator, I want to create, view, update, and manage client (university) records so that I can organize the platform's customers.
*   **Acceptance criteria**:
    *   There is a client management section in the Admin Panel.
    *   I can create a new client record with relevant details (e.g., University Name, Contact Person, Email).
    *   I can view a list of all existing clients.
    *   I can search or filter the client list.
    *   I can edit the details of an existing client.
    *   I can view which Client Staff users are associated with a client.
    *   (Optional) I can mark a client as inactive.

### 10.6. Admin creates products
*   **ID**: US-006
*   **Description**: As a Platform Administrator, I want to create new products (containers for modules) so that I can define the learning offerings.
*   **Acceptance criteria**:
    *   There is a product management section in the Admin Panel.
    *   I can create a new product, giving it a name and description.
    *   Newly created products are listed in the product management view.
    *   I can view and edit the details of existing products.
    *   I can delete a product (UI warns about implications if assigned to clients).

### 10.7. Admin manages question banks
*   **ID**: US-007
*   **Description**: As a Platform Administrator, I want to manage separate central question banks for Course quizzes and Assessments so that I can reuse questions efficiently.
*   **Acceptance criteria**:
    *   There is a dedicated section in the Admin Panel for managing Question Banks.
    *   I can view/switch between the Course Quiz bank and the Assessment bank.
    *   Within each bank, I can create new questions (specifying type: MCQ for both, MSQ for Assessment bank).
    *   I can input question text, options, and mark correct answer(s).
    *   I can edit and delete existing questions in the banks.
    *   (Optional) I can add tags to questions for better organization.

### 10.8. Admin adds course module to product
*   **ID**: US-008
*   **Description**: As a Platform Administrator, I want to add and configure a sequential Course module within a product, using uploaded videos and the course question bank, so that I can build structured learning content.
*   **Acceptance criteria**:
    *   When viewing/editing a product, I can add a 'Course' module.
    *   I can define a linear sequence of lessons within the course.
    *   For each lesson, I can upload an MP4 video file (stored in Supabase Storage).
    *   For each lesson, I can optionally add a Quiz by selecting MCQ questions from the Course Question Bank.
    *   The sequence of videos and quizzes is saved as the course structure.
    *   Updates to the module structure or content are immediate (no versioning).

### 10.9. Admin adds assessment module to product
*   **ID**: US-009
*   **Description**: As a Platform Administrator, I want to add and configure an Assessment module within a product, using the assessment question bank and setting time/scoring rules, so that I can create tests.
*   **Acceptance criteria**:
    *   When viewing/editing a product, I can add an 'Assessment' module.
    *   I can select MCQ and MSQ questions from the Assessment Question Bank to include.
    *   I can set an overall time limit for the assessment.
    *   I can set a score value for each question.
    *   MSQ questions will use all-or-nothing scoring logic.
    *   The assessment configuration (questions, time limit, scoring) is saved.
    *   Updates to the module are immediate.

### 10.10. Staff manages clients
*   **ID**: US-010
*   **Description**: As a Platform Staff member, I want to view and manage client details within the Admin Panel so that I can support our university partners.
*   **Acceptance criteria**:
    *   When I log into the Admin Panel, I can navigate to the client management section.
    *   I can view the details of clients.
    *   I can update client information (if permissions allow).
    *   I can view associated Client Staff and Students for a client.

### 10.11. Staff assigns product to client
*   **ID**: US-011
*   **Description**: As a Platform Staff member, I want to assign existing products to a client, understanding that updates are immediate, so that their students can access the relevant learning materials.
*   **Acceptance criteria**:
    *   When viewing a client's details, there is an option to manage assigned products.
    *   I can see a list of available products (created by the Admin).
    *   I can select one or more products to assign to the client.
    *   I can view the list of products currently assigned to the client.
    *   I can unassign a product from a client (UI warns about implications for enrolled students).

### 10.12. Staff manages student enrollment for a client
*   **ID**: US-012
*   **Description**: As a Platform Staff member, I want to enroll and manage students for a specific client, knowing that all enrolled students get access to all products assigned to that client, **which enables them to log into the Main App (`platform.com/app`)**, so that they gain access to the platform.
*   **Acceptance criteria**:
    *   When viewing a client's details, there is an option to manage students.
    *   I can manually add a new student (name, email), which creates their login credentials for `platform.com/app` **and marks them as an enrolled student**. 
    *   I can view a list of students enrolled under that client.
    *   I can remove/deactivate a student's enrollment for that client **(which should prevent future logins)**.
    *   A bulk upload mechanism (e.g., CSV import) exists for adding multiple students at once **and enrolling them**.
    *   Successfully enrolled students can immediately log in and see all Products assigned to their client.

### 10.13. Client Staff login
*   **ID**: US-013
*   **Description**: As a Client Staff member, I want to securely log into the Admin Panel (`platform.com/admin`) so that I can monitor my institution's student progress.
*   **Acceptance criteria**:
    *   I can use the Admin Panel login page with my provided credentials.
    *   Upon successful authentication, I am redirected to a dashboard specific to my role and client affiliation.
    *   Access is restricted to viewing progress data for my client only.
    *   If authentication fails, an appropriate error message is displayed.
    *   Login form is usable on desktop and mobile devices.

### 10.14. Client Staff views student progress
*   **ID**: US-014
*   **Description**: As a Client Staff member, I want to view the progress (% completion for courses, score/status for assessments) of students from *my* university only, so that I can track their performance.
*   **Acceptance criteria**:
    *   The dashboard/reporting section shows data only for students associated with my client record.
    *   I can view a list of my students and their overall progress per assigned Product/Module.
    *   I can see course completion status (e.g., "In Progress [60%]", "Completed").
    *   I can see assessment completion status and scores (e.g., "Completed - Score: 85%", "Completed - Failed").
    *   I cannot view data related to students from other universities.

### 10.15. Client Staff receives update notifications
*   **ID**: US-015
*   **Description**: As a Client Staff member, I want to be notified when a Product or Module assigned to my university is updated by an Admin, so I am aware of changes affecting my students.
*   **Acceptance criteria**:
    *   When an Admin updates a Product/Module that is assigned to my client, a notification is generated.
    *   The notification is delivered (e.g., via email or an in-app notification center in the Admin Panel).
    *   The notification indicates which Product/Module was updated.

### 10.16. Viewer login
*   **ID**: US-016
*   **Description**: As a Platform Viewer, I want to securely log into the Admin Panel (`platform.com/admin`) so that I can view aggregated progress data.
*   **Acceptance criteria**:
    *   I can use the Admin Panel login page with my provided credentials.
    *   Upon successful authentication, I am redirected to a dashboard with aggregated views.
    *   Access is strictly read-only.
    *   If authentication fails, an appropriate error message is displayed.

### 10.17. Viewer views aggregated progress
*   **ID**: US-017
*   **Description**: As a Platform Viewer, I want to view aggregated reports showing overall student progress across all clients so that I can understand platform usage.
*   **Acceptance criteria**:
    *   The dashboard presents summarized data (e.g., total active students, average course completion rates per product, average assessment scores per product).
    *   Data is aggregated and anonymized, not showing individual client or student data.
    *   The view is strictly read-only.

### 10.18. Student login
*   **ID**: US-018
*   **Description**: As a Student, I want to securely log into the Main App (`platform.com/app`) using my credentials so that I can access my learning materials on desktop or mobile.
*   **Acceptance criteria**:
    *   A Main App login page exists at `platform.com/app`.
    *   I can enter my email and password.
    *   Upon successful authentication via Supabase Auth **AND verification that my user account is registered as an active, enrolled student associated with a client**, I am redirected to my dashboard.
    *   If authentication fails (wrong password) OR if my authenticated account is not recognized as an enrolled student, an appropriate error message is displayed.
    *   Password reset functionality is available.
    *   Login form is usable on desktop and mobile devices.

### 10.19. Student views hierarchical dashboard
*   **ID**: US-019
*   **Description**: As a Student, I want to see a dashboard listing assigned Products, with their nested Course and Assessment Modules clearly visible, so that I can easily navigate my learning path.
*   **Acceptance criteria**:
    *   After logging in, a dashboard is displayed.
    *   The dashboard lists assigned Products (e.g., "Data Science Fundamentals").
    *   Each Product can be expanded/collapsed to show its nested Modules (e.g., "Course", "Assessment").
    *   Each Module shows my current progress status (e.g., "Not Started", "In Progress [50%]", "Completed", "Score: 85%").
    *   The dashboard layout is clear and usable on desktop and mobile devices.

### 10.20. Student takes a sequential course
*   **ID**: US-020
*   **Description**: As a Student, I want to navigate through a course sequentially, watch uploaded videos, and take integrated quizzes so that I can learn the material in the intended order.
*   **Acceptance criteria**:
    *   Clicking on a Course module opens the course interface.
    *   The interface presents lessons/videos/quizzes in a fixed, linear sequence.
    *   Embedded MP4 videos play correctly.
    *   Integrated quizzes (MCQs) are presented at the appropriate points in the sequence.
    *   I can submit quiz answers and receive feedback/score if configured.
    *   My progress (used for the % completion metric) is tracked as I complete elements in sequence.

### 10.21. Student resumes a course
*   **ID**: US-021
*   **Description**: As a Student, I want the platform to remember my position in a course sequence so that I can easily resume learning from the last completed or viewed item.
*   **Acceptance criteria**:
    *   When I exit a course module, my progress in the sequence is saved.
    *   When I return to the same course later, the platform resumes at the next item in the sequence after my last completed/viewed point.
    *   My previously completed elements are marked as complete.

### 10.22. Student takes a timed assessment
*   **ID**: US-022
*   **Description**: As a Student, I want to take an assessment within the specified time limit, answering MCQ and MSQ questions, and submit it for grading so that I can demonstrate my knowledge under timed conditions.
*   **Acceptance criteria**:
    *   Clicking on an Assessment module opens the assessment interface.
    *   Instructions display the time limit.
    *   A visible timer counts down during the assessment.
    *   Questions (MCQ/MSQ) are presented.
    *   I can select answers (single for MCQ, multiple for MSQ).
    *   I can submit the assessment before the timer runs out.
    *   If the timer runs out, the assessment is automatically submitted with the answers provided so far.
    *   My answers are recorded for scoring (MSQ uses all-or-nothing).

### 10.23. Student views assessment results
*   **ID**: US-023
*   **Description**: As a Student, I want to view my results (score/status) after completing an assessment so that I know how I performed.
*   **Acceptance criteria**:
    *   After submitting an assessment (manually or via timeout), my score or a pass/fail status is displayed (based on Admin configuration).
    *   The assessment status and score on my dashboard are updated accordingly.

### 10.24. Admin/Staff exports learner progress
*   **ID**: US-024
*   **Description**: As an Admin or Staff member, I want to export a detailed progress report for learners (filtered by client for Staff) to an Excel file, so that I can perform offline analysis or share reports.
*   **Acceptance criteria**:
    *   Within the progress monitoring section of the Admin Panel, there is an "Export to Excel" button.
    *   For Staff, the export is automatically filtered to learners within their managed clients.
    *   For Admin, the export includes learners across all clients (or provides filtering options).
    *   Clicking the button triggers a download of an Excel (.xlsx) file.
    *   The Excel file contains columns such as Learner Name, Learner Email, Client/University, Product Name, Module Name, Module Type (Course/Assessment), Course Progress (%), Assessment Score, Assessment Status (Not Started/Completed/Failed).
    *   The export handles a reasonable number of learners efficiently.