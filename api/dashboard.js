const { verifySession } = require('./_auth');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderDashboard({ username }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Analytics — tkmulti.com Admin</title>
<style>
  .viz-root{
    color-scheme: light;
    --surface-1:      #fcfcfb;
    --page-plane:     #f5f6fb;
    --text-primary:   #0b0b0b;
    --text-secondary: #52514e;
    --muted:          #898781;
    --gridline:       #e1e0d9;
    --baseline:       #c3c2b7;
    --series-1:       #2a78d6;
    --series-1-wash:  rgba(42,120,214,.10);
    --border:         rgba(11,11,11,.10);
    --good:           #006300;
  }
  *{box-sizing:border-box}
  body{margin:0; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--page-plane); color:var(--text-primary)}
  header{
    display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;
    padding:1rem 1.5rem; background:linear-gradient(120deg,#0b0730,#241866); color:#fff;
  }
  header h1{font-size:1.1rem; margin:0}
  header .right{display:flex; align-items:center; gap:1rem}
  header .user{font-size:.85rem; opacity:.85}
  header button.signout{
    background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.3);
    border-radius:6px; padding:.4rem .8rem; cursor:pointer; font-size:.85rem;
  }
  header button.signout:hover{background:rgba(255,255,255,.22)}
  .toolbar{
    display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;
    padding:1rem 1.5rem 0;
  }
  .range{display:flex; gap:.4rem; background:var(--surface-1); border:1px solid var(--border); border-radius:8px; padding:.25rem}
  .range button{
    border:0; background:transparent; padding:.4rem .8rem; border-radius:6px; cursor:pointer;
    font-size:.85rem; color:var(--text-secondary); font-family:inherit;
  }
  .range button.active{background:var(--series-1); color:#fff}
  main{padding:1rem 1.5rem 2.5rem; max-width:1180px; margin:0 auto}
  .state{max-width:640px; margin:2rem auto; background:var(--surface-1); border-radius:12px; padding:2rem; box-shadow:0 4px 20px rgba(0,0,0,.06); line-height:1.6}
  .state code{background:#f0f1f8; padding:.15rem .4rem; border-radius:4px; font-size:.9em}
  .stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:.85rem; margin:1rem 0}
  .stat{background:var(--surface-1); border-radius:12px; padding:1rem 1.1rem; box-shadow:0 1px 2px rgba(0,0,0,.04); border:1px solid var(--border)}
  .stat .label{font-size:.78rem; color:var(--text-secondary); margin-bottom:.35rem}
  .stat .value{font-size:1.6rem; font-weight:600}
  .card{background:var(--surface-1); border-radius:12px; padding:1.25rem; box-shadow:0 1px 2px rgba(0,0,0,.04); border:1px solid var(--border); margin-bottom:1rem}
  .card h2{font-size:.95rem; margin:0 0 1rem; color:var(--text-primary)}
  .grid-2{display:grid; grid-template-columns:1fr 1fr; gap:1rem}
  @media (max-width:800px){.grid-2{grid-template-columns:1fr}}
  .bar-row{display:flex; align-items:center; gap:.75rem; padding:.4rem 0; font-size:.85rem}
  .bar-row .name{flex:0 0 auto; width:40%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary)}
  .bar-row .track{flex:1; background:var(--gridline); border-radius:4px; height:8px; overflow:hidden}
  .bar-row .fill{background:var(--series-1); height:100%; border-radius:4px}
  .bar-row .val{flex:0 0 auto; width:60px; text-align:right; color:var(--text-secondary); font-variant-numeric:tabular-nums}
  svg.chart{width:100%; height:220px; overflow:visible}
  .tooltip{
    position:absolute; background:#0b0730; color:#fff; font-size:.75rem; padding:.35rem .55rem;
    border-radius:6px; pointer-events:none; opacity:0; transition:opacity .1s; white-space:nowrap; z-index:10;
  }
  .chart-wrap{position:relative}
  .empty{color:var(--muted); font-size:.85rem; padding:1rem 0}
  .loading{color:var(--muted); font-size:.9rem; padding:2rem; text-align:center}
