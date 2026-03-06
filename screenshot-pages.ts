import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'doc');

interface PageToCapture {
  name: string;
  path: string;
  waitFor?: string; // Optional selector to wait for before screenshot
  delay?: number; // Optional delay in ms
}

// Define all pages to screenshot
const PUBLIC_PAGES: PageToCapture[] = [
  { name: '01-landing-page', path: '/', waitFor: 'text=DocuRoute', delay: 1000 },
  { name: '02-login-page', path: '/login', waitFor: 'text=Welcome back', delay: 500 },
  { name: '03-register-page', path: '/register', waitFor: 'text=Create your account', delay: 500 },
];

const DASHBOARD_PAGES: PageToCapture[] = [
  { name: '04-dashboard-overview', path: '/dashboard', delay: 1000 },
  { name: '05-dashboard-projects', path: '/dashboard/projects', delay: 1000 },
  { name: '06-dashboard-documents', path: '/dashboard/documents', delay: 1000 },
  { name: '07-dashboard-team', path: '/dashboard/team', delay: 1000 },
  { name: '08-dashboard-settings', path: '/dashboard/settings', delay: 1000 },
];

async function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(
  page: any,
  pageInfo: PageToCapture,
  outputDir: string
) {
  const url = `${BASE_URL}${pageInfo.path}`;
  console.log(`📸 Capturing: ${pageInfo.name} (${url})`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for specific element if specified
    if (pageInfo.waitFor) {
      await page.waitForSelector(pageInfo.waitFor, { timeout: 10000 });
    }

    // Additional delay if specified
    if (pageInfo.delay) {
      await page.waitForTimeout(pageInfo.delay);
    }

    // Take screenshot
    const screenshotPath = path.join(outputDir, `${pageInfo.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`✅ Saved: ${pageInfo.name}.png`);
  } catch (error) {
    console.error(`❌ Failed to capture ${pageInfo.name}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting screenshot capture process...\n');

  // Ensure output directory exists
  await ensureDirectoryExists(OUTPUT_DIR);
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  // Capture public pages
  console.log('📸 Capturing PUBLIC pages...');
  for (const pageInfo of PUBLIC_PAGES) {
    await captureScreenshot(page, pageInfo, OUTPUT_DIR);
  }

  console.log('\n📸 Capturing DASHBOARD pages (may show login prompt if not authenticated)...');
  for (const pageInfo of DASHBOARD_PAGES) {
    await captureScreenshot(page, pageInfo, OUTPUT_DIR);
  }

  // Close browser
  await browser.close();

  console.log('\n✨ Screenshot capture complete!');
  console.log(`📁 All screenshots saved to: ${OUTPUT_DIR}`);

  // List all screenshots
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n📋 Captured ${files.length} screenshots:`);
  files.sort().forEach(file => console.log(`   - ${file}`));
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
