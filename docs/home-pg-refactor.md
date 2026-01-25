# Refactoring Plan: Home Page (`src/app/page.tsx`)

The goal of this refactoring is to improve the structure, performance, and maintainability of the home page by adopting a more modern, hybrid rendering approach using React Server Components (RSC) and Client Components.

## 1. Problem Analysis

The current implementation of the home page at `src/app/page.tsx` has several architectural issues:

*   **Monolithic Client Component:** The entire page is a single client component (`"use client"`). This means even static content like headers and quick action links are rendered on the client, which is suboptimal for performance.
*   **Centralized Data Fetching & Prop Drilling:** It fetches all data (`userProfile`, `workoutLogs`) at the top level and passes it down to child components. This creates tight coupling and makes it harder to manage data dependencies.
*   **Complex State Management:** The component contains complex conditional logic to handle multiple states: loading, error, a welcome state for new users, and the main dashboard view. This makes the component difficult to read and maintain.

## 2. Proposed Solution

To address these issues, we will refactor the home page to a hybrid rendering model:

1.  **Convert `HomePage` to a Server Component (Complete):** The main page at `src/app/page.tsx` has been converted into a React Server Component to handle initial user state checks and render the static layout.
2.  **Create a `HomeDashboard` Client Component (Complete):** The client component at `src/components/home/HomeDashboard.tsx` now fetches and displays all user-specific, dynamic dashboard content.
3.  **Avoid Double-Fetching Profile Data (Complete):** The server-fetched profile is passed into `HomeDashboard` as `initialProfile` and used to seed the client query.
4.  **Encapsulate Data Fetching (Complete):** Data fetching has moved from the page level into `HomeDashboard`.

## 3. Step-by-Step Refactoring Guide

### Step 1: Create `src/components/home/HomeDashboard.tsx` (Complete)

*   **Responsibility:** This will be a client component (`"use client"`) that fetches and renders all the dynamic dashboard widgets.
*   **Actions:**
    *   Move the `useUserProfile` and `useCurrentWeekWorkouts` hooks from `page.tsx` into this new file.
    *   Relocate the associated loading (`Skeleton`) and error (`ErrorState`) handling for this data.
    *   Render the three main dashboard widgets: `WeeklyProgressTracker`, `RecentHistory`, and `WeeklyCardioTracker`.
    *   Accept an optional `initialProfile` prop to seed the client query and avoid a duplicate profile fetch.

### Step 2: Refactor `src/app/page.tsx` (Complete)

*   **Responsibility:** This will become a Server Component responsible for the static page layout and initial user authentication check.
*   **Actions:**
    *   Remove the `"use client"` directive.
    *   Fetch the initial user profile on the server. This will require a server-side function to get the current user's profile (e.g., from `lib/auth.service.tsx` or `lib/firestore-server.ts`).
    *   **Conditional Rendering:**
        *   If no user profile is found, render the "Welcome to FitnessAI" / "Create Your Profile" view. This part will now be server-rendered.
        *   If a profile exists, render the static page layout (`<header>`, Quick Actions `Card`).
    *   **Integrate the Client Component:**
        *   Render the new `<HomeDashboard initialProfile={profile} />` component within the layout for existing users.
        *   Wrap the `<HomeDashboard />` component in a React `<Suspense>` boundary with a fallback skeleton. This will allow the static parts of the page to be displayed immediately while the client-side data for the dashboard is being fetched.

### Step 3: Update `useUserProfile` to support `initialData` (Complete)

*   **Responsibility:** Allow the profile query to be seeded from the server to prevent an immediate duplicate request.
*   **Actions:**
    *   Extend `useUserProfile` to accept an optional `initialData` param that matches the query shape.
    *   Use this as `initialData` in the `useQuery` call.

## 4. Expected Benefits

*   **Improved Performance:** Faster initial page load (FCP/LCP) because the static shell of the page is rendered on the server. The browser receives meaningful HTML content sooner.
*   **Enhanced Maintainability:** The separation of concerns makes the code cleaner. `page.tsx` handles the "what" (which view to show), and `HomeDashboard.tsx` handles the "how" (fetching and showing the dashboard).
*   **Better User Experience:** Users will see the main structure of the page almost instantly, with clear loading indicators for the dynamic parts, which feels more responsive.
*   **Reduced Prop Drilling:** Data fetching is localized to the component that needs it, simplifying the component tree.
*   **Fewer Duplicate Reads:** The profile is fetched once on the server and reused on the client, reducing network and Firestore reads.

## 4.1 Completed Prerequisite: Server Session Cookie

To make the server-side profile gate accurate, a Firebase session cookie is now set on sign-in and cleared on sign-out. The home page's server check relies on this cookie.

## 5. Open Decision: Suspense vs. Internal Loading

The home page currently wraps `HomeDashboard` in a `<Suspense>` fallback while `HomeDashboard` also renders its own skeletons.

**Option A: Keep Suspense**
- **Pros:** Provides a placeholder while the client bundle for `HomeDashboard` loads; ready if the dashboard moves to Suspense-enabled data fetching.
- **Cons:** With React Query (non-Suspense), this can result in duplicate loading UI (fallback + internal skeletons).

**Option B: Remove Suspense**
- **Pros:** Avoids double skeletons; keeps loading UI consolidated in `HomeDashboard`.
- **Cons:** There may be a brief blank gap before the client component mounts and shows its own skeletons.

**Recommendation:** Remove the `Suspense` fallback for now and rely on `HomeDashboard`'s internal loading state. Reintroduce Suspense later if dashboard data fetching becomes Suspense-enabled (RSC or Suspense-ready client data).

## 6. Open Decision: Profile Source for `HomeDashboard`

`HomeDashboard` currently calls `useUserProfile` even though the server already fetched the profile for gating and initial render.

**Option A: Keep `useUserProfile` in `HomeDashboard`**
- **Pros:** Always fresh, handles refetching automatically, consistent with other pages.
- **Cons:** Still triggers a client fetch on first load (extra Firestore read).

**Option B: Rely only on `initialProfile` from the server**
- **Pros:** Avoids duplicate profile reads; less client work.
- **Cons:** Profile won't update unless you add manual refresh logic; more props to pass if widgets need additional profile fields.

**Recommendation:** If profile changes on the home page are rare, prefer Option B. If you expect profile edits while the user stays on the dashboard, keep Option A for simplicity.
