# Responsive Phone and Desktop Dashboard Plan

## Goal
Make the entire UpayEvents application intentionally responsive across phones and PCs. Preserve the existing compact mobile experience while introducing a true desktop dashboard layout with a left navigation sidebar, wider content canvas, multi-column card layouts, and desktop-appropriate spacing.

## Current-State Findings
- The entire application shell is capped by the custom `max-w-mobile` utility at `26.25rem`, so desktop currently displays a narrow phone-sized column.
- The four-item navigation is always a fixed bottom bar and is also capped at the mobile width.
- Every page uses mobile-only horizontal padding (`px-5`), large bottom padding for the fixed mobile navigation (`pb-32`), and mostly single-column content.
- Several sections rely on horizontal swipe/scroll patterns appropriate for phones, especially the AI event selector and Discover category chips.
- Event cards, Home overview sections, My Events lists, Profile, and the event-creation form have no desktop grid behavior.
- The project already uses Tailwind CSS v4 responsive utilities and Upay theme tokens, so no dependency or framework change is needed.
- App behavior and state are all local to `src/App.tsx`; responsiveness can remain presentation-only without changing registration, event creation, profile, search, or AI data flow.

## Responsive Model

### Breakpoints
- **Phone/default:** existing stacked layout, bottom navigation, swipeable rows, and compact spacing.
- **Small/tablet (`sm`/`md`):** progressively larger horizontal padding and selected two-column grids where cards remain readable; retain bottom navigation until desktop.
- **Desktop (`lg` and above):** switch to the full dashboard shell with a left sidebar, remove mobile bottom-nav spacing, expose a wide content area, and use multi-column page compositions.
- Cap the overall dashboard at a readable desktop maximum such as Tailwind’s `max-w-7xl`, centered on very wide monitors, rather than allowing content to stretch indefinitely.

## Implementation Plan

### 1. Replace the mobile-capped app shell with a responsive dashboard shell
- In `App`, remove `max-w-mobile` from the outer application container.
- Use a centered `max-w-7xl` desktop shell with `lg:flex` so navigation and page content form two columns.
- Keep the current decorative Upay background across the full viewport.
- Wrap rendered page content in a `min-w-0 flex-1` content region so grids and text can shrink without horizontal overflow.
- Preserve `min-h-dvh` and the existing background ornaments, but position/size them responsively so they do not clip the wider desktop canvas.

### 2. Add desktop sidebar navigation and retain mobile bottom navigation
- Refactor the navigation item rendering so the same `navItems`, icons, labels, active-page rules, and navigation callback drive both navigation variants.
- Keep the current fixed bottom bar for widths below `lg`.
- Hide the bottom bar at `lg` and remove its mobile width cap so it spans the phone viewport correctly.
- Add a desktop-only sidebar at `lg`:
  - UpayEvents logo/wordmark at the top.
  - Vertically stacked Home, Discover, My Events, and AI controls.
  - Yellow/blue active treatment consistent with the mobile active state.
  - Sticky viewport-height behavior so navigation remains visible on long AI and Discover pages.
  - A compact sponsor/Upay brand treatment near the bottom without adding a duplicate Profile navigation item.
- Keep the profile avatar in page headers on desktop as requested; Profile remains avatar-only and is not added to either navigation list.
- When Profile or Create Event is open, neither mobile nor desktop main-navigation items should incorrectly claim `aria-current`.

### 3. Create shared responsive page spacing
- Update each page root (`HomePage`, `DiscoverPage`, `MyEventsPage`, `AIPage`, `CreateEventPage`, and `ProfilePage`) to use:
  - Compact phone padding by default.
  - Increased `sm` and `lg` horizontal/top spacing.
  - Mobile-only bottom clearance for the fixed bottom navigation (`pb-32 lg:pb-...`).
- Increase desktop heading scale and section gaps modestly while preserving the current hierarchy and Upay design tokens.
- Keep touch targets unchanged on phone and provide comfortable pointer targets on desktop.

### 4. Make Home a desktop overview dashboard
- Keep the existing stacked mobile order.
- At desktop, reorganize Home into a dashboard grid:
  - Hero banner occupies the larger left area.
  - Registration and AI summary cards sit as a compact right-side summary column or two-card panel.
  - “Up next,” “Featured for you,” and the AI insight become a balanced responsive grid beneath the hero.
- Increase hero width/height and text scale only at larger breakpoints; do not make mobile typography oversized.
- Ensure the Home empty state and populated upcoming-event state occupy the same stable desktop grid area.

### 5. Make Discover use the desktop canvas
- Keep the phone header with compact branding, search, and avatar.
- On desktop, allow the search control to use more width while keeping the avatar aligned at the top right.
- Keep the hero full-width or prominent across the page, with a constrained text measure.
- Category chips remain horizontally scrollable on narrow phones but wrap into a visible row on desktop; update the “swipe” interaction assumptions accordingly.
- Render event cards as:
  - One column on phones.
  - Two columns at medium widths where space permits.
  - Three columns on wide desktop if cards retain a readable minimum width.
