# Frontend Routing Guide (SPA)

This guide explains how routing works in the SimpliFaq frontend and how to add new pages without causing SPA 404 errors.

## Key Files
- `frontend/src/main.tsx`: mounts `AppRouter`.
- `frontend/src/router/index.tsx`: the only source of truth for app routes.
- `frontend/src/components/Layout.tsx`: the sidebar + layout wrapper for protected pages (uses `Outlet`).
- `frontend/src/components/ProtectedRoute.tsx`: protects routes and redirects unauthenticated users (default `redirectTo="/login"`).

## Route Structure
- Public routes: `/login`, `/register`, `/welcome` (outside of `Layout`).
- Admin routes: under `/admin` protected by `ProtectedAdminRoute` with `AdminLayout`.
- App routes (protected): nested under parent `Route path="/" element={<ProtectedRoute redirectTo="/login"><Layout /></ProtectedRoute>}`.
  - Use relative child paths: `dashboard`, `invoices`, `clients`, `products`, `reports`, `settings`, etc.
  - Index route redirects `"/"` to `"/dashboard"`:
    ```tsx
    <Route index element={<Navigate to="/dashboard" replace />} />
    ```
- 404 route: `Route path="*" element={<NotFoundPage />} />`.

## Adding a New Page (Example: Expenses/Charges)
1) Create the page components, e.g.:
   - `frontend/src/pages/expenses/ExpensesListPage.tsx`
   - `frontend/src/pages/expenses/ExpenseFormPage.tsx`

2) Import into `frontend/src/router/index.tsx`:
   ```tsx
   import ExpensesListPage from '../pages/expenses/ExpensesListPage';
   import ExpenseFormPage from '../pages/expenses/ExpenseFormPage';
   ```

3) Register as child routes under the protected parent:
   ```tsx
   <Route path="/" element={<ProtectedRoute redirectTo="/login"><Layout /></ProtectedRoute>}>
     <Route index element={<Navigate to="/dashboard" replace />} />
     <Route path="expenses" element={<ExpensesListPage />} />
     <Route path="expenses/new" element={<ExpenseFormPage />} />
     <Route path="expenses/:id/edit" element={<ExpenseFormPage />} />
     {/* Optional alias */}
     <Route path="charges" element={<ExpensesListPage />} />
   </Route>
   ```

4) Make sure any sidebar links match the registered paths, e.g. in `Layout.tsx`:
   ```ts
   { name: 'Charges', href: '/expenses', ... }
   ```

## Authentication Redirects
- For protected areas, use `redirectTo="/login"` in `ProtectedRoute` to avoid redirecting to non-existing routes.
- Ensure there's an index redirect inside the protected layout so `/` never 404s.

## After Changing Routes
- Restart the frontend dev server in `frontend/`:
  ```bash
  npm run dev
  ```
- Hard refresh the browser (Ctrl+F5) to invalidate cached bundles.

## Verifying Functionality
- Deep link to the new route (e.g., `http://localhost:3000/expenses`).
- If authenticated, the page should render; otherwise you should be redirected to `/login`.
- In DevTools Network, you should see expected API calls (e.g., `/api/expenses/accounts`).

## Common Pitfalls (and fixes)
- "I edited App.tsx but nothing changed": the router lives in `src/router/index.tsx`. Edit there.
- SPA 404 on deep link: child routes must be nested under the protected parent with relative paths; add an index redirect.
- Stale bundle: restart Vite and hard refresh the browser.
