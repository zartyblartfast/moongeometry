import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'file:///C:/hermes/moongeometry/app/node_modules/playwright/index.mjs';
import { createStudyServer } from './server.mjs';
const out = process.argv[2] || 'C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-live-studies';
await fs.mkdir(out, { recursive: true });
const owned = createStudyServer(); await new Promise(r => owned.server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${owned.server.address().port}`;
console.log('READY ' + origin + '/__study/');
const browser = await chromium.launch({ headless: true });
const results = { origin, capturedAt: new Date().toISOString(), cases: [], assertions: [], proxy: owned.diagnostics, screenshots: [], limitations: ['Chromium emulation, not physical phone acceptance', 'Live local accepted-source app, not deployed study', 'No full suites or production build run'] };
const skySel = 'svg:not([data-share-sky-chart]):has([data-sky-horizon])';
const timeSel = 'input[aria-label="Scrub mean solar time through the selected day"]';
const latSel = 'input[type=range][min="-90"]';
function check(condition, label, details) { results.assertions.push({ label, pass: !!condition, details }); assert.ok(condition, label + (details ? ': ' + JSON.stringify(details) : '')); }
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function save() { await fs.writeFile(out + '/evidence.json', JSON.stringify(results, null, 2)); }
async function shot(page, name) { const file = out + '/' + name + '.png'; await page.screenshot({ path: file }); results.screenshots.push(file); return file; }
async function state(frame, name) {
  const value = await frame.evaluate(({ skySel, timeSel, latSel, name }) => {
    const rect = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { ...r.toJSON(), docTop: r.top + scrollY, docBottom: r.bottom + scrollY, full: r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; };
    const sky = document.querySelector(skySel); const stage = sky?.parentElement; const skySection = sky?.closest('section');
    const nodes = { header: document.querySelector('main>header'), sky, stage, skyHeader: skySection?.querySelector('[data-local-sky-header]'), status: skySection?.querySelector('[data-study-status]'), time: document.querySelector('input[type=time]'), timeGroup: document.querySelector('[data-study-time]'), scrubber: document.querySelector(timeSel), latitude: document.querySelector(latSel), latitudeGroup: document.querySelector('[data-study-latitude]'), longitude: document.querySelector('input[type=range][min="-180"]'), spin: document.querySelector('input[type=range][max="1000"]'), date: document.querySelector('input[type=date]'), form: document.querySelector('section[aria-label="Place and time"] form'), orbit: document.querySelector('canvas'), stats: skySection?.querySelector('dl'), place: document.querySelector('section[aria-label="Place and time"]') };
    const geometryAttrs = ['d','cx','cy','r','rx','ry','x','y','x1','x2','y1','y2','width','height','points','transform','viewBox','fill','stroke','stroke-width','stroke-dasharray','opacity'];
    const geometry = [...(sky?.querySelectorAll('path,circle,ellipse,line,polyline,polygon,g') || [])].map(e => [e.tagName, ...geometryAttrs.filter(a => e.hasAttribute(a)).map(a => [a,e.getAttribute(a)])]);
    return { name, layout: { mainDisplay: getComputedStyle(document.querySelector('main')).display, diagramsDisplay: getComputedStyle(document.querySelector('[data-study-diagrams]')).display, skyDisplay: getComputedStyle(skySection).display }, scrollY, url: location.href, historyLength: history.length, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scale: visualViewport.scale, coarse: matchMedia('(pointer:coarse)').matches }, rects: Object.fromEntries(Object.entries(nodes).map(([key,e]) => [key,rect(e)])), values: { time: document.querySelector('input[type=time]').value, latitude: document.querySelector(latSel).value, longitude: document.querySelector('input[type=range][min="-180"]').value, status: skySection?.querySelector('[data-study-status]')?.textContent, stats: skySection?.querySelector('dl')?.textContent, zone: document.querySelector('[title^="IANA zone:"]')?.title }, inputs: [...document.querySelectorAll('main input')].map(e => ({ type:e.type, min:e.min, max:e.max, value:e.value })), expanded: document.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded'), overflow: document.documentElement.scrollWidth > innerWidth, stageHeight: stage?.getBoundingClientRect().height, geometry, scientificCopy: [...document.querySelectorAll('main p, main dt, main dd')].map(e=>e.textContent), nativeSkyCount: document.querySelectorAll(skySel).length, exportSkyCount: document.querySelectorAll('[data-share-sky-chart]').length, notices: [...document.querySelectorAll('[data-study-notice]')].map(e=>({text:e.textContent,rect:rect(e)})), previewVisible: [...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='Preview' && getComputedStyle(e).display!=='none'), fonts: {outfit:document.fonts.check('16px Outfit'),fraunces:document.fonts.check('16px Fraunces')} };
  }, { skySel, timeSel, latSel, name });
  value.geometryHash = hash(value.geometry); delete value.geometry;
  check(!value.overflow, name + ' no horizontal overflow');
  check(value.nativeSkyCount === 1 && value.exportSkyCount === 1, name + ' one native / one excluded export sky');
  check(!value.previewVisible, name + ' DEV Preview uniformly hidden');
  return value;
}
async function ready(page, variant) {
  const response = await page.goto(`${origin}/__study/${variant}.html?capture=1`, { waitUntil:'domcontentloaded' });
  check(response.status() === 200, variant + ' HTTP 200');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const frame = page.frames().find(f => f !== page.mainFrame());
  await frame.waitForFunction(() => document.querySelector('input[type=time]')?.value === '20:00');
  await frame.locator('[title="IANA zone: America/New_York"]').waitFor({ state: 'attached' });
  await frame.evaluate(() => document.fonts.ready); await page.waitForTimeout(350);
  return frame;
}
async function scroll(frame, y) { await frame.evaluate(y => scrollTo({top:y,behavior:'instant'}),y); await new Promise(r=>setTimeout(r,100)); }
async function reveal(frame, selector) {
  return frame.evaluate(selector => { const e=document.querySelector(selector),r=e.getBoundingClientRect(), before=scrollY; let next=before;if(r.bottom>innerHeight-24)next+=r.bottom-innerHeight+24;if(r.top+before-next<24)next=r.top+before-24;scrollTo({top:next,behavior:'instant'});return {from:before,to:scrollY,delta:scrollY-before}; }, selector);
}
async function inspect(frame) {
  return frame.evaluate(skySel => { const sky=document.querySelector(skySel),s=sky.closest('section').querySelector('[data-study-status]');const r=sky.getBoundingClientRect(),q=s?.getBoundingClientRect();const top=Math.min(r.top,q?.top??r.top)+scrollY,bottom=Math.max(r.bottom,q?.bottom??r.bottom)+scrollY;const before=scrollY;let next=before;if(bottom-next>innerHeight-24)next=bottom-innerHeight+24;if(top-next<24)next=top-24;scrollTo({top:next,behavior:'instant'});return {from:before,to:scrollY,delta:scrollY-before}; },skySel);
}
async function drag(page, frame, selector, target, mobile) {
  const locator=frame.locator(selector);const box=await locator.boundingBox();const a=await locator.evaluate(e=>({min:+e.min,max:+e.max,value:+e.value}));
  await locator.evaluate(e=>{e.dataset.studyTrusted=''; e.addEventListener('input',event=>{e.dataset.studyTrusted=String(event.isTrusted);},{once:true});});
  const x=v=>box.x+8+(box.width-16)*(v-a.min)/(a.max-a.min);const y=box.y+box.height/2;
  check(y>=0 && y<390 || !mobile || await page.evaluate(()=>innerHeight)>390,'drag target on screen',{box});
  if(mobile){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x(a.value),y}]});for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x(a.value)+(x(target)-x(a.value))*i/12,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else {await page.mouse.move(x(a.value),y);await page.mouse.down();await page.mouse.move(x(target),y,{steps:12});await page.mouse.up();}
  await page.waitForTimeout(400);
  const after=await locator.inputValue(), trusted=await locator.getAttribute('data-study-trusted');
  check(+after===target,'actual exact range target',{before:a.value,after,target});check(trusted==='true','native trusted input event');
  return {before:a.value,after:+after,target,trusted:trusted==='true',method:mobile?'CDP touch drag':'mouse drag'};
}
const baselines=new Map();
try {
  for(const [width,height,mobile] of [[844,390,true],[1280,800,false],[1440,900,false],[390,844,true]]) {
    for(const variant of ['current','a','b']) {
      const id=`${variant}-${width}x${height}`;
      const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,permissions:[]});
      const page=await context.newPage();const c={id,variant,width,height,mobile,states:[],drags:[],errors:[],warnings:[],failedRequests:[],websocketErrors:[]};results.cases.push(c);
      page.on('pageerror',e=>c.errors.push({kind:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error')c.errors.push({kind:'console',message:m.text()});if(m.type()==='warning')c.warnings.push(m.text());});page.on('requestfailed',r=>c.failedRequests.push({url:r.url(),failure:r.failure()}));page.on('websocket',ws=>ws.on('socketerror',error=>c.websocketErrors.push(error)));
      const frame=await ready(page,variant);
      c.states.push(await state(frame,id+'-rest'));await shot(page,id+'-rest');
      if(mobile){await frame.locator('button[aria-expanded]').click();await page.waitForTimeout(200);await scroll(frame,0);c.states.push(await state(frame,id+'-expanded-top'));await shot(page,id+'-expanded-top');}
      if(width===844 && variant!=='current'){
        const s=await state(frame,id+'-before-position');
        const y=variant==='a'?s.rects.timeGroup.docTop-80:Math.max(s.rects.stage.docBottom,s.rects.latitudeGroup.docBottom)-height+16;
        await scroll(frame,y);
      } else await scroll(frame,width===1280?90:width===390?503:width===844?107:0);
      c.states.push(await state(frame,id+'-comparison'));await shot(page,id+'-comparison');
      for(const [label,selector,target] of [['time-23',timeSel,1380],['time-20',timeSel,1200],['latitude-20',latSel,20],['latitude-40.7',latSel,40.7]]){
        if(width===844 && variant==='current')await reveal(frame,selector);
        const before=await state(frame,id+'-'+label+'-before');
        const edit=await drag(page,frame,selector,target,mobile);
        const after=await state(frame,id+'-'+label+'-after');
        check(after.scrollY===before.scrollY,id+' '+label+' no application scroll reset');
        check(after.historyLength===before.historyLength,id+' '+label+' no history growth');
        const query=new URL(after.url).searchParams;
        check(query.get('time')===after.values.time && +query.get('lat')===+after.values.latitude && +query.get('lon')===+after.values.longitude,id+' '+label+' native URL synchronized');
        if(!(width===844 && variant==='current')){
          check(after.rects.sky.full,id+' '+label+' full sky visible while editing',after.rects.sky);
          if(after.rects.status?.height)check(after.rects.status.full,id+' '+label+' primary status visible');
          check(after.rects[label.startsWith('time')?'scrubber':'latitude'].full,id+' '+label+' active slider fully visible');
        }
        const inspection=width===844&&variant==='current'?await inspect(frame):{from:after.scrollY,to:after.scrollY,delta:0};
        const observed=await state(frame,id+'-'+label+'-observed');
        const returned=width===844&&variant==='current'?await reveal(frame,selector):{from:after.scrollY,to:after.scrollY,delta:0};
        c.drags.push({label,...edit,inspection,returned,scrollDelta:after.scrollY-before.scrollY});c.states.push(after,observed);await shot(page,id+'-'+label);
      }
      // Reachability uses real scrolling/focus, not DOM reparenting or synthetic app events.
      c.reachable=[];
      for(const selector of ['input[type=search]','input[type=date]','input[type=time]',timeSel,latSel,'input[type=range][min="-180"]','input[type=range][max="1000"]']){
        const item=frame.locator(selector);await item.scrollIntoViewIfNeeded();const r=await item.boundingBox();check(r&&r.height>0&&r.y>=0&&r.y+r.height<=height+1,id+' original control reachable '+selector,r);c.reachable.push(selector);
      }
      if(width===844&&variant==='a'){
        const pane=frame.locator('[data-study-sky]');await pane.evaluate(e=>{e.scrollTop=0;});const box=await pane.boundingBox();const cdp=await context.newCDPSession(page);const x=box.x+box.width-20,y=box.y+box.height-28;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=14;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-220*i/14}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(350);
        c.skyPaneTouchScroll=await pane.evaluate(e=>({scrollTop:e.scrollTop,overscrollBehavior:getComputedStyle(e).overscrollBehavior}));check(c.skyPaneTouchScroll.scrollTop>0,id+' sky details scroll with trusted touch gesture');check(c.skyPaneTouchScroll.overscrollBehavior==='auto',id+' sky pane permits normal scroll chaining');
        await frame.locator('[data-study-sky]').evaluate(e=>{e.scrollTop=e.scrollHeight;});
        c.skyPane={scrollTop:await frame.locator('[data-study-sky]').evaluate(e=>e.scrollTop),scrollHeight:await frame.locator('[data-study-sky]').evaluate(e=>e.scrollHeight)};
        const formula=frame.locator('[data-study-sky] > p').filter({hasText:'Geometric h at meridian'});await formula.scrollIntoViewIfNeeded();check(await formula.isVisible(),id+' lower scientific caveat reachable');await shot(page,id+'-sky-details');
        await frame.locator('[data-study-sky]').evaluate(e=>{e.scrollTop=0;});
      } else {await frame.locator('[data-study-sky] > p').filter({hasText:'Geometric h at meridian'}).scrollIntoViewIfNeeded();await shot(page,id+'-sky-details');}
      if(width===844){
        for(const name of ['Explain','Share']){
          await frame.getByRole('button',{name,exact:true}).click();const dialog=frame.getByRole('dialog');await dialog.waitFor({state:'visible'});
          if(name==='Share'){await dialog.locator('img').waitFor({state:'visible'});await frame.waitForFunction(()=>[...document.querySelectorAll('[role=dialog] img')].some(e=>e.complete&&e.naturalWidth>0),null,{timeout:30000});c.share=await dialog.locator('img').evaluate(e=>({width:e.naturalWidth,height:e.naturalHeight,src:e.src.slice(0,5)}));check(c.share.src==='blob:',id+' actual generated share image');}
          await shot(page,id+'-'+name.toLowerCase());await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
        }
        // Collapse and re-expand native controls; return to exact resting layout.
        await frame.locator('button[aria-expanded]').click();await page.waitForTimeout(150);await scroll(frame,0);c.states.push(await state(frame,id+'-collapsed-again'));await shot(page,id+'-collapsed-again');
        await frame.locator('button[aria-expanded]').click();await page.waitForTimeout(150);check(await frame.locator('input[type=time]').isVisible(),id+' re-expansion preserves original controls');
        c.orientationControl=await frame.getByRole('button',{name:/Orient/}).count();check(c.orientationControl===0,id+' native orientation correctly absent without device-location source');
      }
      for(const s of c.states){
        const key=`${width}x${height}:${s.name.replace(id,'CASE')}`;
        if(variant==='current')baselines.set(key,s);
        else if(baselines.has(key)){
          const base=baselines.get(key);check(s.geometryHash===base.geometryHash,id+' scientific SVG geometry matches Current '+s.name);
          check(JSON.stringify(s.values)===JSON.stringify(base.values),id+' scientific values match Current '+s.name);
          check(JSON.stringify(s.inputs)===JSON.stringify(base.inputs),id+' original inputs match Current '+s.name);
          check(JSON.stringify(s.scientificCopy)===JSON.stringify(base.scientificCopy),id+' scientific copy retained '+s.name);
          if(width!==844||s.expanded==='false'){
            const clean=rects=>Object.fromEntries(Object.entries(rects).map(([k,r])=>[k,r?Object.fromEntries(Object.entries(r).filter(([key])=>!['y','top','bottom','full'].includes(key))):null]));
            check(JSON.stringify(clean(s.rects))===JSON.stringify(clean(base.rects)),id+' out-of-gate document geometry unchanged '+s.name);
          }
        }
      }
      check(!c.errors.length,id+' no app/console errors',c.errors);check(!c.failedRequests.length,id+' no failed requests',c.failedRequests);check(!c.websocketErrors.length,id+' no websocket errors',c.websocketErrors);
      await context.close();await save();console.log('PASS '+id);
    }
  }
  // Restore an actually edited shared URL in three fresh storage contexts.
  results.restorations=[];
  for(const variant of ['current','a','b']){
    const edited=results.cases.find(c=>c.variant===variant&&c.width===844).states.find(s=>s.name.endsWith('latitude-20-after'));
    const shared=new URL(edited.url);const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();
    await page.goto(`${origin}/__study/${variant}.html?capture=1&app=${encodeURIComponent(shared.pathname+shared.search)}`);await page.waitForFunction(()=>document.body.dataset.ready==='true');const frame=page.frames().find(f=>f!==page.mainFrame());await frame.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
    const restored=await state(frame,variant+'-shared-url-restoration');check(restored.values.latitude==='20'&&restored.values.time==='20:00',variant+' edited shared URL restored in fresh context');check(restored.geometryHash===edited.geometryHash,variant+' restored scientific geometry exact');results.restorations.push(restored);await context.close();
  }
  // Native responsive lifecycle in a single live frame, then return to landscape.
  for(const variant of ['a','b']){
    const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();const lifecycleErrors=[];page.on('pageerror',e=>lifecycleErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')lifecycleErrors.push(m.text());});const frame=await ready(page,variant);await frame.locator('button[aria-expanded]').click();
    const resize=[];
    for(const [width,height] of [[390,844],[1280,800],[1440,900],[844,390],[639,390],[640,390],[1023,540],[1024,540],[844,541],[844,390]]){
      await page.setViewportSize({width,height});await page.bringToFront();await page.waitForTimeout(350);const s=await state(frame,`${variant}-resize-${width}x${height}`);check(s.stageHeight===(width>=1024?256:208),variant+' resize preserves native sky height');check(s.layout.mainDisplay===(width>=640&&width<=1023&&height<=540?'grid':'flex'),variant+' exact narrow responsive gate');resize.push(s);
    }
    results[variant+'Resize']=resize;await shot(page,variant+'-resized-back');
    await frame.getByRole('button',{name:'Slide the Moon',exact:true}).click();await frame.locator('[data-study-notice]').filter({hasText:'Simulated sky.'}).waitFor();await frame.getByRole('button',{name:'Slide the Moon',exact:true}).click();const simulation=await state(frame,variant+'-simulated-notice');check(simulation.notices.some(n=>n.text.includes('Simulated sky.')),variant+' conditional simulated notice tagged');results[variant+'Simulation']=simulation;await shot(page,variant+'-simulated-notice');
    await context.grantPermissions(['geolocation'],{origin});await context.setGeolocation({latitude:40.7,longitude:-74,accuracy:50});
    await frame.getByRole('button',{name:'Use my location',exact:true}).click();const orient=frame.getByRole('button',{name:'Orient the sky path to true north',exact:true});await orient.waitFor({state:'visible'});check(await orient.isVisible(),variant+' native orientation appears only after explicit simulated device location');
    await orient.click();await frame.locator('[data-orientation-status="unavailable"]').waitFor({state:'visible',timeout:25000});
    const unavailable=await state(frame,variant+'-orientation-unavailable');results[variant+'Orientation']=unavailable;check(unavailable.notices.length===2,variant+' orientation unavailable and simulation notices both retained');
    const notices=unavailable.notices.map(n=>n.rect);check(notices[0].bottom<=notices[1].top,variant+' simultaneous conditional notices do not overlap');await shot(page,variant+'-orientation-unavailable');await frame.locator('[data-orientation-status] button').filter({hasText:'Close'}).click();
    results[variant+'LifecycleErrors']=lifecycleErrors;check(!lifecycleErrors.length,variant+' lifecycle no app/console errors',lifecycleErrors);await context.close();
  }
  // Review index and links/presets are real and use an exact native iframe viewport.
  const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();await page.goto(origin+'/__study/');await page.waitForFunction(()=>document.body.dataset.ready==='true');
  results.review=[];
  for(const variant of ['a','b','current']){
    await page.locator(`a[href="${variant}.html"]`).click();await page.waitForFunction(()=>document.body.dataset.ready==='true');const frame=page.frames().find(f=>f!==page.mainFrame());check(await frame.evaluate(()=>innerWidth===844&&innerHeight===390),variant+' review defaults exact 844x390');
    await page.getByRole('button',{name:'Comparison position',exact:true}).click();await shot(page,'review-'+variant);results.review.push({variant,url:page.url()});
  }
  for(const preset of ['portrait','desktop','wide','fit','landscape']){await page.locator('select').selectOption(preset);await page.waitForTimeout(150);results.review.push({preset,size:await page.frames()[1].evaluate(()=>({width:innerWidth,height:innerHeight}))});}
  await context.close();
  const forbidden=await fetch(origin+'/__study/server.mjs');check(forbidden.status===404,'server source not served');check(owned.diagnostics.upgrades>0,'WebSocket upgrades forwarded');check(!owned.diagnostics.httpErrors.length&&!owned.diagnostics.websocketErrors.length,'proxy healthy',owned.diagnostics);
  results.completed=true;
} catch(error) { results.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1; }
finally { await browser.close();await owned.close();results.ownedResourcesClosed=true;await save();const summary={completed:!!results.completed,cases:results.cases.length,drags:results.cases.reduce((n,c)=>n+c.drags.length,0),assertions:results.assertions.length,passed:results.assertions.filter(x=>x.pass).length,screenshots:results.screenshots.length,proxy:results.proxy,failure:results.failure};await fs.writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2)); }
