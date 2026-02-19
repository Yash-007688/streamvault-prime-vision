# StreamVault Prime Vision

YouTube downloader web app with:
- React frontend (Vite)
- Node.js API routes (`/api/*`) for video metadata + download URL
- `yt-dlp` for server-side extraction (no cobalt API dependency)

## What changed

- Removed dependency on external cobalt-style relay APIs
- Frontend now calls:
  - `POST /api/video-info`
  - `POST /api/video-download`
- Backend now uses `yt-dlp` through `child_process`
- Old Supabase Edge functions are marked deprecated (HTTP `410`)

## Required installs

1. Install Node modules:

```bash
npm install
```

2. Install `yt-dlp` on your server runtime:

- Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y yt-dlp
```

- Or with `pip`:
```bash
pip install -U yt-dlp
```

If `yt-dlp` is not in PATH, set `YTDLP_BIN` to its absolute path.

## Environment variables

Set these in `.env` locally and in deployment secrets:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
YTDLP_BIN=yt-dlp
YTDLP_TIMEOUT_MS=25000
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the client.

## Local run

```bash
npm run dev
```

Frontend will call local Vercel-style API routes at `/api/*` when running on Vercel.
For local Vite-only dev, run behind `vercel dev` if you want API routes active.

## Deploy on Vercel

1. Push this repository.
2. Import project in Vercel.
3. Add environment variables listed above.
4. Deploy.

### Important Vercel note

`yt-dlp` is a binary dependency. Some Vercel serverless environments may fail with:
- `YTDLP_MISSING`
- timeout during extraction

If that happens, move backend routes to Railway or a VPS.

## Railway / VPS migration (recommended for reliability)

Use Railway or a VPS for the backend API process when binary/runtime limits appear.

High-level steps:

1. Deploy backend with Node 20.
2. Install `yt-dlp` on the host.
3. Set the same environment variables.
4. Point frontend calls from `/api/...` to your backend base URL (for example `https://api.yourdomain.com/video-info`).

## API responses

### `POST /api/video-info`

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Response:

```json
{
  "title": "...",
  "thumbnail": "...",
  "videoId": "...",
  "author": "...",
  "availableFormats": [
    { "quality": "360p", "formatId": "18", "ext": "mp4", "height": 360 },
    { "quality": "720p", "formatId": "22", "ext": "mp4", "height": 720 }
  ]
}
```

### `POST /api/video-download`

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "quality": "720p",
  "title": "Optional title"
}
```

Response:

```json
{
  "title": "...",
  "thumbnail": "...",
  "author": "...",
  "qualityRequested": "720p",
  "qualityResolved": "720p",
  "formatId": "22",
  "downloadUrl": "https://....googlevideo.com/...",
  "expiresNote": "Download URL may expire quickly. Start download immediately."
}
```

## Error handling improvements

API now returns structured JSON:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes:
- `INVALID_URL`
- `UNAUTHORIZED`
- `INSUFFICIENT_TOKENS`
- `FORMAT_NOT_FOUND`
- `YTDLP_TIMEOUT`
- `YTDLP_MISSING`
- `DOWNLOAD_PROCESSING_FAILED`
