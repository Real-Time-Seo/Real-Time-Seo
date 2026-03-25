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

async function run() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
    port: chrome.port
  };
  
  try {
    const runnerResult = await lighthouse(process.env.AUDIT_URL, options);
    const report = runnerResult.lhr;
    
    // ডাটাকে ওয়েবসাইটের ফরম্যাট অনুযায়ী সাজানো
    const cleanData = sanitize(report);

    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'completed',
      data: { lighthouseResult: cleanData }, // এখানে লজিক ঠিক করা হয়েছে
      timestamp: Date.now(),
      SECRET_KEY: 'Msdos755@'
    });
    
    console.log("Audit completed and data formatted for website.");
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
