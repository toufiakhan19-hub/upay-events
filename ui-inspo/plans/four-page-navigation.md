# Four-Page Navigation and Profile Plan

## Goal
Replace the current bottom navigation with **Home**, **Discover**, **My Events**, and **AI**, give each tab a real page with a matching icon and active state, and keep Profile accessible from the top avatar instead of using a bottom-navigation slot.

## Current-State Findings
- The app is a single React component tree in `src/App.tsx` with local state rather than a routing library.
- The current default screen is an event-discovery feed with search, category filters, event cards, and session-local registration state.
- The existing `HostDashboard` is already a complete AI forecast experience and includes the Upay sponsor banner.
- The bottom navigation currently contains Home, My Tickets, Host, and Profile. Only Host has its own conditional page; the Profile avatar currently sets a tab value without rendering an actual profile screen.
- Icons are local SVG React components, and the visual system is implemented through Upay Tailwind theme tokens and a few shared local primitives (`Card`, `Pill`, `Button`). No external component or icon package is installed.

## Implementation Approach

### 1. Introduce explicit page state and shared shell behavior
- Replace free-form tab strings with a typed page identifier covering `Home`, `Discover`, `My Events`, `AI`, and avatar-only `Profile`.
- Keep navigation state in `App` rather than adding a router dependency; this matches the current app architecture and is sufficient for an in-app mobile tab prototype.
- Keep `registered` event IDs in `App` so registrations made on Discover immediately appear on Home and My Events.
- Track the last selected main tab so closing/backing out of Profile returns the user to the page they came from.
- Keep the existing centered mobile app shell, Upay background, safe bottom padding, and fixed bottom navigation.
- When switching main tabs, render the selected page from the top; do not preserve stale search/filter controls outside Discover.

### 2. Rebuild the bottom navigation
- Define exactly four main items in this order:
  1. **Home** — house icon
  2. **Discover** — search/compass-style icon
  3. **My Events** — calendar/ticket icon
  4. **AI** — sparkle icon
- Reuse the existing local SVG icon pattern and add only the missing icon needed for Discover; avoid introducing an icon dependency.
- Preserve the four-column layout, yellow circular active indicator, navy/blue Upay palette, labels, touch targets, `aria-current`, and fixed safe-area treatment.
- Profile will never appear as a bottom-navigation item. While the Profile page is open, no bottom tab will claim `aria-current`; the bottom nav remains available for direct navigation back to a main page.

### 3. Add a shared page header
- Extract or create a small local header composition used by Home, My Events, and AI, with page title/supporting text and the `SS` avatar at the top right.
- Keep Discover’s search-oriented header, but retain the same avatar placement and interaction.
- Make every avatar button open the Profile page and retain an accessible name/title.
- Preserve page-specific controls where needed: Profile gets a back button; AI no longer needs the old “back to home” button because it is a first-class tab.

### 4. Create the new Home overview page
Build a concise overview rather than duplicating the Discover feed:
- Personalized greeting/intro with Upay branding and a primary action that switches to Discover.
- A compact summary showing the current number of registered events and an AI-related highlight using existing Upay cards/tokens.
- An **Upcoming event** section:
  - If events have been registered, show the next registered event with date/location and a route into My Events.
  - If none are registered, show a clear empty state and a Discover call to action.
- A **Recommended/featured event** preview using existing event data, with a call to action that opens Discover.
- A compact **AI insight** preview that links to the AI tab rather than duplicating the full forecast dashboard.
- Keep content responsive within the existing mobile-width shell and reserve bottom padding for the fixed navigation.

### 5. Turn the current default feed into Discover
- Move the existing discovery UI into a dedicated `DiscoverPage` component without changing its core behavior:
  - Upay event-discovery hero
  - Search input
  - Category chips
  - Recommended event list
  - No-results state
  - Register/unregister actions
- Keep search and active category state scoped in `App` or the Discover component, whichever requires the least churn while preserving behavior.
- Keep existing event photography, data, and card styling; no new image sourcing is needed.
- Registration buttons continue to update the shared `registered` IDs.

### 6. Create My Events for session registrations
- Derive the page list by filtering the existing `events` array against shared registered IDs; do not seed fake history.
- With registrations present:
  - Show a page heading and count.
  - Render registered event cards using the existing card design and data.
  - Keep the existing toggle action available so users can remove an event from My Events.
- With no registrations:
  - Show a polished empty state with a calendar/ticket icon, short explanation, and a button that switches to Discover.
- Ensure registrations/unregistrations update this page and the Home summary immediately.

### 7. Promote Host Dashboard into the AI page
- Reuse the existing `HostDashboard` content as the **AI** page rather than creating a second forecast implementation.
- Rename the component/header copy to make it clearly an AI insights/forecast destination while retaining the event selector, forecast, sponsor banner, metrics, recommendation, model signals, factors, and live check-in card.
- Remove the old back-to-home control and use the shared avatar header treatment.
- Preserve the sponsor banner exactly in its current location between the main forecast card and metric cards.
- Keep the selected forecast event state local to this page.

### 8. Add an avatar-only Profile page
- Create a simple, visually complete Profile page that is not represented in bottom navigation.
- Include:
  - Back control returning to the previously active main tab
  - Larger `SS` avatar, Sadika Sharif name, and host/account context
  - Compact account summary or settings rows using existing icon/card patterns
  - Clear visual continuity with the Upay tokens
- Keep this page informational unless an existing interaction can be supported locally; do not add authentication, persistence, or backend behavior.

### 9. Keep the change cohesive and scoped
- Make the primary implementation in `src/App.tsx`, extracting local page components there to match the current one-file structure unless the file becomes materially harder to follow.
- Add to `src/index.css` only if a page requires a reusable visual effect that cannot be expressed cleanly with existing Tailwind/theme utilities.
- Reuse all existing Upay theme tokens, radii, shadows, buttons, cards, and typography. Do not add raw, unrelated colors or another design system.
- Preserve existing event filtering, registration behavior, sponsor messaging, and responsive mobile presentation.

## Interaction and Edge Cases
- Registering from Discover adds the event to My Events and updates Home’s count/upcoming preview.
- Unregistering from either Discover or My Events removes it everywhere immediately.
- Home and My Events empty states direct users to Discover.
- Search with no match retains the current no-results state.
- Opening Profile from any page and tapping Back returns to that originating page.
- Selecting any bottom tab while Profile is open navigates directly to that tab.
- The active bottom-navigation state and accessible `aria-current` value always match the rendered main page.
- All icon-only buttons retain accessible labels, and all interactive controls remain keyboard-operable.

## Verification
- Run `pnpm build` because the change restructures the main application and adds several rendered branches.
- Confirm the TypeScript/Vite build exits successfully.
- Manually verify in the existing preview/hot-reload server:
  - All four bottom tabs render distinct pages and show the correct active icon state.
  - Avatar access works from each main page and Profile returns to the prior page.
  - Register/unregister state stays synchronized across Discover, Home, and My Events.
  - My Events empty and populated states both render correctly.
  - AI retains the sponsor banner between the forecast and metrics.
  - Search/category filtering and the no-results state still work.
  - Content is not obscured by the fixed bottom nav at narrow mobile widths.
