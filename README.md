# Global Energy Atlas

Interactive energy dashboard comparing consumption, electricity prices, power mix, production, and international flows across 15 major markets.

## Published site

https://global-energy-atlas.nestor-esquivel.chatgpt.site/

## Project structure

- `app/` — dashboard interface and styling
- `public/energy-data-chart-ready.csv` — dataset used by the website
- `data/energy-data.csv` — complete source dataset with source URLs and notes
- `data/energy-data-chart-ready.csv` — analysis-ready copy of the dataset
- `.openai/hosting.json` — OpenAI Sites project configuration

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Build the production version with:

```bash
npm run build
```

## Deployment

The `origin` remote points to GitHub. The `sites` remote is reserved for the OpenAI Sites deployment workflow.
