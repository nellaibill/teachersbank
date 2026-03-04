# Teachers Bank — Frontend

Next.js 14 + Tailwind CSS + TypeScript

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your API base URL
# Edit .env.local:
NEXT_PUBLIC_API_BASE=http://localhost/teachers-bank-api/index.php

# 3. Run development server
npm run dev
# Open http://localhost:3000
```

## Pages

| Route | Page |
|---|---|
| `/` | Dashboard with stats & quick actions |
| `/teachers` | Teacher list with search, filters, add/edit/view |
| `/dispatch` | Barcode scanner + dispatch list |
| `/followups` | Follow-up tracker with overdue alerts |
| `/reports` | Consolidated / Labels / Dispatch / School Address |

## Features

- **Barcode scanning** — connect USB scanner or type manually; real-time barcode preview
- **Mailing labels** — print-ready 4-column grid with barcodes
- **Auto followup escalation** — UI shows when next level will be auto-created  
- **Overdue alerts** — red banner on followups page for past-due items
- **Responsive** — works on desktop and mobile with collapsible sidebar
- **Print support** — all report pages hide UI chrome on print

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — custom design tokens
- **TypeScript** — fully typed
- **JsBarcode** — barcode rendering
- **react-hot-toast** — notifications
- **lucide-react** — icons
- **Google Fonts** — Fraunces (display) + DM Sans (body) + DM Mono (code)
