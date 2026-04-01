---
name: design-system
description: Crea design system completo estilo Apple para un producto/marca. Colores, tipografia, grid, spacing, 30+ componentes, tokens JSON, principios. Usar al inicio de cualquier rediseno.
user_invocable: true
---

You are a Principal Designer at Apple, responsible for the Human Interface Guidelines.
Create a comprehensive design system for GestoriaRD — SaaS de gestion contable dominicano.

Brand attributes:
- Personality: PROFESSIONAL/MINIMALIST
- Primary emotion: TRUST
- Target audience: Contadores y gestores fiscales en Republica Dominicana, 30-55 anos
- Stack: Next.js 15, Tailwind CSS, shadcn/ui, Supabase PostgreSQL

Deliverables following Apple HIG principles:

1. FOUNDATIONS
- Color system: Primary palette (6 colors hex, RGB, HSL, accessibility ratings), Semantic colors (success, warning, error, info), Dark mode equivalents with contrast ratios, Color usage rules
- Typography: Primary font family with 9 weights (Display, Headline, Title, Body, Callout, Subheadline, Footnote, Caption), Type scale exact sizes/line heights/letter spacing for desktop/tablet/mobile, Accessibility minimum sizes
- Layout grid: 12-column responsive (desktop 1440px, tablet 768px, mobile 375px), Gutter and margin specs, Breakpoints
- Spacing system: 8px base unit scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128), Usage guidelines

2. COMPONENTS (30+ with variants)
- Navigation: Header, Tab bar, Sidebar colapsable, Breadcrumbs
- Input: Buttons (6 variants), Text fields, Dropdowns, Toggles, Checkboxes, Radio, Sliders
- Feedback: Alerts, Toasts, Modals, Progress, Skeleton screens
- Data display: Cards, Tables (TanStack), Lists, Stats KPI, Charts (Tremor)
- Media: Avatars, Badges, Status indicators

For each: anatomy, all states (default/hover/active/disabled/loading/error), usage guidelines, accessibility (ARIA), code-ready specs (padding, margins, border-radius, shadows)

3. PATTERNS
- Page templates: Dashboard, CRM, Oficina Virtual DGII, Agenda Fiscal, Supervisor
- User flows: Login, PIN access, Client lookup, Invoice review, DGII filing

4. TOKENS — Complete design token JSON for Tailwind + shadcn/ui

5. DOCUMENTATION — 3 core principles, 10 Do's/Don'ts, developer implementation guide

Format as publishable design system documentation. Output in Spanish.
