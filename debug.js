const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('http://localhost:8000', { waitUntil: 'load' });
  
  // click the chatbot bubble
  try {
    const bubble = await page.waitForSelector('.cb-bubble', { timeout: 2000 });
    await bubble.click();
    console.log("Clicked the chatbot.");
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if window exists
    const windowExists = await page.evaluate(() => document.querySelector('.cb-window') !== null);
    console.log("cb-window exists:", windowExists);
    
    // Type something
    await page.type('.cb-input-area input', 'hello', { delay: 100 });
    await page.click('.cb-input-area button');
    
    await new Promise(r => setTimeout(r, 2000));
    
  } catch (e) {
    console.log("Error during chat test:", e.message);
  }

  await browser.close();
})();
