# Mantine → shadcn/ui Migration Plan

## Overview

- **7 Mantine packages** to remove: core, hooks, form, tiptap, modals, dates, dropzone
- **~250 files** with Mantine imports, **~600 total import statements**
- **Custom wrappers** to flatten: ContainedInput, RateupButton\*, PaperLayout, FormModalLayout, SimpleModalLayout
- **Estimated effort:** ~4.5M tokens across 15-25 sessions

---

## Phase 0: Flatten Custom Wrappers (~160 files) — MEDIUM RISK

Replace internal wrapper components with direct shadcn equivalents. Do this FIRST so later phases don't migrate wrappers that will be removed anyway.

| Wrapper                 | Files | Replace With                        |
| ----------------------- | ----- | ----------------------------------- |
| `ContainedInput`        | 78    | `shadcn/Input` directly             |
| `RateupButtonPrimary`   | 32    | `shadcn/Button`                     |
| `RateupButtonSecondary` | 90    | `shadcn/Button variant="secondary"` |
| `RateupButtonOutline`   | 90    | `shadcn/Button variant="outline"`   |
| `PaperLayout`           | 57    | `shadcn/Card`                       |
| `FormModalLayout`       | 30    | `shadcn/Dialog`                     |
| `SimpleModalLayout`     | 6     | `shadcn/Dialog`                     |

- [ ] Install shadcn: input, button, card, dialog
- [ ] Replace `ContainedInput` → `Input` (78 files)
- [ ] Replace `RateupButtonPrimary/Secondary/Outline` → `Button` variants (90 files)
- [ ] Replace `PaperLayout` → `Card` (57 files)
- [ ] Replace `FormModalLayout` → `Dialog` (30 files)
- [ ] Replace `SimpleModalLayout` → `Dialog` (6 files)
- [ ] Delete wrapper source files: `ContainedInput.tsx`, `RateupButtons.tsx`, `PaperLayout.tsx`, `FormModalLayout.tsx`, `SimpleModalLayout.tsx`

---

## Phase 1: Layout Primitives (~200 files) — LOW RISK

Replace with Tailwind utility classes. No new dependencies needed.

| Component       | Count | Replacement                                          |
| --------------- | ----- | ---------------------------------------------------- |
| Stack           | 139   | `<div className="flex flex-col gap-*">`              |
| Group           | 125   | `<div className="flex flex-row gap-* items-center">` |
| Box             | 83    | `<div>`                                              |
| Flex            | 40    | `<div className="flex ...">`                         |
| Center          | 25    | `<div className="flex items-center justify-center">` |
| Text            | 120   | `<p>` / `<span>` with Tailwind typography            |
| Title           | 30    | `<h1>`–`<h6>` with Tailwind                          |
| Image           | 33    | `<img>`                                              |
| Space           | 1     | margin/padding                                       |
| SimpleGrid      | 10    | CSS Grid with Tailwind                               |
| Grid            | 4     | CSS Grid with Tailwind                               |
| Container       | 3     | `<div className="container mx-auto">`                |
| BackgroundImage | 4     | `<div style={{ backgroundImage }}>`                  |

- [ ] Stack → div.flex.flex-col
- [ ] Group → div.flex.flex-row
- [ ] Box → div
- [ ] Flex → div.flex
- [ ] Center → div.flex.items-center.justify-center
- [ ] Text → p/span
- [ ] Title → h1-h6
- [ ] Image → img
- [ ] SimpleGrid / Grid → CSS grid
- [ ] Container → div.container
- [ ] BackgroundImage → div with bg style
- [ ] Space → remove, use gap/margin

---

## Phase 2: Simple Components (~80 files) — LOW RISK

Direct shadcn swaps. Install shadcn components first.

