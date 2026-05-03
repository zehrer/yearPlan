# General HMI Requirements

## Purpose
This document captures a reusable HMI standard distilled from the YearPlan project. It is intended to serve as a baseline UI/UX requirement set for future web applications, especially productivity tools, planning tools, and browser-based applications that layer on top of existing ecosystems such as Google services.

The focus is not on branding experiments or landing-page marketing. The focus is clarity, density, usability, low-friction navigation, and a clean operational feel similar to mature tools such as Google Calendar and Gmail.

## Core Design Principles

### Product-first, not marketing-first
- The application should show useful product state immediately.
- Avoid large hero sections, oversized headlines, or long explanatory text once the user is inside the product shell.
- The main workspace should be visible without scrolling whenever possible.
- Introductory copy must be short and only used when it helps the user reach a working state.

### Dense but calm
- Favor information density over decorative spacing.
- Avoid cramped layouts, but also avoid oversized cards, large empty gaps, and exaggerated padding.
- The UI should feel efficient, quiet, and operational.
- Dense layouts must remain readable through disciplined spacing, clear alignment, and limited visual noise.

### Familiar interaction patterns
- Prefer interaction models users already know from tools like Google Calendar, Gmail, and Apple Calendar.
- Reuse common placement patterns:
  - navigation and app identity in a slim top bar
  - entity lists in the left sidebar
  - filters and secondary controls in a right sidebar when needed
  - main content centered and dominant
- Do not invent new navigation patterns unless there is a strong product reason.

### Immediate orientation
- At all times the user should be able to answer:
  - Where am I?
  - What period or object am I looking at?
  - What account or source is active?
  - What can I do next?
- The current context should be visible in the shell, not buried in dialogs.

### Low-friction multi-state UX
- The app must remain understandable in all states:
  - signed out
  - signed in
  - preview/demo
  - loading
  - empty
  - error
- Preview or demo mode should allow users to understand the product before integration is configured.
- Demo and setup affordances should disappear when they are no longer relevant.

## Layout Requirements

### Top bar
- Use a slim, persistent top bar.
- The top bar should contain only high-value controls:
  - app name
  - current context or period
  - primary navigation between major views
  - high-frequency actions such as refresh
  - account/user status
  - optional sidebar toggles
- The top bar must not contain verbose explanatory copy.
- The current period or object should be shown directly in the top bar.
- Top bar actions should be compact and predictable.

### Left sidebar
- The left sidebar is for navigation and source lists.
- Only keep controls there that benefit from persistent visibility.
- Prefer entity lists such as:
  - calendars
  - folders
  - projects
  - collections
- Remove duplicated controls if the same control already exists in the top bar.
- The left sidebar must be collapsible.
- In collapsed mode, the app must remain usable and visually stable.

### Right sidebar
- The right sidebar is for secondary filtering and contextual controls.
- It should not duplicate the left sidebar.
- It should be removable or collapsible.
- Use it for:
  - tags
  - types
  - secondary filters
  - diagnostics or metadata when they are not primary navigation

### Main workspace
- The main workspace must dominate the layout.
- It should never feel squeezed by sidebars.
- Content must shrink responsibly within available width rather than overlap sidebars.
- Overflow handling must be explicit; no accidental horizontal spillover under side panels.

## Visual Style Requirements

### Visual direction
- Use a clean, restrained, productivity-tool visual language.
- Visual inspiration should lean toward Google Workspace rather than startup marketing pages.
- Decorative effects should be subtle and secondary to clarity.

### Surfaces
- Prefer light surfaces with gentle separation.
- Use borders, slight tonal differences, or restrained shadows instead of heavy card chrome.
- Avoid large glossy cards for ordinary content areas.
- Use flatter surfaces for dense calendar or data layouts.

### Typography
- Typography must support scanning first, personality second.
- Headlines inside the app shell should be compact.
- Avoid oversized display text once the product workspace is shown.
- Use clear hierarchy:
  - app identity
  - current context
  - section labels
  - supporting metadata

### Color
- Color should communicate state, category, and hierarchy.
- Avoid decorative color usage without meaning.
- Use muted neutrals for structural UI.
- Use stronger accent colors for:
  - active state
  - selected state
  - primary actions
  - event type or category

