# Prostate Biopsy Visualization

Client-side React app for turning prostate needle biopsy pathology report text into a prostate-zone visualization.

## Current Scope

- Upload or paste `.txt` report text.
- Upload text-based PDFs, parsed in the browser with PDF.js.
- Parse common systematic biopsy site labels: right/left, base/mid/apex, medial/lateral.
- Parse common findings: benign, atypical/PIN, adenocarcinoma, Gleason score, Grade Group, cores positive/total, percent involvement, pattern 4/5 percentage, perineural invasion, cribriform morphology, and intraductal carcinoma.
- Display a color-coded 2D map, schematic 3D prostate view, sortable-style table view, raw parsed JSON, and per-site detail panel.
- Provide plain-language explanations through summary text, term tooltips, and a glossary for patient-facing report review.

The parser and 3D positions are intentionally heuristic. Scanned PDFs need OCR before this app can read them, and the 3D view is schematic unless patient-specific MRI coordinates are added later.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```
