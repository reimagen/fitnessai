# Brand Guidelines

## Source of truth
- Tokens live in `src/app/globals.css` under `:root`.
- Prefer Tailwind theme tokens (e.g., `text-primary`, `bg-card`) over hardcoded colors.

## Color tokens
- Primary: `--primary` / `text-primary`, `bg-primary` (brand pink).
- Accent: `--accent` / `text-accent`, `bg-accent` (warm coral highlight).
- Background: `--background`, `--card`, `--popover` for surfaces.
- Muted: `--muted`, `--muted-foreground` for secondary text.
- Borders: `--border`, `--input` for outlines and form inputs.
- Chart palette: `--chart-1` through `--chart-6` for data visuals.

## Typography
- Headings: `font-headline` (use for card and page titles).
- Body: default `font-body` (inherited on body).
- Common sizes: `text-3xl` for page titles, `text-2xl` for card titles, `text-sm` for labels and helper text.

## UI patterns
- Page shell: `container mx-auto px-4 py-8`.
- Cards: `shadow-lg` and standard `CardHeader`, `CardContent`.
- Status states: use `ErrorState` for errors and centered spinners for loading.
- Rounding: cards `rounded-2xl`, buttons `rounded-xl`, inputs/selects/textareas `rounded-xl`.
- Tabs: `TabsList` and `TabsTrigger` use `rounded-xl` with active state matching rounding.
- Badges/chips: use pill shapes (`rounded-full`).

## Do and do not
- Do use theme tokens for all color usage.
- Do keep text sizing consistent across cards.
- Do keep changes localized to the component being edited.
- Do not introduce new colors without updating `globals.css`.
- Do not change copy or layout unless requested.

## Examples
- Primary CTA: `<Button className="bg-primary text-primary-foreground" />`
- Muted helper: `<p className="text-sm text-muted-foreground" />`
- Card title: `<CardTitle className="font-headline text-2xl" />`
