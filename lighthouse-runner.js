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
    
    const sanitizedReport = JSON.parse(JSON.stringify(report));

    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'completed',
      data: sanitizedReport,
      timestamp: Date.now(),
      SECRET_KEY: 'Msdos755@'
    });
    
    console.log("Audit completed and data saved successfully.");
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
