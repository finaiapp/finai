# FinAI Master Design System

> **Style Identity:** Fintech Professional • Trustworthy • Modern • Clean
> **Primary Font:** Inter (Google Fonts)
> **Accent Font:** Outfit (Headings)

## 1. Color Palette

### Primary (Brand) - "Financial Trust Blue"
Used for primary actions, active states, and key brand elements.
- `primary-50`: `#F0F9FF` (Backgrounds)
- `primary-100`: `#E0F2FE`
- `primary-500`: `#0EA5E9` (Brand Standard)
- `primary-600`: `#0284C7` (Hover)
- `primary-900`: `#0C4A6E` (Text/Dark Bg)

### Secondary - "Growth Green"
Used for positive trends, success states, and growth indicators.
- `success-500`: `#10B981`
- `success-600`: `#059669`

### Neutral - "Slate Professional"
Used for text, borders, and UI structure.
- `slate-50`: `#F8FAFC` (App Background - Light)
- `slate-100`: `#F1F5F9` (Card Background - Light)
- `slate-200`: `#E2E8F0` (Borders - Light)
- `slate-800`: `#1E293B` (Card Background - Dark)
- `slate-900`: `#0F172A` (App Background - Dark)

### Semantic Colors
- **Error:** `#EF4444` (Red-500)
- **Warning:** `#F59E0B` (Amber-500)
- **Info:** `#3B82F6` (Blue-500)

## 2. Typography

### Font Families
- **Headings:** `Outfit`, sans-serif (Weights: 500, 600, 700)
- **Body:** `Inter`, sans-serif (Weights: 400, 500)

### Scale
- `text-xs`: 12px (Labels, Captions)
- `text-sm`: 14px (Secondary Text, Table Data)
- `text-base`: 16px (Body Text, Inputs)
- `text-lg`: 18px (Card Titles)
- `text-xl`: 20px (Section Headers)
- `text-2xl`: 24px (Page Titles)
- `text-4xl`: 36px (Hero/Marketing)

## 3. UI Patterns & Components

### Cards (Glassmorphism Lite)
- **Light Mode:** `bg-white` OR `bg-slate-50/50 backdrop-blur-sm` with `border border-slate-200`
- **Dark Mode:** `bg-slate-800/50 backdrop-blur-md` with `border border-white/10`
- **Shadow:** `shadow-sm` for regular, `shadow-md` for hover/floating.
- **Radius:** `rounded-xl` (12px) standard.

### Buttons
- **Primary:** `bg-primary-500 text-white hover:bg-primary-600 shadow-sm transition-colors`
- **Secondary:** `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`
- **Ghost:** `text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800`

### Inputs
- **Base:** `bg-white border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-900 dark:border-slate-700`
- **Radius:** `rounded-lg` (8px).

## 4. Effects & Animation

- **Transitions:** `duration-200 ease-in-out` default.
- **Hover:** Subtle lift (`-translate-y-0.5`) on interactive cards.
- **Micro-interactions:** Scale down (`scale-95`) on button press.

## 5. Anti-Patterns (DO NOT USE)

- ❌ **Pure Black (#000000):** Use Slate-900 instead.
- ❌ **Drop Shadows on Dark Mode:** Use borders/highlights instead.
- ❌ **Dense Text Blocks:** Always use comfortable `leading-relaxed`.
- ❌ **Sharp Corners:** Fintech implies safety; contrast with soft, rounded corners.
