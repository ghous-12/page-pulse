# Page Pulse

Website speed checker powered by the Google PageSpeed Insights API.

## Setup

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### API key (recommended)

Calls without a key use Google’s **shared public quota**, which runs out quickly and shows errors like “Quota exceeded … project_number:583797351490”.

Use your own free key:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. Enable **PageSpeed Insights API**.
3. Create an **API key** (APIs & Services → Credentials).
4. Copy `.env.example` to `.env` and set:

```bash
VITE_PAGESPEED_API_KEY=your_key_here
```

5. Restart `npm run dev`.

Note: `https://pagespeedonline.googleapis.com/` is an API host only — opening it in a browser returns 404. That is expected.

## Stack

- React (Vite)
- Tailwind CSS
- PageSpeed Insights API (`strategy=mobile`)
