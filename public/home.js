/* Trang chủ: Workflow các chặng (node graph + hiệu ứng truyền dữ liệu) */
const NS_ICON = { pending: '○', running: '', done: '✓', error: '!' };
const ST_TEXT = { pending: 'Đang chờ', running: 'Đang xử lý…', done: 'Hoàn thành', error: 'Lỗi' };

function closeModal() { document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); document.onkeydown = null; }

function showError(r, i) {
  closeModal();
  const s = r.stages[i], d = s.errorDetail || {};
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const block = (title, txt) => (txt ? `<div class="m-sec"><b>${title}</b><pre>${esc(txt)}</pre></div>` : '');
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <div class="modal-h"><div><span class="pill err">Lỗi chặng ${i + 1}</span><h3>${esc(s.name)} thất bại</h3></div><button class="icon-btn" data-x aria-label="Đóng">✕</button></div>
    <div class="modal-b">
      <div class="err-box" style="font-size:13px">${esc(s.error || 'Không rõ nguyên nhân')}</div>
      <div class="meta kv"><span>Model <b>${esc(s.model)}</b></span><span>Thời điểm <b>${d.at ? new Date(d.at).toLocaleString('vi-VN') : '—'}</b></span><span>Exit code <b>${d.exitCode ?? '—'}</b></span><span>Prompt ước tính <b>~${fmt(s.promptTokensEst)}</b> token</span><span>Thời gian <b>${dur((s.endedAt || 0) - (s.startedAt || 0))}</b></span></div>
      ${block('Lệnh gọi', d.command)}${block('stderr', d.stderr)}${block('stdout', d.stdout)}${block('Stack', d.stack)}
      <div class="m-sec"><b>File chi tiết</b><div class="files"><a href="/api/runs/${r.id}/stages/${s.id}/error.json" target="_blank">error.json</a><a href="/api/runs/${r.id}/stages/${s.id}/prompt.md" target="_blank">prompt.md</a></div></div>
    </div>
    <div class="modal-f"><select data-model style="width:auto">${modelOptions(s.model)}</select>
      <button class="btn ghost sm" data-copy>Sao chép lỗi</button><button class="btn acc sm" data-retry>↻ Chạy lại từ chặng này</button></div></div>`;
  document.body.appendChild(bg);
  const close = () => closeModal();
  bg.onclick = (e) => { if (e.target === bg) close(); };
  bg.querySelector('[data-x]').onclick = close;
  document.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  bg.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText([s.error, d.stderr, d.stdout].filter(Boolean).join('\n\n')); toast('Đã sao chép'); };
  bg.querySelector('[data-retry]').onclick = async () => {
    try { await jsend(`/api/runs/${r.id}/stages/${i}/rerun`, 'POST', { model: bg.querySelector('[data-model]').value, only: false }); close(); location.hash = '#home/' + r.id; vHome(r.id); }
    catch (e) { toast(e.message); }
  };
  bg.querySelector('.modal').focus?.();
}

const fmtDT = (t) => { const d = new Date(t); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/* Các file đầu ra tiêu biểu của một chặng (lấy từ s.files thật): result.md + 1 file/thư mục chính */
const W3_KEY = ['pbip/', 'measures.json', 'model-spec.json', 'business-goal.md', 'clean/', 'dashboard-spec.json'];
const W3_NOISE = /(^|\/)(prompt\.md|post\.log|pre\.log|error\.json|metrics\.json|result\.md)$/;
function w3Outs(files) {
  const list = files || [], outs = [];
  if (list.includes('result.md')) outs.push({ label: 'result.md' });
  const top = new Map();
  for (const f of list) { if (W3_NOISE.test(f)) continue; const i = f.indexOf('/'), k = i < 0 ? f : f.slice(0, i + 1); top.set(k, (top.get(k) || 0) + 1); }
  const pick = W3_KEY.find((k) => top.has(k)) || [...top.keys()][0];
  if (pick) outs.push({ label: pick, n: pick.endsWith('/') ? top.get(pick) : 0 });
  return outs;
}
const W4_ICON = ['ctx', 'met', 'etl', 'dash'];
const W4_DESC = ['Ngữ cảnh doanh nghiệp, mục tiêu và người xem dashboard.', 'Chọn KPI, measure và dimension từ catalog theo dữ liệu.', 'Làm sạch, biến đổi và mô hình hóa dữ liệu.', 'Dựng dự án Power BI (PBIP) từ template đã chọn.'];

async function vHome(id) {
  stopPoll();
  $('#title').textContent = 'Trang chủ · Workflow';
  const runs = await jget('/api/runs');
  if (!id && runs.length) id = runs[0].id;
  const stages = META.stages, S = stages.length;
  const card = (sg, k) => `
        <div class="w4-card pending" data-i="${k}" tabindex="0" role="button">
          <span class="w4-tile">${typeof lpIc === 'function' ? lpIc(W4_ICON[k - 1] || 'dash') : ''}</span>
          <div class="w4-body">
            <div class="w4-top"><span class="w4-no">${String(k).padStart(2, '0')}</span><span class="w4-stt"></span><span class="w4-ico"></span></div>
            <h3>${esc(sg.name)}</h3>
            <p class="w4-desc">${esc(W4_DESC[k - 1] || '')}</p>
            <div class="w4-meta"></div><div class="w4-files"></div><div class="w4-x"></div><button class="w2-err" hidden>Xem lỗi chi tiết</button>
          </div>
        </div>${k < S ? `<div class="w4-link idle" data-h="${k}"><i></i><span class="w4-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><em>Chờ</em></span><i></i></div>` : ''}`;
  view.innerHTML = homeHero() + `
  <div class="card homebar">
    <div class="hb-strip">
      <div class="hb-cur"><span class="hb-lbl">Lần chạy hiện tại</span><b id="hb-title">Chưa có lần chạy nào</b><span id="hb-sub">Tải file dữ liệu để bắt đầu.</span></div>
      <div class="hb-ctl">
        <span id="hb-pill"></span>
        ${runs.length ? `<label class="hb-sel"><span>Chuyển lần chạy</span><select id="runsel" aria-label="Chuyển lần chạy">${runs.map((x) => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${fmtDT(x.createdAt)} · ${esc(x.file || 'chưa có file')}${{ done: ' · ✓', error: ' · ✗', running: ' · …' }[x.status] || ''}</option>`).join('')}</select></label>` : ''}
        <a class="btn acc sm" href="#analysis" style="text-decoration:none">＋ Analysis mới</a></div>
    </div>
  </div>
  <div class="card w2">
    <div class="w2-head">
      <div><small>RUN WORKFLOW</small><h2>Automated BI Pipeline</h2><p>Từ file dữ liệu đến dự án Power BI. <em>Mỗi chặng được theo dõi theo thời gian thực.</em></p></div>
      <span class="w2-goal"><i></i>GOAL: DATA → DASHBOARD</span>
    </div>
    <div class="w4" id="flow">
      <svg id="edges" class="w2-svg" aria-hidden="true"></svg><button type="button" class="vchip" id="vchip" hidden></button>
      <div class="w4-side w4-sl pending" id="w4in"><i></i><div><b>Input</b><span></span></div></div>
      <div class="w4-stack" id="w4stack">${stages.map((sg, k) => card(sg, k + 1)).join('')}</div>
      <div class="w4-side w4-sr pending" id="w4out" tabindex="0" role="button"><i></i><div><b>Output</b><span></span></div></div>
    </div>
    <div class="w4-legend">
      <div><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6h32" stroke="#C8A96A" stroke-width="2" stroke-linecap="round"/><path d="M29 2l6 4-6 4" fill="none" stroke="#C8A96A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><div><b>Sequence Flow</b><span>Các chặng chạy tuần tự, bàn giao file cho chặng sau.</span></div></div>
      <div><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6h32" stroke="#E6F0E9" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5" opacity=".7"/></svg><div><b>Input &amp; Output</b><span>Đường vào ra: dữ liệu và yêu cầu vào chặng, file kết quả đi ra.</span></div></div>
      <div><svg viewBox="0 0 40 12" aria-hidden="true"><circle cx="20" cy="6" r="4.5" fill="#C8A96A"/></svg><div><b>Timing</b><span>Thời gian và token của từng chặng.</span></div></div>
    </div>
    <div class="w3-statsbar" id="hstats"></div>
    <div class="legend w2-legend"><span><i class="lg pending"></i>Chờ</span><span><i class="lg running"></i>Đang chạy</span><span><i class="lg done"></i>Hoàn thành</span><span><i class="lg error"></i>Lỗi (bấm để xem)</span></div>
    <div class="w2-chart">
      <div class="w2-chart-h"><b>TOKEN THEO TỪNG CHẶNG</b><div class="w2-key"><span><i style="background:#5FA8A0"></i>Input (gồm cache)</span><span><i style="background:#C8A96A"></i>Output</span></div></div>
      <div class="w2-cols" id="w2chart"></div>
    </div>
  </div>
  <div class="card"><h2>Tổng quan các chặng</h2><p class="sub">Cập nhật theo thời gian thực.</p><div style="overflow:auto"><table class="tbl" id="htbl"></table></div></div>`;

  const flow = $('#flow'), svg = $('#edges'), inEl = $('#w4in'), outEl = $('#w4out');
  const cardEls = [...view.querySelectorAll('.w4-card')], linkEls = [...view.querySelectorAll('.w4-link')];
  let run = null, prev = {}, lastStates = [], lastSig = '';
  const states = (r) => [r ? 'done' : 'pending', ...stages.map((_, k) => r?.stages?.[k]?.status || 'pending')];   // [0] = input, [1..S] = các chặng
  const edgeClass = (a, b) => (b === 'running' && a === 'done' ? 'flow' : b === 'error' || a === 'error' ? 'err' : a === 'done' && b === 'done' ? 'done' : a === 'done' ? 'ready' : 'idle');
  const sClass = (s) => ({ running: 'flow', done: 'done', error: 'err' }[s] || 'idle');
  const drawEdges = () => {
    const fr = flow.getBoundingClientRect(); if (!fr.width || !fr.height || getComputedStyle(svg).display === 'none') return;
    svg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
    const P = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - fr.left, r: r.right - fr.left, t: r.top - fr.top, b: r.bottom - fr.top, cy: r.top - fr.top + r.height / 2 }; };
    const c = cardEls.map(P), side = 170, xl = Math.max(26, c[0].l - side), xr = Math.min(fr.width - 26, c[0].r + side), y0 = c[0].cy, y1 = c[S - 1].cy;
    let h = `<path class="w4rail" d="M${xl},${y0} V${y1}"/><path class="w4rail" d="M${xr},${y0} V${y1}"/>`;
    // mũi tên chiều chảy dọc hai đường rail
    for (let i = 0; i < S - 1; i++) { const m = (c[i].b + c[i + 1].t) / 2; [xl, xr].forEach((x) => (h += `<path class="w4arr" d="M${x - 5},${m - 4} L${x},${m + 3} L${x + 5},${m - 4}"/>`)); }
    // nhánh vào (trái) và ra (phải) của từng chặng
    c.forEach((k, i) => {
      h += `<g class="w4b idle" data-s="${i + 1}"><path class="w4s" d="M${xl},${k.cy} H${k.l - 6}"/><path class="w4a" d="M${k.l - 14},${k.cy - 5} L${k.l - 6},${k.cy} L${k.l - 14},${k.cy + 5}"/><path class="w4s" d="M${k.r + 6},${k.cy} H${xr}"/><path class="w4a" d="M${xr - 10},${k.cy - 5} L${xr - 2},${k.cy} L${xr - 10},${k.cy + 5}"/><circle class="w4d" cx="${xl}" cy="${k.cy}" r="3.2"/><circle class="w4d" cx="${xr}" cy="${k.cy}" r="3.2"/></g>`;
    });
    // hai chip ở đầu/cuối rail: Input (trái, cạnh chặng 1) và Output (phải, cạnh chặng cuối)
    inEl.style.left = xl + 'px'; inEl.style.top = y0 + 'px'; outEl.style.left = xr + 'px'; outEl.style.top = y1 + 'px';
    // vòng kiểm tra Version: Data (ETL) → quay lại Key Metrics (chỉ khi người dùng chọn so sánh Version)
    const vs = run?.form?.versions || [], vc = run?.versionCheck || null, chip = $('#vchip');
    if (vs.length && c[1] && c[2]) {
      const a = c[2], b = c[1], bulge = 44, ya = a.cy - 26, yb = b.cy + 26, d = `M${a.r + 6},${ya} C${a.r + 6 + bulge},${ya} ${b.r + 6 + bulge},${yb} ${b.r + 6},${yb}`;
      const st = vc?.status === 'needs_data' ? 'wait' : ['ok', 'applied'].includes(vc?.status) ? 'done' : ['skipped', 'partial'].includes(vc?.status) ? 'skip' : (lastStates[3] === 'done' ? 'ready' : 'idle');
      h += `<g class="vloop ${st}"><path class="base" d="${d}"/><path class="glow" d="${d}"/>${[0, 0.5].map((o) => `<circle class="dot" r="4.5"><animateMotion dur="1.8s" begin="${o * 1.8}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')}<path class="arrow" d="M${b.r + 16},${yb - 6} L${b.r + 6},${yb} L${b.r + 16},${yb + 6}"/></g>`;
      chip.hidden = false; chip.className = 'vchip ' + st; chip.style.left = b.r + bulge + 14 + 'px'; chip.style.top = (ya + yb) / 2 + 'px';
      chip.innerHTML = { wait: '⚠ Version check · cần dữ liệu', done: '✓ Version check', skip: '⚠ Version check · bỏ qua', ready: '⟲ Version check', idle: '⟲ Version check' }[st];
      chip.title = 'Kiểm tra dữ liệu Version (' + vs.join(', ') + ') sau Data (ETL), quay lại Key Metrics';
    } else if (chip) chip.hidden = true;
    svg.innerHTML = h; applyEdges();
  };
  const applyEdges = () => {
    const st = lastStates; if (!st.length) return;
    svg.querySelectorAll('.w4b').forEach((g) => g.setAttribute('class', 'w4b ' + sClass(st[+g.dataset.s])));
  };
  const setH = (el, html) => { if (el.__h !== html) { el.__h = html; el.innerHTML = html; return true; } return false; };
  flow.addEventListener('click', (e) => { const f = e.target.closest('.w4-file'); if (f && !f.classList.contains('ghost') && run) { e.stopPropagation(); location.hash = '#run/' + run.id; } });
  outEl.onclick = () => { if (run && run.status === 'done') location.hash = '#run/' + run.id; };
  outEl.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); outEl.onclick(); } };
  const update = (r) => {
    run = r; lastStates = states(r); const now = Date.now();
    inEl.className = 'w4-side w4-sl ' + (r ? 'done' : 'pending'); $('span', inEl).textContent = r ? r.file : 'Chưa chọn file';
    const outDone = r && r.status === 'done'; outEl.className = 'w4-side w4-sr ' + (outDone ? 'done' : 'pending'); $('span', outEl).textContent = r ? (outDone ? `output/${r.id.slice(0, 14)}…` : 'Đang chờ kết quả') : 'output/';
    cardEls.forEach((el, k) => {
      const i = k + 1, s = lastStates[i], st = r?.stages?.[k];
      el.className = `w4-card ${s}` + (prev[i] && prev[i] !== 'done' && s === 'done' ? ' pop' : '') + (prev[i] && prev[i] !== 'error' && s === 'error' ? ' shake' : '');
      const sec = st?.startedAt && s === 'running' ? ` · ${Math.floor((now - st.startedAt) / 1000)}s` : '';
      let stText = ST_TEXT[s] + sec, x = '';
      const u = st?.usage, tot = u ? u.input + u.output + u.cacheRead + u.cacheCreate : 0;
      $('.w4-meta', el).textContent = [st?.model || '', u && (s === 'done' || s === 'running') ? fmt(tot) + ' token' : '', s === 'done' && st.ms ? dur(st.ms) : ''].filter(Boolean).join(' · ');
      if (s === 'error') x = esc((st.error || '').slice(0, 80));
      const bad = window.SK && window.SK[k] && !window.SK[k].ok; el.classList.toggle('noskill', !!bad);
      if (bad && s !== 'running') { stText = '⚠ Thiếu SKILL'; x = esc(window.SK[k].reason); }
      $('.w4-ico', el).innerHTML = s === 'running' ? '<span class="spin"></span>' : NS_ICON[s];
      $('.w4-stt', el).textContent = stText; $('.w4-x', el).innerHTML = x;
      const eb = $('.w2-err', el); eb.hidden = s !== 'error'; eb.onclick = (e) => { e.stopPropagation(); showError(r, k); };
      el.onclick = () => { if (!r) return; if (s === 'error') showError(r, k); else if (s === 'done') location.hash = '#run/' + r.id; };
      el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.onclick(); } };
      if (el.className.includes(' pop') || el.className.includes(' shake')) setTimeout(() => el.classList.remove('pop', 'shake'), 1400);
      prev[i] = s;
      const real = st?.files?.length ? w3Outs(st.files) : [], outs = real.length ? real : [{ label: 'result.md', ghost: true }];
      setH($('.w4-files', el), outs.map((o) => `<span class="w4-file ${o.ghost || s === 'pending' ? 'ghost' : ''}" title="${esc(o.label)}">${esc(o.label)}${o.n ? ' · ' + o.n + ' file' : ''}</span>`).join(''));
    });
    linkEls.forEach((el) => {   // chip giữa hai chặng: thời gian chặng trước / trạng thái bàn giao
      const i = +el.dataset.h, cls = edgeClass(lastStates[i], lastStates[i + 1]), ms = r?.stages?.[i - 1]?.ms;
      el.className = 'w4-link ' + cls;
      $('em', el).textContent = { flow: 'Đang bàn giao…', done: ms ? dur(ms) : 'Đã bàn giao', ready: ms ? dur(ms) + ' · sẵn sàng' : 'Sẵn sàng', err: 'Lỗi', idle: 'Chờ' }[cls];
    });
    { const sig = cardEls.map((e) => e.offsetHeight).join(',') + '|' + flow.offsetWidth + 'x' + flow.offsetHeight; if (sig !== lastSig) { lastSig = sig; requestAnimationFrame(drawEdges); } else applyEdges(); }   // chỉ vẽ lại đường nối khi bố cục đổi (giữ hiệu ứng chạy liên tục)
    if (r && r.status === 'waiting' && r.versionCheck?.status === 'needs_data' && window.openVersionModal) window.openVersionModal(r, { auto: true, refresh: () => window.__homeRefresh && window.__homeRefresh() });
    const chip = $('#vchip'); if (chip) chip.onclick = () => window.openVersionModal && window.openVersionModal(run, { refresh: () => window.__homeRefresh && window.__homeRefresh() });
    const t = r?.totals; setMeter(t);
    const req = String(r?.form?.requirement || '').replace(/^\[file\]\s*/, '').trim();
    $('#hb-title').textContent = r ? (req || r.file || 'Lần chạy không tên') : 'Chưa có lần chạy nào';
    $('#hb-sub').textContent = r ? [r.file, fmtDT(r.startedAt || r.createdAt), `${(r.stages || []).filter((x) => x.status === 'done').length}/${(r.stages || []).length || 4} chặng xong`].filter(Boolean).join(' · ') : 'Tải file dữ liệu để bắt đầu.';
    $('#hb-pill').innerHTML = r ? statusPill(r.running ? 'running' : r.status) : '';
    const pct = t?.contextWindow ? Math.min(100, (t.maxContext / t.contextWindow) * 100) : 0;
    const doneN = r ? r.stages.filter((s) => s.status === 'done').length : 0, evs = r ? r.stages.filter((s) => s.evaluation) : [];
    setH($('#hstats'), `
      <div class="w2-st"><b>${fmt(t?.total)}</b><span>Tổng token</span><em>in ${fmt(t?.input)} · out ${fmt(t?.output)} · cache ${fmt((t?.cacheRead || 0) + (t?.cacheCreate || 0))}</em></div>
      <div class="w2-st"><b>${pct.toFixed(1)}%</b><span>Context window</span><div class="ctxbar"><i style="width:${pct}%"></i></div><em>${fmt(t?.maxContext)} / ${fmt(t?.contextWindow)}</em></div>
      <div class="w2-st"><b>${doneN}/${S}</b><span>Chặng hoàn thành</span><em>${r?.stages?.some((s) => s.status === 'error') ? '<span style="color:var(--err)">Có chặng lỗi</span>' : 'Không lỗi'}${evs.length ? ` · Evaluator đạt ${evs.filter((s) => s.evaluation.verdict === 'PASS').length}/${evs.length}` : ''}</em></div>
      <div class="w2-st"><b>$${(t?.cost || 0).toFixed(3)}</b><span>Chi phí</span><em>ước tính</em></div>
      <div class="w2-st"><b>${dur(t?.ms)}</b><span>Thời gian</span><em>model</em></div>`);
    // biểu đồ token theo chặng (dữ liệu thật từ usage của từng chặng)
    const rows = stages.map((sg, i) => { const u = r?.stages?.[i]?.usage; return { name: sg.name, inp: u ? u.input + u.cacheRead + u.cacheCreate : 0, out: u ? u.output : 0 }; });
    const mx = Math.max(1, ...rows.map((x) => x.inp + x.out));
    setH($('#w2chart'), rows.map((x) => `<div class="w2-col"><div class="w2-stack" title="input ${fmt(x.inp)} · output ${fmt(x.out)}"><i class="in" style="height:${(x.inp / mx) * 100}%"></i><i class="out" style="height:${(x.out / mx) * 100}%"></i></div><b>${x.inp + x.out ? fmt(x.inp + x.out) : '—'}</b><span>${esc(x.name)}</span></div>`).join(''));
    setH($('#htbl'), `<tr><th>Chặng</th><th>Model</th><th>Trạng thái</th><th>Input</th><th>Output</th><th>Context</th><th>Thời gian</th></tr>` +
      stages.map((sg, i) => { const s = r?.stages?.[i]; const u = s?.usage; const ctx = u ? u.input + u.output + u.cacheRead + u.cacheCreate : 0;
        return `<tr class="${s?.status === 'error' ? 'click' : ''}" data-err="${i}"><td><b>${i + 1}. ${esc(sg.name)}</b></td><td>${esc(s?.model || '—')}</td><td>${statusPill(s?.status || 'pending')}</td><td>${u ? fmt(u.input + u.cacheRead + u.cacheCreate) : '—'}</td><td>${u ? fmt(u.output) : '—'}</td><td>${u ? ((ctx / s.contextWindow) * 100).toFixed(1) + '%' : '—'}</td><td>${s?.ms ? dur(s.ms) : '—'}</td></tr>`; }).join(''));
    view.querySelectorAll('#htbl tr[data-err].click').forEach((tr) => (tr.onclick = () => showError(r, +tr.dataset.err)));
  };
  window.__lpSlider && window.__lpSlider();
  const rs = $('#runsel'); if (rs) rs.onchange = () => (location.hash = '#home/' + rs.value);
  window.onresize = drawEdges;
  const fetchRun = async () => { const r = await jget('/api/runs/' + id); update(r); return r; };
  update(null); drawEdges();
  if (!id) return;
  let r = await fetchRun(); requestAnimationFrame(drawEdges);
  const startPoll = () => { stopPoll(); poll = setInterval(async () => { try { const x = await fetchRun(); if (!x.running) stopPoll(); } catch { stopPoll(); } }, 1000); };
  window.__homeRefresh = async () => { const x = await fetchRun(); if (x.running) startPoll(); requestAnimationFrame(drawEdges); return x; };
  if (r.running) startPoll();
}
