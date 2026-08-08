# Production UI refactor

Dark theme support is intentionally out of scope.

- [x] Create a shared responsive application shell for employee and HR areas.
  - [x] Employee collapsible sidebar
  - [x] Employee sticky top navigation and breadcrumbs
  - [x] Employee profile dropdown
  - [x] Employee notification bell with unread count
  - [x] Migrate HR shell to the shared application-shell implementation
- [x] Add shared primitives in `frontend/src/components/ui`.
  - [x] Page headers, cards, status badges, progress bars
  - [x] Empty states and skeleton loaders
  - [x] Modal and confirmation dialog
  - [x] Filter panel and pagination controls
  - [x] Reusable file picker
- [x] Add shared data-display primitives.
  - [x] Pagination-ready table component
  - [x] KPI widget
  - [x] Chart wrapper
  - [x] Timeline
  - [x] Drawer
- [x] Standardize forms and validation messages.
- [x] Migrate employee pages to shared primitives.
  - [x] Guided document upload uses the shared file picker
  - [x] Security page uses shared cards, status badge, header, and empty state
  - [x] Dashboard KPI and activity timeline
  - [x] Notifications, profile, and documents lists
- [x] Migrate HR pages to shared primitives.
  - [x] Dashboard KPI widgets, chart cards, and activity timeline
  - [x] Employees, review queue, audit logs, and document settings
- [x] Replace remaining page-specific feedback UI with global toast and confirmation flows.
- [x] Verify desktop/mobile layouts, keyboard navigation, and existing API flows.