</style>
</head>
<body class="viz-root">
  <header>
    <h1>tkmulti.com — Analytics</h1>
    <div class="right">
      <span class="user">Signed in as ${escapeHtml(username)}</span>
      <form method="POST" action="/admin/logout"><button class="signout" type="submit">Sign out</button></form>
    </div>
  </header>
  <div class="toolbar">
    <div class="range" id="range">
      <button data-days="7">7 days</button>
      <button data-days="28" class="active">28 days</button>
      <button data-days="90">90 days</button>
    </div>
    <div id="realtime" style="font-size:.85rem; color:var(--text-secondary)"></div>
  </div>
  <main id="app"><div class="loading">Loading analytics…</div></main>

<script>
(function(){
  var app = document.getElementById('app');
  var rangeEl = document.getElementById('range');
  var realtimeEl = document.getElementById('realtime');
  var currentDays = 28;

  function fmtNum(n){
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
  }
  function fmtDuration(sec){
    var m = Math.floor(sec/60), s = Math.round(sec%60);
    return m + 'm ' + s + 's';
  }
  function fmtDate(yyyymmdd){
    var y = yyyymmdd.slice(0,4), m = yyyymmdd.slice(4,6), d = yyyymmdd.slice(6,8);
    var dt = new Date(Number(y), Number(m)-1, Number(d));
    return dt.toLocaleDateString(undefined, {month:'short', day:'numeric'});
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderState(html){ app.innerHTML = html; }

  function renderSetup(message){
    renderState(
      '<div class="state">' +
      '<h2 style="margin-top:0">No GA4 connection yet</h2>' +
      '<p>' + esc(message || '') + '</p>' +
      '<p>To connect real data: create a Google Cloud service account with access to the ' +
      '<a href="https://analytics.google.com" target="_blank" rel="noopener">GA4 property</a> for ' +
      '<code>G-K0DF5N91SG</code> (grant it Viewer access under Admin → Property Access Management), ' +
      'then set <code>GA4_SERVICE_ACCOUNT_JSON</code> (the full service account key JSON) and ' +
      '<code>GA4_PROPERTY_ID</code> (the numeric GA4 property ID) as environment variables in Vercel.</p>' +
      '</div>'
    );
  }

  function renderError(message){
    renderState('<div class="state"><h2 style="margin-top:0">Couldn\\'t load analytics</h2><p>' + esc(message || 'Unknown error') + '</p></div>');
  }

  function barRows(items, key, labelKey, formatVal){
    if (!items.length) return '<div class="empty">No data for this range.</div>';
    var max = Math.max.apply(null, items.map(function(i){ return i[key]; }));
    return items.map(function(i){
      var pct = max > 0 ? (i[key]/max*100) : 0;
      return '<div class="bar-row">' +
        '<div class="name" title="' + esc(i[labelKey]) + '">' + esc(i[labelKey]) + '</div>' +
        '<div class="track"><div class="fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="val">' + esc(formatVal(i[key])) + '</div>' +
        '</div>';
    }).join('');
  }

  function lineChart(trend){
    if (!trend.length) return '<div class="empty">No data for this range.</div>';
    var W = 640, H = 200, padL = 36, padR = 8, padT = 10, padB = 24;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var maxV = Math.max.apply(null, trend.map(function(p){ return p.activeUsers; }), 1);
    var niceMax = maxV <= 0 ? 1 : Math.ceil(maxV * 1.15);
    var pts = trend.map(function(p, i){
      var x = padL + (trend.length === 1 ? innerW/2 : (i/(trend.length-1))*innerW);
      var y = padT + innerH - (p.activeUsers/niceMax)*innerH;
      return {x:x, y:y, p:p};
    });
    var pathD = pts.map(function(pt,i){ return (i===0?'M':'L') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1); }).join(' ');
    var areaD = pathD + ' L' + pts[pts.length-1].x.toFixed(1) + ',' + (padT+innerH) +
      ' L' + pts[0].x.toFixed(1) + ',' + (padT+innerH) + ' Z';
    var gridLines = [0,0.5,1].map(function(f){
      var y = padT + innerH*(1-f);
      var val = Math.round(niceMax*f);
      return '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W-padR) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--gridline)" stroke-width="1"/>' +
        '<text x="4" y="' + (y+4).toFixed(1) + '" font-size="10" fill="var(--muted)">' + fmtNum(val) + '</text>';
    }).join('');
    var last = pts[pts.length-1];
    var dots = pts.map(function(pt, i){
      return '<circle class="hitdot" data-i="' + i + '" cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) +
        '" r="10" fill="transparent"/>';
    }).join('');
    var endMarker = '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) +
      '" r="4" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/>';
    var xLabels = [0, Math.floor((pts.length-1)/2), pts.length-1].filter(function(v,i,a){return a.indexOf(v)===i;})
      .map(function(i){
        return '<text x="' + pts[i].x.toFixed(1) + '" y="' + (H-4) + '" font-size="10" fill="var(--muted)" text-anchor="middle">' +
          esc(fmtDate(pts[i].p.date)) + '</text>';
      }).join('');
    return '<div class="chart-wrap">' +
      '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" id="trendSvg">' +
      gridLines +
      '<path d="' + areaD + '" fill="var(--series-1-wash)" stroke="none"/>' +
      '<path d="' + pathD + '" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      endMarker + xLabels + dots +
      '</svg>' +
      '<div class="tooltip" id="trendTip"></div>' +
      '</div>';
  }

  function wireTooltip(trend){
    var svg = document.getElementById('trendSvg');
    var tip = document.getElementById('trendTip');
    if (!svg || !tip) return;
    var dots = svg.querySelectorAll('.hitdot');
    dots.forEach(function(dot){
      dot.addEventListener('mouseenter', function(){
        var i = Number(dot.getAttribute('data-i'));
        var p = trend[i];
        var rect = dot.getBoundingClientRect();
        var wrapRect = dot.closest('.chart-wrap').getBoundingClientRect();
        tip.textContent = fmtDate(p.date) + ': ' + fmtNum(p.activeUsers) + ' users';
        tip.style.left = (rect.left - wrapRect.left + 10) + 'px';
        tip.style.top = (rect.top - wrapRect.top - 28) + 'px';
        tip.style.opacity = '1';
      });
      dot.addEventListener('mouseleave', function(){ tip.style.opacity = '0'; });
    });
  }

  function render(data){
    if (data.realtimeUsers != null) {
      realtimeEl.textContent = data.realtimeUsers + ' active right now';
    } else {
      realtimeEl.textContent = '';
    }

    var t = data.totals;
    var html = '';
    html += '<div class="stats">' +
      stat('Active users', fmtNum(t.activeUsers)) +
      stat('New users', fmtNum(t.newUsers)) +
      stat('Sessions', fmtNum(t.sessions)) +
      stat('Engagement rate', (t.engagementRate*100).toFixed(1) + '%') +
      stat('Avg. engagement time', fmtDuration(t.avgSessionDuration)) +
      stat('Events', fmtNum(t.eventCount)) +
      '</div>';

    html += '<div class="card"><h2>Active users over time</h2>' + lineChart(data.trend) + '</div>';

    html += '<div class="grid-2">' +
      '<div class="card"><h2>Top pages</h2>' + barRows(data.topPages, 'views', 'path', fmtNum) + '</div>' +
      '<div class="card"><h2>Traffic channels</h2>' + barRows(data.channels, 'sessions', 'channel', fmtNum) + '</div>' +
      '</div>';

    html += '<div class="grid-2">' +
      '<div class="card"><h2>Devices</h2>' + barRows(data.devices, 'users', 'device', fmtNum) + '</div>' +
      '<div class="card"><h2>Top countries</h2>' + barRows(data.countries, 'users', 'country', fmtNum) + '</div>' +
      '</div>';

    renderState(html);
    wireTooltip(data.trend);
  }

  function stat(label, value){
    return '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + '</div></div>';
  }

  function load(days){
    currentDays = days;
    Array.prototype.forEach.call(rangeEl.querySelectorAll('button'), function(b){
      b.classList.toggle('active', Number(b.getAttribute('data-days')) === days);
    });
    renderState('<div class="loading">Loading analytics…</div>');
    fetch('/admin/data?days=' + days)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!data.configured) { renderSetup(data.message); return; }
        if (data.error) { renderError(data.error); return; }
        render(data);
      })
      .catch(function(err){ renderError(err.message); });
  }

  rangeEl.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-days]');
    if (!btn) return;
    load(Number(btn.getAttribute('data-days')));
  });

  load(currentDays);
})();
</script>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const session = verifySession(req);
  if (!session) {
    res.setHeader('Location', '/admin/login');
    res.status(302).send('');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(renderDashboard({ username: session.u }));
};