| Mantine        | Count | shadcn Equivalent                       |
| -------------- | ----- | --------------------------------------- |
| Button         | 47    | `shadcn/Button`                         |
| ActionIcon     | 43    | `shadcn/Button` variant=ghost size=icon |
| Badge          | 22    | `shadcn/Badge`                          |
| Tooltip        | 27    | `shadcn/Tooltip`                        |
| Divider        | 15    | `shadcn/Separator`                      |
| Skeleton       | 16    | `shadcn/Skeleton`                       |
| Loader         | 17    | Custom spinner component                |
| Avatar         | 4     | `shadcn/Avatar`                         |
| Card           | 11    | `shadcn/Card`                           |
| Paper          | 12    | `shadcn/Card`                           |
| Anchor         | 6     | `<a>` or `Link`                         |
| Alert          | 2     | `shadcn/Alert`                          |
| Blockquote     | 2     | `<blockquote>`                          |
| Progress       | 4     | `shadcn/Progress`                       |
| RingProgress   | 1     | Custom SVG or radial progress           |
| Indicator      | 2     | Custom dot badge                        |
| CopyButton     | 3     | Custom with `navigator.clipboard`       |
| CloseButton    | 1     | `shadcn/Button` with X icon             |
| LoadingOverlay | 6     | Custom overlay component                |

- [ ] Install shadcn: button, badge, tooltip, separator, skeleton, avatar, card, alert, progress
- [ ] Button + ActionIcon migration
- [ ] Badge migration
- [ ] Tooltip migration
- [ ] Divider → Separator
- [ ] Skeleton + Loader migration
- [ ] Card + Paper migration
- [ ] Remaining simple components

---

## Phase 3: Form Inputs (~60 files) — MEDIUM RISK

| Mantine      | Count | shadcn Equivalent                   |
| ------------ | ----- | ----------------------------------- |
| TextInput    | 18    | `shadcn/Input`                      |
| Select       | 14    | `shadcn/Select`                     |
| Checkbox     | 10    | `shadcn/Checkbox`                   |
| Radio        | 10    | `shadcn/RadioGroup`                 |
| Switch       | 10    | `shadcn/Switch`                     |
| NumberInput  | 9     | `shadcn/Input` type=number (custom) |
| Textarea     | 6     | `shadcn/Textarea`                   |
| MultiSelect  | 5     | Custom combobox multi-select        |
| Input        | 6     | `shadcn/Input`                      |
| FileButton   | 6     | Custom file input                   |
| Slider       | 4     | `shadcn/Slider`                     |
| Rating       | 6     | Custom star rating                  |
| PinInput     | 2     | `shadcn/InputOTP`                   |
| TagsInput    | 2     | Custom tags input                   |
| Autocomplete | 2     | `shadcn/Command` combobox           |
| ColorPicker  | 2     | Custom color picker                 |
| Combobox     | 2     | `shadcn/Command`                    |
| FileInput    | 1     | Custom file input                   |

- [ ] Install shadcn: input, select, checkbox, radio-group, switch, textarea, slider, input-otp, command
- [ ] TextInput + Input + Textarea migration
- [ ] Select + MultiSelect + Combobox migration
- [ ] Checkbox + Radio + Switch migration
- [ ] NumberInput → custom number input
- [ ] Remaining input components

---

## Phase 4: Complex Components (~40 files) — MEDIUM RISK

| Mantine            | Count | shadcn Equivalent               |
| ------------------ | ----- | ------------------------------- |
| Modal              | 20    | `shadcn/Dialog`                 |
| Tabs               | 9     | `shadcn/Tabs`                   |
| Menu               | 6     | `shadcn/DropdownMenu`           |
| Accordion          | 1     | `shadcn/Accordion`              |
| Popover            | 5     | `shadcn/Popover`                |
| HoverCard          | 3     | `shadcn/HoverCard`              |
| ScrollArea         | 8     | `shadcn/ScrollArea`             |
| ScrollAreaAutosize | 10    | `shadcn/ScrollArea`             |
| Collapse           | 2     | `shadcn/Collapsible`            |
| SegmentedControl   | 2     | `shadcn/Tabs` or custom         |
| NavLink            | 2     | Custom nav link                 |
| Pagination         | 2     | `shadcn/Pagination`             |
| Table              | 2     | `shadcn/Table`                  |
| Spoiler            | 1     | Custom show/hide                |
| Chip               | 1     | `shadcn/Badge` variant          |
| Overlay            | 2     | Custom overlay                  |
| Portal             | 2     | React `createPortal`            |
| Transition         | 1     | CSS transitions / framer-motion |
| List               | 1     | `<ul>/<ol>`                     |

