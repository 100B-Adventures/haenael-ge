const { chromium } = require("playwright"); const path=require("path");
(async()=>{const b=await chromium.launch(); const out=[];
for (const w of [390,1280]) { const p=await b.newPage({viewport:{width:w,height:900}});
 await p.goto("file://"+path.join(__dirname,"index.html")); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
 const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)}));
 out.push(`${w}: scrollWidth=${m.sw} clientWidth=${m.cw} brokenImgs=${m.broken.length} ${m.broken.join(",")}`);
 const el=await p.$("#chats"); await el.screenshot({path:`/tmp/claude-1000/chats-${w}.png`});
 await p.screenshot({path:`/tmp/claude-1000/index-${w}.png`, fullPage:false}); await p.close(); }
await b.close(); console.log(out.join("\n"));})();
