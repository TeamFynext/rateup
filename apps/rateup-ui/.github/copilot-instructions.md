# RateUp UI - AI Agent Instructions

## Project Overview

RateUp is an AI-powered omnichannel customer engagement platform built with **Next.js 14+ (App Router)**, TypeScript,**shadcn/ui** (Radix UI + Tailwind) for newer UI elements. The application supports multi-tenant architecture with WhatsApp Business API integration, surveys, loyalty programs, and customer engagement tools.

**Tech Stack:** Next.js 14+, TypeScript, React Query (TanStack), Mantine 8, shadcn/ui, Tailwind CSS, SuperTokens (auth), Axios, next-intl (i18n), Sentry

## Architecture Patterns

### Backend Communication Layer (`backend/` directory)

- **Pattern:** Domain-organized API clients + React Query hooks
- Each domain has its own folder (e.g., `backend/loyalty/`, `backend/whatsapp/`)
- Files typically paired: `*.api.ts` (raw Axios calls) + `*.query.tsx` (React Query hooks)
- Example: `backend/loyalty/earningRules.api.ts` exports functions, `earningRules.query.tsx` exports `useLoyaltyEarningRules()` hook
- **Base client:** `backend/apiClient.ts` provides configured `axiosClient` with interceptors
  - Base URL: `${process.env.NEXT_PUBLIC_API_URL}/api`
  - Automatic 403 subscription error handling
  - 8s timeout default

### State Management Strategy

1. **Server State:** React Query (TanStack) with aggressive defaults
   - 60s stale time, 10min garbage collection
   - Custom retry logic: no retries on 401/"Not authorized"
   - Query keys follow pattern: `['domain', id?, ...filters]`
   - Mutations trigger invalidation via `queryClient.invalidateQueries()`

2. **Authentication State:** SuperTokens + custom `UserContext`
   - `context/UserContext.tsx` stores user profile, org info, encryption keys
   - `useUser()` hook for accessing authenticated user data
   - Session managed by SuperTokens with auto-refresh

3. **UI State:** React hooks (useState, useContext) - no global state library

### Component Architecture

- **shadcn/ui:** Buttons, cards, tables, dialogs (`components/ui/`)
- When adding UI, match the surrounding codebase style

- **File Colocation:** Components organized by feature under `components/` (e.g., `components/whatsapp/`, `components/Survey/`)

- **Server vs Client Components:**
  - Default to Server Components in `app/` directory
  - Use `"use client"` only when needed (hooks, interactivity, browser APIs)
  - Layout components typically client-side due to Mantine/providers

### Styling Conventions

- **Tailwind CSS** primary styling system (see `app/globals.css`)
- **Utility function:** `cn()` from `lib/utils.ts` for conditional classes (clsx + tailwind-merge)

### Type Safety Patterns

- TypeScript strict mode disabled (`strict: false` in tsconfig) but aim for type safety
- API response types defined in `*.api.ts` files alongside functions
- Form validation with Zod + React Hook Form (see `@hookform/resolvers`)
- Enums defined in `types/enums.ts` for shared constants

## Developer Workflows

### Development Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm test             # Runs prettier + lint + typecheck
pnpm typecheck        # TypeScript checks only
pnpm prettier:write   # Auto-format code
pnpm lint             # ESLint check
```

### Adding New Features

1. **New API endpoint:**
   - Add function to appropriate `backend/*/[domain].api.ts`
   - Create corresponding React Query hook in `*.query.tsx`
   - Use TypeScript interfaces for request/response types
2. **New page:**
   - Create under `app/[route]/page.tsx`
   - Use Server Components by default
   - Client components need `"use client"` directive at top
3. **New UI component:**
   - For simple UI: Check shadcn/ui registry first (`components/ui/`)
   - For complex interactions: Use Mantine components
   - For feature-specific: Create in `components/[feature]/`

### Import Ordering (Prettier Plugin)

Follow the enforced order in `prettier.config.js`:

1. React/Next imports
2. Tabler icons
3. Third-party packages
4. Types, configs, lib
5. Internal aliases (`@/backend`, `@/components`, etc.)
6. Relative imports (`./`, `../`)

## Critical Integration Points

### Authentication Flow (SuperTokens)

- Client initialization in `components/SuperToken/supertokensProvider.tsx`
- Config in `config/frontend.tsx` and `config/appInfo.ts`
- Session checks in hooks: `useCheckSessionAppRouter()`, `checkSession.tsx`
- Protected routes handled via Next.js middleware patterns

### Data Fetching Patterns

```typescript
// Standard pattern - API function
export async function getLoyaltyEarningRules() {
  const res = await axiosClient.get(`${LOYALTY_BASE}/earning-rules`);
  return res.data as LoyaltyEarningRule[];
}

// React Query hook
export const useLoyaltyEarningRules = () =>
  useQuery({
    queryKey: ["loyalty-earning-rules"],
    queryFn: getLoyaltyEarningRules,
  });
```

### Internationalization (next-intl)

- Dictionary files in `dictionaries/` (e.g., `en.json`, `es.json`)
- Server-side: `await getMessages()` and `await getLocale()`
- Client-side: `useMessages()`, `useTranslations()` hooks
- Messages provider wrapped in `app/providers.tsx`

### Environment Variables

Key variables (from `.env.local`):

- `NEXT_PUBLIC_API_URL` - Backend API base URL
- `NEXT_PUBLIC_FRONTEND_URL` - Frontend URL (determines `isProduction`)
- `NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL` - CDN for static images
- `NEXT_PUBLIC_AWS_CLOUDFRONT_URL` - CDN for user uploads

## Common Pitfalls & Solutions

1. **Hydration Errors:** Radix components in Server Components cause hydration mismatches. Wrap in `"use client"` boundary or use dynamic imports with `ssr: false`.

2. **Query Invalidation:** After mutations, always invalidate related queries:

   ```typescript
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
   };
   ```

3. **Axios Timeout:** Default 8s timeout may be too short for heavy operations. Override per-request:

   ```typescript
   axiosClient.post("/endpoint", data, { timeout: 25000 });
   ```

4. **Image Paths:** Use `imagesPath` or `localImagesPath` constants from `utils/constants.ts` for consistent CDN/local paths.

5. **Path Aliases:** Always use `@/` imports for absolute paths (configured in `tsconfig.json` and `components.json`).

## Testing & Quality

- **No Jest tests currently** (mentioned in README but not implemented)
- Quality checks via `pnpm test`: prettier + lint + typecheck

## Key Files Reference

- `backend/apiClient.ts` - Axios base configuration
- `app/providers.tsx` - React Query + next-intl providers
- `context/UserContext.tsx` - User authentication state
- `utils/constants.ts` - Shared constants and paths
- `config/mantineTheme.ts` - Mantine theme customization
- `components/ui/*` - shadcn/ui components
- `types/enums.ts` - TypeScript enums for app-wide constants
