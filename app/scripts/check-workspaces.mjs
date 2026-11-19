import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:5197';
const browser = await chromium.launch();
try {
  for (const options of [devices['Pixel 7'], {viewport:{width:1280,height:800}}]) {
    const page = await browser.newPage(options); page.setDefaultTimeout(6500);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?lat=28&lon=45&date=2026-11-04&time=09:15');
    await page.waitForFunction(()=>document.querySelector('input[type=date]')?.value==='2026-11-04');
    await page.getByRole('link',{name:'Lunar Parallax',exact:true}).click();
    await page.locator('#leftDynamic .sight').first().waitFor();
    assert.equal(new URL(page.url()).pathname,'/lunar-parallax/');
    await page.locator('#stepForward').click();assert.match(await page.locator('#utcReadout').innerText(),/22:29/);
    await page.getByRole('link',{name:'Moon Path',exact:true}).click();
    const q=new URL(page.url()).searchParams;assert.equal(+q.get('lat'),28);assert.equal(+q.get('lon'),45);assert.equal(q.get('date'),'2026-11-04');assert.equal(q.get('time'),'09:15');
    await page.goBack();await page.locator('#triangleSvg .sight').first().waitFor();
    await page.goto(base+'/lunar-parallax/');await page.locator('#leftDynamic .sight').first().waitFor();
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: both workspaces, direct route, live geometry, return place/time and Back on Pixel and desktop.');
} finally {await browser.close();}