### Shape language
- Rounded controls are acceptable, but do not overuse heavy round card containers.
- Choose shape according to density needs:
  - flatter grids for data-heavy views
  - softer cards only when content needs separation

## Interaction Requirements

### Primary actions
- High-frequency actions must be easy to find and require minimal explanation.
- Use clear text labels for important actions.
- Hide or remove irrelevant actions when the user state changes.

### State-dependent controls
- A control should only be visible if it matters in the current state.
- Examples:
  - do not show demo-mode actions once a real account is connected
  - do not show configuration warnings once configuration is complete
  - do not duplicate connection state in multiple places without reason

### Progressive disclosure
- Show the minimum interface needed by default.
- Secondary details should be available on demand:
  - menus
  - detail panels
  - expandable diagnostics
- Debugging or status consoles must not dominate the product UI.

### Feedback
- Important state changes should be visible:
  - loading
  - authentication state
  - refresh
  - errors
  - data source changes
- Diagnostic tools can exist, but should be compact and collapsible.

## Navigation Requirements

### Major view switching
- Major views should be accessible from the top bar.
- View switching controls should be persistent, compact, and visually grouped.
- Do not duplicate view switching in multiple shell regions unless there is a compelling workflow need.

### Time or range navigation
- Time navigation belongs near the current period display.
- Previous/next controls should sit adjacent to the current period.
- If a view supports continuous scrolling, the shell should still show the currently visible period.

### Scroll behavior
- Continuous scroll is preferred when it improves planning flow and reduces mode switching.
- Scrolling should feel like browsing a continuous workspace, not isolated disconnected cards.
- When using scrolling period views, the visible period should synchronize back into the shell.

## Calendar and Planning UX Requirements

### Density
- Calendar layouts should maximize useful visible range.
- Avoid oversized day cells when the goal is long-range planning.
- Prefer flatter grids and efficient lane usage for event rendering.

### Event rendering
- Event bars must remain legible even when compact.
- Titles should stay readable regardless of event ownership or editability.
- Read-only items may look distinct, but never degraded to the point of looking broken.

### Overlap handling
- Overlapping events must stack cleanly.
- They must never obscure each other by default.
- Compact views may reduce detail, but not remove structural correctness.

### Consistency across views
- Different calendar views may vary in density, but should share the same event language:
  - colors
  - type meaning
  - selection behavior
  - edit vs read-only distinction

## Account and Integration Requirements

### User identity
- The active user should be visible in the top bar.
- The account control should be functional, not decorative.
- Account menus should provide the few actions users need most, such as disconnecting or switching state.

### Integration state
- Integration status should not require a dedicated large card once the shell is operational.
- The shell should communicate enough status through:
  - top bar account control
  - compact diagnostics panel
  - contextual error messages

### Preview and demo behavior
- A meaningful preview should be available before sign-in when possible.
- Preview mode should still show the real product shape, not a separate marketing layout.
- The transition from preview to live mode should feel incremental, not like entering a separate application.

## Diagnostics and Supportability

### Embedded diagnostics
- An in-app status console is acceptable for development and troubleshooting.
- It must be:
  - small
  - collapsible
  - placed away from primary UI
  - informative without covering key content
- Diagnostic output should summarize meaningful runtime state, not flood the user with noise.

### Developer-oriented visibility
- The product should surface enough runtime state to diagnose integration problems quickly:
  - config presence
  - auth state
  - source counts
  - last error
- Repeated boot logs should be deduplicated where possible in development mode.

## Responsive Behavior

### Desktop-first productivity
- For planning and productivity tools, desktop behavior is the primary target.
- The layout should still degrade cleanly on smaller widths.

### Small screen handling
- On smaller screens:
  - sidebars should collapse
  - account labels may compress
  - top bar controls may reduce in textual weight
- The app should remain functional without horizontal overflow.

## Reuse Guidance

### What should be reused as a default
- slim top bar shell
- left navigation for source/entity lists
- optional right sidebar for secondary filters
- dense content-first main workspace
- preview-before-sign-in strategy
- account state in top bar
- compact collapsible diagnostics
- Google-like operational styling

### What should not be copied blindly
- exact color palette
- exact spacing values
- exact control labels
- exact calendar behavior
- any project-specific terminology

The structural logic should be reused. The content model should be adapted per product.
