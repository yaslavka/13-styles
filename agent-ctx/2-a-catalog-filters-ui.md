# Task 2-a — Catalog filters UI redesign (sidebar + bottom sheet)

Agent: catalog-filters-ui
Date: completed
Status: DONE (lint clean, dev compile clean, pages verified via curl)

## What was built

Rewrote `src/components/catalog/CatalogView.jsx` (pure JSX, 'use client') keeping the props
contract (`categories`, `lockedCategory`, `lockedSub`), the API contract (`/api/products`) and
all data-flow logic (persisted zustand filters, debounced search sync with `?search=` URL param
via the "adjust state during render" pattern, infinite scroll via `useInfiniteList`, ProductGrid,
ProductGridSkeleton, empty state, loadedAll footer, h1 + items count heading).

### Layout
- DESKTOP (lg+): two-column flex layout. Left = sticky filter sidebar
  (`hidden w-80 shrink-0 self-start lg:sticky lg:top-[96px] lg:block`), glass-panel with
  internal scroll (`max-h-[calc(100vh-7.5rem)] overflow-y-auto scrollbar-glass`), header row
  "FILTERS" + "Reset everything". Right = toolbar row (items count + sort select, slim) above
  the products grid, sentinel, skeletons, loadedAll footer.
- MOBILE (<lg): floating centered bottom "Filters" button (glass-btn-orange, SlidersHorizontal
  icon, white badge with active-filter count) that opens a vaul Drawer (side=bottom via default
  direction), `max-h-[85vh] rounded-t-[1.6rem] bg-[#150f2e]/95 backdrop-blur-2xl`, scrollable
  filter body, sticky footer with "Show results" (closes) and "Clear all" (resets + closes).
  Filters apply live; toolbar row with count+sort also above the mobile grid; sort section also
  duplicated inside the drawer.

### Sidebar sections (small uppercase bold headers, role=group + aria-pressed chips)
1. SEARCH — Input synced with `?search=`, debounced 400ms (existing logic kept; effect uses
   `useShop.getState()` to avoid reset-clobbering and exhaustive-deps warnings).
2. CATEGORY — chips: "All" -> navigate('catalog'); each category -> navigate('category',{slug});
   locked category shown as the active chip.
3. SUBCATEGORY — locked: chips from activeCategory.subcategories -> navigate('subcategory',
   {slug, sub}) + "All subcategories" -> navigate('category',{slug}); unlocked: collapsible
   `<details>` (group-open ChevronDown) grouped by category, each sub navigates to its SEO page.
4. GENDER — Select (all/men/women/unisex) -> filters.gender.
5. PRICE — min/max number inputs clamped to PRICE_LIMITS (0..500).
6. SIZES — clothing chips (XS..XXL) + shoes chips ('36'..'45' with tiny "Shoes" caption),
   toggle in filters.sizes.
7. BADGES — NEW / TOP / SALE chips -> filters.label ('new'|'hit'|'sale', active click -> 'all').
8. DISCOUNT ONLY — Switch -> filters.discount.
9. RATING — chips Any / 4.5+ / 4.8+ -> setFilter({rating: 0|4.5|4.8}); read as
   `filters.rating || 0`; included in buildUrl when > 0; reset works because resetFilters()
   restores initialFilters without `rating` (undefined -> 0).
10. SORT — Select with SORT_OPTIONS -> filters.sort; desktop toolbar row above grid
    (+ total count); mobile: in drawer AND slim row above grid.

- Active filter count = sizes + gender + label + discount + rating>0 + min/max changed + search;
  badge on the floating button and drawer title.
- buildUrl includes: locked category/sub (plus legacy `filters.category` fallback preserved),
  gender, search, sort, label, min, max (<PRICE_LIMITS.max), sizes join(','), discount=1,
  rating (>0), offset, limit. Verified against `/api/products/route.js` (rating param supported).
- A11y: aria-labels on controls, aria-pressed on all toggle chips, role=group on chip groups,
  sr-only DrawerDescription, aria-live regions for count/loadedAll, 44px drawer buttons.
- No blue/indigo colors: purple-200/300 accents, orange-300/500 highlights, glass classes only.

## Files changed
- `src/components/catalog/CatalogView.jsx` — full rewrite (only this file for the UI).
- `src/locales/en.json` — appended 7 new keys (append-only).

## New i18n keys (en.json)
- catalog.search = "Search"
- catalog.badges = "Badges"
- catalog.rating = "Min rating"
- catalog.ratingAny = "Any"
- catalog.priceMin = "Min price"
- catalog.priceMax = "Max price"
- catalog.sizeShoes = "Shoes"

(Reused existing keys: catalog.filters, catalog.applyFilters, catalog.clearFilters,
catalog.showResults, catalog.categories, catalog.subcategories, category.allSubcategories,
catalog.all, catalog.sort, catalog.gender, catalog.price, catalog.discountOnly, catalog.sizes,
catalog.resetAll, catalog.searchPlaceholder, catalog.emptyTitle/Text, catalog.loadedAll,
catalog.items, catalog.title, catalog.itemsShort, sort.*, gender.*, toast.loadError.)

## Verification
- `bun run lint` → clean (no errors, no warnings).
- `curl http://localhost:3000/catalog` → HTTP 200, all filter sections present in SSR HTML
  (search, categories, subcategories, Min rating, Discounted only, Sizes, Badges, Sort by).
- `curl http://localhost:3000/catalog/category/men` → HTTP 200, "All subcategories" chip present.
- `dev.log` → clean compile, GET 200s, no errors.

## Notes for next agents
- Store `initialFilters` intentionally has no `rating` key; CatalogView treats
  `filters.rating || 0` as "off" — do not add UI that assumes `rating` always exists.
- The floating mobile button is wrapped in a `fixed inset-x-0 bottom-4 z-30` container because
  `.glass-btn` sets `position:relative` (known globals.css quirk) — keep the wrapper pattern.
- Drawer override of `max-h-[80vh]` -> `max-h-[85vh]` relies on tailwind-merge inside `cn()`.
