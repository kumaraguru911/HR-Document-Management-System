# Production UI refactor

Dark theme support is intentionally out of scope.

- [ ] Create a shared responsive application shell for employee and HR areas.
  - [ ] Collapsible sidebar
  - [ ] Sticky top navigation
  - [ ] Breadcrumbs
  - [ ] Profile dropdown
  - [ ] Notification bell with unread count
- [x] Add shared primitives in `frontend/src/components/ui`.
  - [x] Page headers, cards, status badges, progress bars
  - [x] Empty states and skeleton loaders
  - [x] Modal and confirmation dialog
  - [x] Filter panel and pagination controls
  - [x] Reusable file picker
- [ ] Add shared data-display primitives.
  - [x] Pagination-ready table component
  - [x] KPI widget
  - [ ] Chart wrapper
  - [x] Timeline
  - [x] Drawer
- [ ] Standardize forms and validation messages.
- [ ] Migrate employee pages to shared primitives.
  - [x] Guided document upload uses the shared file picker
  - [x] Security page uses shared cards, status badge, header, and empty state
  - [x] Dashboard KPI and activity timeline
  - [ ] Notifications, profile, and documents lists
- [ ] Migrate HR pages to shared primitives.
  - [ ] Dashboard, employees, review queue, audit logs, and document settings
- [ ] Replace remaining page-specific feedback UI with global toast and confirmation flows.
- [ ] Verify desktop/mobile layouts, keyboard navigation, and existing API flows.
