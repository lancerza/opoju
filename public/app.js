/* FLOW Bet Dashboard logic */
async function fetchCSV(url){
  const resp = await fetch(url, {cache: 'no-store'});
  if(!resp.ok) throw new Error('โหลดไฟล์ไม่สำเร็จ: '+resp.status);
  const text = await resp.text();
  return text;
}

function parseCSV(text){
  // simple CSV parser for commas; supports quoted commas
  const rows = [];
  let cur='', inQ=false, row=[];
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' ){
      if(inQ && n === '"'){ cur+='"'; i++; }
      else inQ = !inQ;
    }else if(c === ',' && !inQ){ row.push(cur); cur=''; }
    else if((c === '\n' || c === '\r') && !inQ){
      if(cur.length||row.length){ row.push(cur); rows.push(row); row=[]; cur=''; }
    }else cur += c;
  }
  if(cur.length||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.length>1);
}

function num(x){
  const v = String(x||'').replace(/[, ]/g,'').trim();
  if(v==='') return 0;
  const n = +v;
  return isFinite(n) ? n : 0;
}

function format(n){
  return new Intl.NumberFormat('th-TH', {maximumFractionDigits:2}).format(n);
}

function groupByLine(rows, headers){
  const idxLine = headers.indexOf('สาย');
  const idxAmt  = headers.indexOf('ยอดแทง');
  const body = rows.slice(1);
  const map = new Map();
  for(const r of body){
    const line = (r[idxLine]||'').trim() || 'ไม่ระบุ';
    const amt  = num(r[idxAmt]);
    map.set(line, (map.get(line)||0)+amt);
  }
  return map;
}

let chart;

function render(map){
  const entries = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  const sum = entries.reduce((s,[,v])=>s+v,0);
  // rows
  const rowsEl = document.getElementById('rows');
  rowsEl.innerHTML = '';
  entries.forEach(([k,v])=>{
    const pct = sum>0 ? (v*100/sum) : 0;
    const div = document.createElement('div');
    div.className='rowi grid';
    div.innerHTML = `<div class="name">${k}</div>
                     <div class="val">${format(v)}</div>
                     <div class="val">${pct.toFixed(2)}%</div>`;
    rowsEl.appendChild(div);
  });
  document.getElementById('sum').textContent = format(sum);
  document.getElementById('count').textContent = entries.length;

  // chart
  const labels = entries.map(([k])=>k);
  const data   = entries.map(([,v])=> sum>0 ? +(v*100/sum).toFixed(2) : 0 );

  const ctx = document.getElementById('chart');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels,
      datasets:[{ data }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{ position:'bottom', labels:{ boxWidth:14, boxHeight:14 } },
        tooltip:{ callbacks:{
          label: (c)=> `${c.label}: ${c.formattedValue}%`
        }}
      },
      cutout: '60%'
    }
  });
}

async function loadDefault(){
  try{
    const text = await fetchCSV('./data/data.csv');
    const rows = parseCSV(text);
    const headers = rows[0].map(h=>h.trim());
    // basic header guard
    const need = ['วันที่','รายการ','สาย','ยอดแทง'];
    const ok = need.every(n => headers.includes(n));
    if(!ok) throw new Error('หัวคอลัมน์ต้องมี: '+need.join(', '));
    const map = groupByLine(rows, headers);
    render(map);
  }catch(err){
    console.warn(err);
    const el = document.querySelector('.muted');
    el.innerHTML = `ไม่พบไฟล์ <span class="warn">data/data.csv</span> — อัปโหลด CSV เพื่อทดสอบได้เลย`;
  }
}

document.getElementById('upload').addEventListener('change', async (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  document.getElementById('fileName').textContent = f.name;
  const text = await f.text();
  const rows = parseCSV(text);
  const headers = rows[0].map(h=>h.trim());
  const map = groupByLine(rows, headers);
  render(map);
});

loadDefault();
