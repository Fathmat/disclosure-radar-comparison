# Disclosure Change Radar

**Structured SEC filing material change detection engine**

Disclosure Change Radar transforms SEC filings (10-K, 10-Q, 8-K) into economically meaningful semantic change signals. It is designed for systematic portfolio managers, compliance teams, and fundamental analysts who need structured, auditable disclosure intelligence — not document diffs or summaries.

## Key Features

- **Noise Filtering** — Automatically excludes pagination, formatting, and structural changes; only semantic text changes proceed to classification.
- **Materiality Scoring** — Every semantic change is scored as `trivial`, `moderate`, `material`, or `critical` based on economic significance.
- **Economic Taxonomy** — Controlled vocabulary of 10 event types (e.g., `risk_new_category_added`, `liquidity_warning_added`, `litigation_exposure_added`).
- **Intensity Scoring** — Each change receives an intensity delta from -5.0 (risk softened) to +5.0 (risk intensified), based on modal verb shifts, uncertainty markers, and negative sentiment.
- **Source Verification** — Every extracted event references exact source spans with character-level offset verification.
- **Change Heatmap** — Visual overview of change density and materiality across filing sections.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Supabase (Postgres, Edge Functions, RLS)
- **AI**: Gemini 3 Flash (structured tool-calling for change extraction)

## Getting Started

```sh
git clone <YOUR_GIT_URL>
cd disclosure-change-radar
npm i
npm run dev
```

## Author

Fathmat Bakayoko
