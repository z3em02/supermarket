# Design & UX improvement TODO

A prioritized list of UI/design work for the Hajar Supermarkt frontend
(React + Tailwind + Cairo font, dark mode via `class`, DE/AR + RTL).

## Current state (findings from the codebase)

- **11 accent colors** are in use, hardcoded per component: `slate` (neutral base),
  `emerald`, `blue`, `amber`, `rose`, `purple`, `indigo`, `violet`, `teal`, `red`, `cyan`.
- **Two competing "primaries":** emerald on the customer storefront, blue in the admin.
  This is accidental, not a documented rule.
- **Semantic colors drift:** `rose` *and* `red` for danger; `amber` for both drivers and
  warnings; `purple`/`indigo`/`violet` all used for promos.
- **No design tokens** — colors live as literal Tailwind classes in thousands of places,
  so a palette/brand change means editing every component.
- **Feedback uses `alert()` / `window.confirm()`** in the admin pages (blocking, unstyled,
  not RTL/dark aware).
- **Cards are hand-rolled** (`bg-white dark:bg-gray-900 rounded-2xl border…`) in dozens of
  spots rather than a shared component; radius/shadow scales are mixed (`xl`/`2xl`/`3xl`).

---

## P0 — Foundation (do first; unlocks everything else)

- [ ] **Define design tokens in `tailwind.config.js`**: semantic names mapped to the
  existing colors — `primary` (blue, admin), `brand` (emerald, storefront),
  `success` (emerald), `warning` (amber), `danger` (rose), `info` (sky), `promo` (purple),
  `neutral` (slate). Components then use `bg-primary-600` instead of `bg-blue-600`.
- [ ] **Pick ONE primary per surface and document the rule**: emerald = customer storefront,
  blue = admin back-office.
- [ ] **Collapse the 11 accents to ~6 roles**: drop stray `red` → rose, `indigo`/`violet` →
  purple, `teal`/`cyan` → remove or pick one.
- [ ] **One source of truth for order-status colors**: extend
  `pages/orders/useStatusBadge.js` and use it everywhere so
  pending/accepted/delivered/declined look identical on every page.

## P1 — Consolidated order view (admin Orders section)

> Replace the current split of card buttons + separate detail/status/edit/accept/print
> modals with **one order view**: click an order → a rich drawer where you see and do
> everything. This is the biggest single UX upgrade to the Orders section.

- [ ] **Turn `OrderDetailModal` into the single hub** (a wide side **drawer**, full-screen on
  mobile) and fold the separate Status/Edit/Accept modals into it as inline sections.
- [ ] **Organize into sections/tabs**, not one long scroll:
  - **Übersicht** — status (change inline), assigned driver, delivery slot, totals.
  - **Artikel** — line items (edit quantities / add / remove).
  - **Kunde & Lieferung** — address, tap-to-call phone, notes.
  - **Verlauf** — status timeline / audit trail.
- [ ] **Admin-immediate edits save inline**: status, driver, delivery slot, admin notes.
- [ ] **Keep item editing a deliberate, separated action** — ⚠️ `editOrder` sets the order to
  `pending_customer_approval` and **emails the customer**. "Artikel ändern" must have its own
  confirm ("this will notify the customer"), never blend into casual inline editing.
- [ ] **Keep quick actions on the list card** (Accept / Decline / next-status) so triage stays
  one click without opening the drawer. Card = scan + quick-triage; drawer = full detail.
- [ ] Handle the stale-edit case gracefully (the backend already guards with 409s on concurrent
  changes) — surface a "this order changed, reload" message in the drawer.

## P1 — Components & feedback (where users feel the jump)

- [ ] **Replace every `alert()` / `window.confirm()` with a toast + confirm-modal system**
  (non-blocking, themeable, RTL-aware).
- [ ] **Extract shared primitives**: `Button` (primary/secondary/danger/ghost + loading/disabled),
  `Card`, `Badge`, `Input`, `Select`, `Modal`/`Drawer` shell, `EmptyState`, `Pagination`.
- [ ] **Skeleton loaders** for lists/tables instead of the lone spinner.
- [ ] **Standardize empty states** (icon + message + action) into one component.

## P1 — Layout & spacing

- [ ] **One radius + shadow scale** (e.g. `xl` for controls, `2xl` for cards) — stop mixing 3.
- [ ] **Consistent page shell**: same max-width + gutter padding across all admin pages.
- [ ] **Denser tables with sticky headers** for the long lists (Orders, Customers, Accounting);
  standardize the zebra rows.
- [ ] **Spacing rhythm**: settle on a vertical scale (`space-y-4 / 6`) instead of ad-hoc gaps.

## P2 — Typography

- [ ] **Type scale as tokens** (h1/h2/h3/body/caption) instead of ad-hoc `text-xl/2xl` per page.
  Keep Cairo — good for Latin + Arabic.
- [ ] **`tabular-nums` on all money/quantity/counts** so numbers align in tables.

## P2 — Accessibility

- [ ] **Dark-mode contrast audit** — check muted text (`slate-400` on `gray-950`) against WCAG AA.
- [ ] **`aria-label` on all icon-only buttons** (there are many).
- [ ] **`focus-visible` rings** everywhere for keyboard navigation.
- [ ] **Respect `prefers-reduced-motion`** for `animate-pulse` / `animate-in`.

## P2 — Mobile & dark mode

- [ ] **Tap targets ≥ 44px** audit (`touch-manipulation` already used — good).
- [ ] **Mobile: widest tables → card view** instead of horizontal scroll.
- [ ] **Walk every page in dark mode** — some were likely built light-first.

## P3 — Storefront polish

- [ ] CTA hierarchy on the landing hero; consistent product-card imagery / aspect ratios;
  clearer trust signals (reviews widget).

---

## Recommended sequencing

1. **P0 foundation** — mostly mechanical, unlocks consistency instantly and makes every later
   change trivial.
2. **P1 consolidated order drawer** + **toast system** + shared `Button`/`Card`/`Badge` — the
   changes users actually feel.
3. **P1 layout**, then **P2/P3** polish.