- Ensure event card images have consistent responsive heights and cards align cleanly even with different title lengths.
- Preserve search, category filtering, registration toggling, and the no-results state; the no-results card should span the full event grid.

### 6. Make My Events responsive, including event creation access
- Keep the create-event `+` icon and avatar grouped in the header at every size.
- Render “Hosted by you” compact cards in a two- or three-column desktop grid instead of a single vertical list.
- Render registered `EventCard` items in a responsive two-column desktop grid.
- Make the empty state a centered, width-constrained panel on desktop rather than stretching across the full viewport.
- Preserve the separation between hosted and registered events and all existing session state behavior.

### 7. Make the Create Event page desktop-friendly
- Keep the current single-column form on phones.
- Constrain the form card to a readable centered desktop width instead of spanning the entire content canvas.
- At `md`/`lg`, place compatible fields in a two-column grid:
  - Category and date side by side.
  - Location and ticket price side by side.
  - Event name and submit action remain full width.
- Keep labels associated with their controls, preserve native validation, and prevent date/select/input controls from overflowing on narrow devices.
- Keep the Back control and page heading aligned with the content column.

### 8. Recompose the AI page for desktop
- Keep the existing mobile order and preserve the sponsor banner between the main forecast and metric cards.
- At desktop:
  - Replace the horizontally swipeable event selector with a visible multi-column selector grid; change helper copy from “Swipe to explore” to desktop-appropriate wording or hide it at desktop.
  - Place the forecast card and sponsor message in a wider responsive grid while maintaining their DOM/order relationship before metrics.
  - Let the three metric cards span a stable three-column row.
  - Keep prediction confidence and recommended action as a balanced two-card row.
  - Place “What the AI looks at” and “Why this prediction?” side by side where space permits.
  - Let the live check-in card span the available width.
- Preserve all current AI values, event selection, sponsor copy, forecast progress, explanations, and Upay styling.
- Ensure the forecast glow and decorative absolute elements remain clipped to their intended cards rather than the viewport.

### 9. Make Profile responsive
- Keep the current stacked phone page.
- On desktop, use a two-column layout:
  - Profile identity card on the left.
  - Account/settings rows and Upay payment card on the right.
- Constrain the overall profile content so it remains readable rather than filling the full dashboard width.
- Preserve the back-to-previous-page behavior and keep navigation accessible through the desktop sidebar/mobile bottom bar.

### 10. Address overflow and desktop interaction details
- Audit all negative-margin scroll rows (`-mx-5`) so their values match responsive page padding and do not create desktop horizontal overflow.
- Use phone-only horizontal scrolling and desktop wrapping/grid behavior for selectors and chips.
- Ensure long event names, locations, sponsor text, and profile details wrap or truncate intentionally without forcing page width.
- Keep all fixed/sticky navigation above page content with appropriate `z-index` and safe-area handling.
- Ensure no content is hidden beneath the bottom bar on phone and no unnecessary blank bottom area remains on desktop.
- Preserve keyboard focusability, `aria-current`, avatar labels, create-event labels, and minimum interactive target sizes.

## Files and Scope
- **`src/App.tsx`**: responsive shell, shared navigation variants, page root spacing, and page-specific grid/layout classes.
- **`src/index.css`**: only adjust/add reusable responsive shell or background utilities if Tailwind utilities cannot express the behavior cleanly. Keep the existing Upay theme and mobile utility available if still used elsewhere.
- Do not add a router, responsive JavaScript listeners, new dependencies, or duplicate desktop-only page components. Use CSS breakpoints so one component tree serves all viewport sizes.

## Preserved Behavior
- Navigation state and Profile return behavior.
- Search and category filters.
- Registration synchronization across Home, Discover, and My Events.
- Hosted event creation and current-session persistence.
- AI event selector and all forecast content.
- Sponsor banner placement between forecast and metrics.
- Existing Upay tokens, imagery, icons, and design language.

## Verification
- Run `pnpm format src/App.tsx src/index.css` for changed source files.
- Run `pnpm build` and require a successful Vite/TypeScript production build.
- Run `git diff --check` to catch malformed whitespace.
- Manually inspect the existing preview at representative widths:
  - **320px phone:** no horizontal page overflow; compact header and controls remain usable.
  - **390–430px phone:** current intended phone composition and fixed bottom navigation remain intact.
  - **768px tablet:** grids transition cleanly without cards becoming cramped.
  - **1024px laptop:** sidebar replaces bottom navigation and content uses the desktop canvas.
  - **1440px desktop:** centered maximum-width dashboard, readable line lengths, and balanced multi-column sections.
- At phone and desktop widths, verify all pages: Home, Discover, My Events empty/populated/hosted states, Create Event, AI, and Profile.
- Verify active navigation state, avatar/Profile return, create-event submission, registration toggles, search/filter behavior, and AI event selection after responsive changes.
