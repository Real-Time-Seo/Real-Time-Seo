const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://real-time-seo-default-rtdb.firebaseio.com"
});

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
    
    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'completed',
      data: report,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Audit Error:", error);
    await db.ref('reports/' + process.env.AUDIT_ID).set({
      status: 'failed',
      error: error.message
    });
  } finally {
    await chrome.kill();
    process.exit(0);
  }
}

run();
