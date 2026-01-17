import puppeteer from 'puppeteer';

async function debugExtraction() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Load the saved screenshot HTML or navigate to a test page
  // For now, let's analyze the page structure from the screenshot
  
  // Read the HTML from the screenshot page
  await page.goto('file:///tmp/mywfg-report-after-generate.png');
  
  // Since we can't load the actual page, let's create a test HTML that mimics the structure
  const testHtml = `
    <html>
    <body>
      <table>
        <tr>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Bulletin Name</th>
          <th>Associate ID</th>
          <th>Title Level</th>
          <th>Comm Level</th>
          <th>LL Flag</th>
          <th>LL End Date</th>
        </tr>
        <tr>
          <td>Adeyinka</td>
          <td>Adedire</td>
          <td>Adeyinka</td>
          <td>E7X0L</td>
          <td>01</td>
          <td>01</td>
          <td>Yes</td>
          <td>03-31-26</td>
        </tr>
        <tr>
          <td>Adejare</td>
          <td>Adetona</td>
          <td>Adejare</td>
          <td>D5L56</td>
          <td>01</td>
          <td>01</td>
          <td>Yes</td>
          <td>11-08-26</td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  await page.setContent(testHtml);
  
  // Test the extraction logic
  const result = await page.evaluate(() => {
    const agents = [];
    const tables = Array.from(document.querySelectorAll('table'));
    console.log('Found tables:', tables.length);
    
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      console.log('Found rows:', rows.length);
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        console.log(`Row ${i} has ${cells.length} cells`);
        
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || '';
          const lastName = cells[1]?.textContent?.trim() || '';
          const bulletinName = cells[2]?.textContent?.trim() || '';
          const agentCode = cells[3]?.textContent?.trim() || '';
          const titleLevel = cells[4]?.textContent?.trim() || '';
          const commLevel = cells[5]?.textContent?.trim() || '';
          const col6 = cells[6]?.textContent?.trim() || '';
          const col7 = cells[7]?.textContent?.trim() || '';
          
          // Skip header rows
          if (firstName === 'First_Name' || firstName === 'First Name' || !firstName || !agentCode) {
            continue;
          }
          
          // Validate agent code format
          if (!agentCode.match(/^[A-Z0-9]{5}$/i)) {
            continue;
          }
          
          const isLLFlag = col6.toLowerCase() === 'yes' || col6.toLowerCase() === 'no';
          const llFlag = isLLFlag ? col6 : '';
          
          agents.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: llFlag.toLowerCase() === 'yes',
            llEndDate: isLLFlag ? col7 : null,
          });
        }
      }
    }
    
    return { agents, tableCount: tables.length };
  });
  
  console.log('Extraction result:', JSON.stringify(result, null, 2));
  
  await browser.close();
}

debugExtraction().catch(console.error);
