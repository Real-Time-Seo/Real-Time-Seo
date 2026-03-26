import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://real-time-seo-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

function sanitize(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const key of Object.keys(obj)) {
    const newKey = key.replace(/[\.\#\$\/\[\]]/g, '_');
    out[newKey] = sanitize(obj[key]);
  }
  return out;
}

const desktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    },
    emulatedUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
  }
};

async function runAudit(url, port, mode) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
    port: port
  };
  
  let config = undefined;
  if (mode === 'desktop') {
    config = desktopConfig;
  }
  
  const runnerResult = await lighthouse(url, options, config);
  return { lighthouseResult: sanitize(runnerResult.lhr) };
}

async function run() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });
  
  try {
    const url = process.env.AUDIT_URL;
    const mode = process.env.AUDIT_MODE || 'both';
    const finalData = {};

    if (mode === 'mobile' || mode === 'both') {
      console.log('Running Mobile Audit...');
      finalData.mobile = await runAudit(url, chrome.port, 'mobile');
    }

    if (mode === 'desktop' || mode === 'both') {
      console.log('Running Desktop Audit...');
      finalData.desktop = await runAudit(url, chrome.port, 'desktop');
    }

    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'completed',
      data: finalData,
      timestamp: Date.now(),
      SECRET_KEY: 'Msdos755@'
    });
    
    console.log("Audit completed and saved successfully.");
  } catch (error) {
    console.error("Audit Error:", error);
    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'failed',
      error: error.message,
      timestamp: Date.now(),
      SECRET_KEY: 'Msdos755@'
    });
  } finally {
    await chrome.kill();
    process.exit(0);
  }
}

run();
