# VIC Idea Draw

A random-idea picker for [Value Investors Club](https://valueinvestorsclub.com). Draws a random company/ticker/date from VIC's public idea listing as a research prompt, then links out to the real idea on VIC (requires your own VIC login to open).

`index.html` is a single self-contained page — no server, no external requests, all data inline. Open it directly or host it as a static site.

## Data

- `data/ideas.json` — full scraped archive metadata (company, ticker, date, VIC url id) from VIC's public idea listing.
- `data/ref/` — NASDAQ/NYSE/AMEX symbol directories, used at build time to filter to U.S.-listed tickers only.
- `data/ideas_us.json` — the filtered, U.S.-listed subset actually embedded in `index.html`.

## Rebuilding

```
node src/build.js
```

Regenerates `index.html` from `src/shell.html` + `data/ideas.json` + `data/ref/*.txt`.
