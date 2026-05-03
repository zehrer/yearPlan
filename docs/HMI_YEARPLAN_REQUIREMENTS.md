# YearPlan HMI Requirements

## Purpose
This document captures the YearPlan-specific HMI requirements that emerged during implementation. It is intended to preserve the current product direction and separate project-specific behavior from the general reusable HMI standard.

## Product Positioning
- YearPlan is a web application layered on top of Google Calendar.
- It should feel like an add-on to Google Calendar rather than a visually unrelated standalone product.
- The UI should align with the cleanliness and interaction familiarity of Google Calendar.
- Chrome usage is the primary target environment because of the Google integration focus.

## Primary Use Case
- Plan and review multi-day items across long time ranges.
- Typical event categories include:
  - vacation
  - holiday
  - travel dates
  - hotel stays
  - flights
- Overlap is normal and must be handled gracefully.

## Core View Requirements

### Year view
- The year view is a primary planning surface.
- It should provide a compact overview of the full year.
- It must support overlapping multi-day bars.
- It should prioritize density and clarity over decorative card treatment.

### Month view
- The month view should support detailed long-range planning with more room than the year view, but still remain dense.
- The month view should not waste space with oversized day cards.
- The month view should use a flatter grid with reduced rounding and cleaner lines.
- The user should be able to move continuously from one month to the next by vertical scrolling, similar to Apple Calendar.
- The top bar should reflect the currently visible month while scrolling.

## Shell Requirements

### Top bar
- Keep the top bar very small.
- Show `yearPlan` in the top bar.
- Show the current year or current month directly in the top bar.
- Place the main view selector in the top bar:
  - Year
  - Month
- Place period navigation arrows in the top bar next to the current period.
- Show the connected user in the top bar.
- The user control must be functional and provide account actions.
- Once a real Google session exists, demo controls must disappear.

### Left sidebar
- The left sidebar should follow the Google Calendar mental model.
- It should primarily contain calendar-related source lists.
- The calendar selection should live in the left sidebar, not in the right sidebar.
- Duplicated controls should be removed from the left sidebar if they already exist in the top bar.
- Specifically remove from the left sidebar:
  - view selector
  - year selector / timeline block
  - redundant Google connection status box
- Keep `My calendars` in the left sidebar.
- Calendar labels should show a user-friendly calendar name, not the owner email address where avoidable.
- The left sidebar should be collapsible.

### Right sidebar
- The right sidebar should contain event type filters.
- It should not duplicate calendar selection once calendars are moved to the left sidebar.
- It should be collapsible.

### Diagnostics
- The in-app status console should remain available for debugging.
- It should be small and positioned to the lower-left.
- It must not hover across or visually dominate the main workspace.

## Authentication and Mode Requirements

### Signed-out behavior
- The product should show a usable preview before login.
- The user should understand the real product layout before authentication.

### Demo mode
- Demo mode is useful before configuration or sign-in.
- Once a real Google account is connected, demo mode should no longer be emphasized.
- Demo actions should disappear from the shell when they are no longer relevant.

### Connected behavior
- When signed into Google:
  - real calendars become the source of truth
  - account state is visible in the top bar
  - calendar management remains accessible
  - demo emphasis disappears

## Event Behavior Requirements

### Event ownership model
- YearPlan distinguishes between:
  - normal Google Calendar events
  - YearPlan-managed events
- Existing Google events that are not yet YearPlan-managed may still be shown.
- Those events may initially be read-only from the YearPlan perspective.

### Adoption flow
- Existing Google events may expose an `Adopt into YearPlan` action.
- Adoption means YearPlan writes its own private metadata into the Google event so it can manage type and related planner-specific behavior.
- The adoption affordance is acceptable, but visual rendering of non-adopted events must still be correct before adoption.

### Title rendering
- Titles of existing Google events must display correctly before and after adoption.
- Read-only styling may indicate a different management state, but must never degrade title readability.

### Event visuals
- Multi-day events should appear as colored bars.
- Event color should map to event type by default.
- Overlapping bars must stack visibly.
- The visual language must stay readable in both year and month views.

## Interaction Requirements

### Month navigation
- In month mode, vertical scrolling through consecutive months is preferred over switching isolated month cards manually.
- Arrow navigation should still work for month-to-month jumps.
- The current visible month must synchronize with the shell title.

### Editing
- Clicking an event opens details.
- Planner-managed events should allow editing of:
  - title
  - date range
  - type
  - color
  - location
  - notes
- Non-managed events may start read-only, but must still display details cleanly.

### Drag interactions
- Drag-create across days should work in month view.
- Drag-move and drag-resize should work for YearPlan-managed multi-day events.
- The UI should make these interactions feel direct and spatial.

## Visual Direction
- The product should align more closely with Google Calendar than with generic card-heavy dashboard designs.
- Favor:
  - slim chrome
  - neutral surfaces
  - familiar segmented controls
  - restrained shadows
  - flatter calendar grids
- Avoid:
  - oversized hero areas
  - verbose shell copy
  - decorative UI that reduces calendar density

## Requirements to Preserve in Future Iterations
- top-bar-first navigation
- left sidebar for calendar lists
- right sidebar for type filters
- current period visible in shell
- continuous scrolling month mode
- preview-before-login behavior
- compact diagnostics panel
- user identity and connection state in top bar

## Open Direction for Further Refinement
- Make the shell even closer to Google Calendar through iconography and spacing refinement.
- Continue increasing information density in the month view where it does not hurt readability.
- Consider whether the adoption concept should remain explicit or become more transparent in future revisions.