- [ ] Install shadcn: dialog, tabs, dropdown-menu, accordion, popover, hover-card, scroll-area, collapsible, pagination, table
- [ ] Modal → Dialog migration
- [ ] Tabs migration
- [ ] Menu → DropdownMenu migration
- [ ] ScrollArea migration
- [ ] Remaining complex components

---

## Phase 5: Hooks (~115 refs) — LOW-MEDIUM RISK

Write small custom hooks or use lightweight packages.

| Mantine Hook             | Count | Replacement                                |
| ------------------------ | ----- | ------------------------------------------ |
| useDisclosure            | 59    | `useState<boolean>` with open/close/toggle |
| useMediaQuery            | 20    | Custom hook or `@uidotdev/usehooks`        |
| getHotkeyHandler         | 16    | Custom keyboard event handler              |
| useListState             | 8     | `useState` with array helpers              |
| useHover                 | 7     | CSS `:hover` or custom ref-based hook      |
| useDebouncedState        | 6     | `useDebouncedCallback` from `use-debounce` |
| useUncontrolled          | 3     | Custom controlled/uncontrolled hook        |
| useHotkeys               | 2     | `react-hotkeys-hook`                       |
| useDebouncedCallback     | 2     | `use-debounce` package                     |
| useScrollIntoView        | 2     | `element.scrollIntoView()`                 |
| useViewportSize          | 2     | Custom resize observer hook                |
| useIntersection          | 2     | Custom IntersectionObserver hook           |
| useCounter               | 2     | `useState` with inc/dec                    |
| useClickOutside          | 2     | Custom ref-based hook                      |
| useMantineTheme          | 18    | Tailwind theme / CSS variables             |
| useMantineColorScheme    | 4     | `next-themes` or custom                    |
| isLightColor / luminance | 9     | `color2k` or custom util                   |

- [ ] Create `useDisclosure` replacement hook
- [ ] Create `useMediaQuery` replacement hook
- [ ] Replace `getHotkeyHandler` usages
- [ ] Replace `useListState` usages
- [ ] Replace remaining hooks
- [ ] Replace theme hooks with Tailwind/CSS vars
- [ ] Replace color utilities

---

## Phase 6: Form System (~59 files) — HIGH RISK

Migrate from `@mantine/form` to `react-hook-form` + `zod`.

| Mantine           | Count | Replacement               |
| ----------------- | ----- | ------------------------- |
| useForm           | 59    | `react-hook-form` useForm |
| schemaResolver    | 13    | `@hookform/resolvers/zod` |
| UseFormReturnType | 23    | RHF types                 |
| isNotEmpty        | 13    | `z.string().min(1)`       |
| hasLength         | 1     | `z.string().min/max()`    |
| matches           | 1     | `z.string().regex()`      |

- [ ] Install react-hook-form + @hookform/resolvers + zod
- [ ] Create form migration helper patterns
- [ ] Migrate forms file-by-file (59 files)
- [ ] Remove @mantine/form

---

## Phase 7: Specialized (~30 files) — HIGHEST RISK

| Package                          | Files | Replacement                                   |
| -------------------------------- | ----- | --------------------------------------------- |
| @mantine/tiptap (RichTextEditor) | 21    | Raw Tiptap + custom toolbar, or Plate UI      |
| @mantine/modals (modal manager)  | 18    | Custom modal manager or per-component dialogs |
| @mantine/dates (DatePicker etc.) | 12    | `react-day-picker` + shadcn date picker       |
| @mantine/dropzone                | 3     | `react-dropzone` + custom UI                  |

- [ ] Migrate RichTextEditor to raw Tiptap
- [ ] Replace modals manager with per-component Dialog
- [ ] Migrate date pickers
- [ ] Migrate dropzone
- [ ] Remove all @mantine/\* packages from package.json
- [ ] Remove MantineProvider from providers.tsx
- [ ] Remove mantineTheme.ts config
- [ ] Final cleanup and testing

---

## Post-Migration Cleanup

- [ ] Remove `@mantine/*` from package.json
- [ ] Remove `MantineProvider` from [providers.tsx](src/components/providers.tsx)
- [ ] Remove [mantineTheme.ts](src/config/mantineTheme.ts)
- [ ] Run `npm run typecheck` — fix all type errors
- [ ] Run `npm run lint:fix` — fix lint issues
- [ ] Run `npm run build` — verify build succeeds
- [ ] Manual QA of all major flows
