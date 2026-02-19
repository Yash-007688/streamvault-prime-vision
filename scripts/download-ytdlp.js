import fs from 'fs';
import path from 'path';
import { platform } from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BIN_DIR = path.join(__dirname, '../bin');
const PLATFORM = platform();

let binaryName = 'yt-dlp';
let downloadUrl = '';

if (PLATFORM === 'win32') {
  binaryName = 'yt-dlp.exe';
  downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
} else if (PLATFORM === 'darwin') {
  binaryName = 'yt-dlp';
  downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
} else {
  // Linux (including Vercel)
  // We use the standalone binary to avoid Python dependency issues
  binaryName = 'yt-dlp';
  downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
}

const BIN_PATH = path.join(BIN_DIR, binaryName);

async function download() {
  console.log(`Preparing to install yt-dlp for ${PLATFORM}...`);

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  // Check if already exists
  if (fs.existsSync(BIN_PATH)) {
      console.log(`yt-dlp already exists at ${BIN_PATH}`);
      // Optional: check version or overwrite. For now, we skip if exists to save time/bandwidth
      // But for Vercel builds, we might want to ensure it's there.
      // Since Vercel caches node_modules but maybe not other folders unless configured?
      // Actually, let's always download in CI environments or just overwrite.
      // But for local dev, we don't want to re-download every time.
      // Let's check file size. If < 1KB, it's broken.
      const stats = fs.statSync(BIN_PATH);
      if (stats.size > 10000) {
          console.log("Binary seems valid, skipping download.");
          return;
      }
  }

  console.log(`Downloading from ${downloadUrl}...`);

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(BIN_PATH, Buffer.from(buffer));
    
    if (PLATFORM !== 'win32') {
      fs.chmodSync(BIN_PATH, 0o755);
    }
    
    console.log('yt-dlp downloaded successfully.');
    
    try {
        const version = execSync(`"${BIN_PATH}" --version`).toString().trim();
        console.log(`Verified yt-dlp version: ${version}`);
    } catch (e) {
        console.warn("Warning: Could not verify yt-dlp version:", e.message);
    }

  } catch (error) {
    console.error('Error downloading yt-dlp:', error);
    process.exit(1);
  }
}

download();
