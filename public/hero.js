/* Thanh điều hướng ngang dùng chung cho mọi trang (Home nằm trong hero, các trang khác nằm ở đầu trang) */
const NAV_ITEMS = [['home', 'Home'], ['analysis', 'Analysis'], ['run', 'Results'], ['skills', 'Stages & SKILLs'], ['memory', 'Memory'], ['history', 'History']];
function navHTML(active) {
  return `<header class="lp-nav"><a class="lp-logo" href="#home" aria-label="Human Resources"><img class="lp-wide" src="/assets/logo/hr-wide.png" alt="HR · Human Resources"><img class="lp-mark" src="/assets/logo/hr-mark.png" alt=""></a>
    <nav>${NAV_ITEMS.map(([v, t]) => `<a href="#${v}" data-v="${v}" class="${v === active ? 'on' : ''}">${esc(t)}</a>`).join('')}</nav>
    <a class="lp-quote" href="#analysis">+ New Analysis</a></header>`;
}
const LP_IC = {
  ctx: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  met: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  etl: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  dash: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M12 14h5"/>',
  kpi: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3"/>',
  ev: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  pbip: '<path d="M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5"/>',
};
const lpIc = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LP_IC[k]}</svg>`;
function homeHero() {
  let n = ''; try { n = localStorage.getItem('bie-user') || ''; } catch {}
  const first = n ? n.split(' ')[0] : '';
  const imgs = ['hr-1', 'hr-4', 'hr-2', 'hr-3'], pos = ['72% 50%', '55% 50%', '50% 45%', '50% 50%'];
  const info = [['ctx', 'Business Context', 'Mục tiêu HR và người xem dashboard'], ['met', 'Key Metrics', 'Chọn KPI từ catalog theo dữ liệu'], ['etl', 'Data (ETL)', 'Làm sạch và mô hình hóa dữ liệu'], ['dash', 'Dashboard', 'Dựng dự án Power BI (PBIP)']];
  return `<section class="lp">
    ${navHTML('home')}
    <div class="lp-stage">
      <div class="lp-art" id="lp-art">${imgs.map((s, k) => `<img src="/assets/hero/${s}.jpg" alt="" style="object-position:${pos[k]}" class="${k ? '' : 'on'}">`).join('')}</div>
      <div class="lp-card">
        <div class="lp-eye"><span>${first ? 'Welcome back, ' + esc(first) : 'HR Analytics'}</span><i></i><b id="lp-count">01 — 0${imgs.length}</b></div>
        <h2>From HR data to <em>decision-ready dashboards</em></h2>
        <p>Upload your HR data. BIE guides you from business context and KPI selection to data processing and a ready-to-use Power BI project.</p>
        <div class="lp-cta"><a class="lp-btn pri" href="#analysis">Bắt đầu phân tích</a><a class="lp-btn" href="#skills">Xem các chặng <span aria-hidden="true">→</span></a></div>
        <div class="lp-feat"><span>${lpIc('kpi')}4–6 KPI mỗi trang</span><span>${lpIc('ev')}Evaluator tự chấm</span><span>${lpIc('pbip')}Xuất PBIP</span></div>
      </div>
      <ul class="lp-tags" aria-label="Chủ đề HR"><li>Headcount</li><li>Turnover</li><li>Recruitment</li><li>Engagement</li></ul>
      <div class="lp-dots">${imgs.map((s, k) => `<button type="button" aria-label="Ảnh ${k + 1}" class="${k ? '' : 'on'}"></button>`).join('')}</div>
    </div>
    <div class="lp-info">
      <a class="lp-thumb" href="#analysis" aria-label="Bắt đầu phân tích"><img src="/assets/hero/hr-4.jpg" alt=""></a>
      ${info.map(([ic, t, d], k) => `<div class="lp-i"><span class="lp-i-ic">${lpIc(ic)}</span><h3>${t}</h3><p>${d}</p><a href="#skills">${k === 3 ? 'Learn more' : 'View more'} →</a></div>`).join('')}
      <a class="lp-i lp-hi" href="#analysis"><h3>Từ file dữ liệu đến dashboard</h3><p>Bắt đầu một Analysis mới ngay hôm nay.</p><span aria-hidden="true">→</span></a>
    </div></section>`;
}
window.__lpSlider = function () {
  const art = document.getElementById('lp-art'); if (!art || art.__s) return; art.__s = 1;
  const stage = art.parentElement, im = [...art.querySelectorAll('img')], dt = [...stage.querySelectorAll('.lp-dots button')], cnt = document.getElementById('lp-count'); let k = 0, tm;
  const show = (j) => { k = j; im.forEach((x, q) => x.classList.toggle('on', q === j)); dt.forEach((x, q) => x.classList.toggle('on', q === j)); if (cnt) cnt.textContent = `0${j + 1} — 0${im.length}`; };
  const reset = () => { clearInterval(tm); tm = setInterval(() => { if (!art.isConnected) return clearInterval(tm); if (!document.hidden) show((k + 1) % im.length); }, 5000); };
  dt.forEach((b, q) => (b.onclick = () => { show(q); reset(); }));
  reset();
};

/* Hiệu ứng thanh nav: viên vàng trượt mượt sang mục mới (FLIP) + viên mờ đi theo con trỏ khi rê chuột */
function initNavs() {
  document.querySelectorAll('.lp-nav nav').forEach((nav) => {
    const links = [...nav.querySelectorAll('a')], cur = nav.querySelector('a.on');
    const pill = document.createElement('span'); pill.className = 'nav-pill';
    const ghost = document.createElement('span'); ghost.className = 'nav-ghost';
    nav.prepend(ghost, pill);
    const put = (el, a) => { el.style.width = a.offsetWidth + 'px'; el.style.height = a.offsetHeight + 'px'; el.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`; };
    if (cur) {
      const prev = window.__navPrev, nr = nav.getBoundingClientRect();
      if (prev && prev.width) {
        pill.style.transition = 'none'; pill.style.width = prev.width + 'px'; pill.style.height = cur.offsetHeight + 'px';
        pill.style.transform = `translate(${prev.left - nr.left}px,${cur.offsetTop}px)`; void pill.offsetWidth; pill.style.transition = '';
      }
      requestAnimationFrame(() => put(pill, cur));
    } else pill.style.opacity = 0;
    links.forEach((a) => { a.onmouseenter = () => { put(ghost, a); ghost.style.opacity = 1; }; });
    nav.onmouseleave = () => { ghost.style.opacity = 0; };
  });
  window.__navPrev = null;
}
