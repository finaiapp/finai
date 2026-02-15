# Dashboard Design System

> **Extends:** `MASTER.md`
> **Focus:** Data Density • Readability • Navigation

## 1. Layout & Grid

- **Sidebar:** Fixed width `w-64` (256px), `bg-slate-50` (Light) / `bg-slate-900` (Dark).
- **Content Area:** Fluid width with `max-w-7xl` container centered.
- **Grid:** 12-column grid for widgets, scaling down to 1-column on mobile.
- **Gap:** `gap-6` (24px) standard between widgets.

## 2. Component Overrides

### Tables
- **Header:** `text-xs uppercase tracking-wider text-slate-500 font-semibold`.
- **Row:** `h-16` (comfortable touch target) with `hover:bg-slate-50 dark:hover:bg-slate-800/50`.
- **Cell:** `text-sm text-slate-700 dark:text-slate-200`.
- **Numbers:** Use `font-mono` or `tabular-nums` for financial data alignment.

### Charts
- **Palette:** Cycle through `primary-500`, `success-500`, `warning-500`, `info-500`.
- **Tooltip:** Dark background `bg-slate-900` with white text for high contrast.

## 3. Navigation
- **Active State:** `bg-primary-50 text-primary-600` (Light) / `bg-primary-900/20 text-primary-400` (Dark) + Left Border `border-l-4 border-primary-500`.

## 4. Mobile Responsiveness
- **Sidebar:** Hidden by default, slide-over drawer on hamburger menu click.
- **Tables:** Horizontal scroll wrapper or card view for small screens.
