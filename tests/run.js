const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.cwd();
const weeks = [1,2,3,4];
const results = [];

async function testWeek(browser, week, device) {
  const page = await browser.newPage();
  if(device === 'mobile'){
    const iPhone = puppeteer.devices['iPhone 8'];
    await page.emulate(iPhone);
  } else {
    await page.setViewport({width:1280,height:800});
  }
  const fileUrl = 'file://' + path.join(ROOT, `week${week}.html`);
  const out = {week, device, checks: []};
  try{
    await page.goto(fileUrl, {waitUntil:'networkidle2'});
    // navigation links
    const navExists = await page.$eval('.main-nav a[href="program.html"]', el => !!el).catch(()=>false);
    out.checks.push({name:'nav-link-program', pass: !!navExists});

    // ensure save buttons present on at least one day
    const saveExists = await page.$('.save-day') !== null;
    out.checks.push({name:'save-button-exists', pass: !!saveExists});

    // interact with Monday if present
    const monday = await page.$('#monday');
    if(monday){
      // set weight, notes, toggle checkbox, set exercise weight
      await page.evaluate(()=>{ localStorage.removeItem('test-run-marker'); });
      const weightSel = '#monday .weight-input';
      const noteSel = '#monday .notes';
      const checkSel = '#monday .check-complete';
      const exWeightSel = '#monday .machine-table tbody tr:first-child .ex-weight';
      await page.waitForTimeout(200);
      const setWeight = await page.$(weightSel);
      if(setWeight){ await page.evaluate((sel)=>document.querySelector(sel).value='123.4', weightSel); }
      const setNote = await page.$(noteSel);
      if(setNote){ await page.evaluate((sel)=>document.querySelector(sel).value='puppeteer-note', noteSel); }
      const setCheck = await page.$(checkSel);
      if(setCheck){ await page.evaluate((sel)=>document.querySelector(sel).checked=true, checkSel); }
      const setEx = await page.$(exWeightSel);
      if(setEx){ await page.evaluate((sel)=>document.querySelector(sel).value='9.9', exWeightSel); }
      // click save
      const saveBtn = await page.$('#monday .save-day');
      if(saveBtn){ await saveBtn.click(); await page.waitForTimeout(500);} 

      // read localStorage key
      const key = `gymcompanion:week${week}:monday`;
      const stored = await page.evaluate(k=>localStorage.getItem(k), key).catch(()=>null);
      let passStored = false;
      if(stored){
        try{ const obj = JSON.parse(stored); passStored = obj && (obj.weight==='123.4' || obj.weight==123.4) && obj.notes && obj.notes.indexOf('puppeteer-note')!==-1; }catch(e){}
      }
      out.checks.push({name:'save-persists-localStorage', pass: passStored});

      // reload and verify fields repopulate
      await page.reload({waitUntil:'networkidle2'});
      await page.waitForTimeout(300);
      const reWeight = await page.$eval(weightSel, el=>el.value).catch(()=>null);
      const reNote = await page.$eval(noteSel, el=>el.value).catch(()=>null);
      const reCheck = await page.$eval(checkSel, el=>el.checked).catch(()=>null);
      const reEx = await page.$eval(exWeightSel, el=>el.value).catch(()=>null);
      out.checks.push({name:'load-repopulates-weight', pass: reWeight=== '123.4'});
      out.checks.push({name:'load-repopulates-notes', pass: reNote && reNote.indexOf('puppeteer-note')!==-1});
      out.checks.push({name:'load-repopulates-check', pass: !!reCheck});
      out.checks.push({name:'load-repopulates-exweight', pass: reEx==='9.9'});

    } else {
      out.checks.push({name:'monday-section-present', pass:false});
    }

    // responsive smoke: check main container width less than viewport on mobile
    if(device==='mobile'){
      const contW = await page.$eval('.container', el=>el.getBoundingClientRect().width).catch(()=>null);
      const vp = await page.viewport();
      out.checks.push({name:'mobile-container-fits', pass: contW && contW <= vp.width});
    }

  }catch(err){
    out.error = String(err);
  }finally{
    try{ await page.close(); }catch(e){}
  }
  return out;
}

(async ()=>{
  const browser = await puppeteer.launch();
  try{
    for(const w of weeks){
      for(const device of ['desktop','mobile']){
        const res = await testWeek(browser,w,device);
        results.push(res);
        console.log(`Week ${w} ${device}:`, res.checks.map(c=>`${c.name}:${c.pass? 'PASS':'FAIL'}`).join(', '));
      }
    }
  }catch(e){ console.error(e); }
  await browser.close();
  // write QA report summary file
  const reportLines = [];
  reportLines.push('# QA Report — Weeks 1–4');
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push('');
  let allPass=true;
  for(const r of results){
    reportLines.push(`## Week ${r.week} — ${r.device}`);
    if(r.error) { reportLines.push(`ERROR: ${r.error}`); allPass=false; }
    for(const c of r.checks){
      reportLines.push(`- ${c.name}: ${c.pass ? 'PASS' : 'FAIL'}`);
      if(!c.pass) allPass=false;
    }
    reportLines.push('');
  }
  reportLines.push(allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  fs.writeFileSync(path.join(ROOT,'QA_REPORT.md'), reportLines.join('\n'));
  // exit nonzero if failures
  process.exit(allPass?0:2);
})();
