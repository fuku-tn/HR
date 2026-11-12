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

async function vHome(id) {
  stopPoll();
  $('#title').textContent = 'Trang chủ · Workflow';
  const runs = await jget('/api/runs');
  if (!id && runs.length) id = runs[0].id;
  const nodes = [{ k: 'in', name: 'Dữ liệu đầu vào' }, ...META.stages.map((s) => ({ k: s.id, name: s.name })), { k: 'out', name: 'Output' }];
  const N = nodes.length, S = N - 2;   // S = số chặng (4)
  const stageCard = (n, i) => `
      <div class="w2-card pending" data-i="${i}" tabindex="0" role="button">
        <div class="w2-ch"><span class="w2-no">${String(i).padStart(2, '0')}</span><b>${esc(n.name)}</b><span class="w2-ico"></span></div>
        <div class="w2-big"><i class="w2-v">—</i><span class="w2-u">token</span></div>
        <div class="w2-spark" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="w2-m"></div><div class="w2-s"></div><div class="w2-x"></div><button class="w2-err" hidden>Xem lỗi chi tiết</button>
      </div>`;
  const ioNode = (n, i) => `
      <div class="w2-io w2-${n.k} pending" data-i="${i}" ${i === N - 1 ? 'tabindex="0" role="button"' : ''}>
        <b>${i === 0 ? '⇩ Input' : '⎘ Output'}</b><div class="w2-m"></div><div class="w2-s"></div><div class="w2-x"></div>
      </div>`;
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
      <div><small>RUN WORKFLOW</small><h2>Automated BI Pipeline</h2><p>Từ file dữ liệu đến dự án Power BI — từng chặng được theo dõi theo thời gian thực.</p></div>
      <span class="w2-goal"><i></i>GOAL: DATA → DASHBOARD</span>
    </div>
    <div class="w2-flow" id="flow">
      <svg id="edges" class="w2-svg" aria-hidden="true"></svg><button type="button" class="vchip" id="vchip" hidden></button>
      <div class="w2-cards" id="nodes">${nodes.slice(1, N - 1).map((n, k) => stageCard(n, k + 1)).join('')}</div>
      <div class="w2-gap"></div>
      <div class="w2-bar" id="w2bar">${ioNode(nodes[0], 0)}<div class="w2-stats" id="hstats"></div>${ioNode(nodes[N - 1], N - 1)}</div>
    </div>
    <div class="legend w2-legend"><span><i class="lg pending"></i>Chờ</span><span><i class="lg running"></i>Đang chạy</span><span><i class="lg done"></i>Hoàn thành</span><span><i class="lg error"></i>Lỗi (bấm để xem)</span></div>
    <div class="w2-chart">
      <div class="w2-chart-h"><b>TOKEN THEO TỪNG CHẶNG</b><div class="w2-key"><span><i style="background:#5FA8A0"></i>Input (gồm cache)</span><span><i style="background:#C8A96A"></i>Output</span></div></div>
      <div class="w2-cols" id="w2chart"></div>
    </div>
  </div>
  <div class="card"><h2>Tổng quan các chặng</h2><p class="sub">Cập nhật theo thời gian thực.</p><div style="overflow:auto"><table class="tbl" id="htbl"></table></div></div>`;

  const flow = $('#flow'), svg = $('#edges'), barEl = $('#w2bar');
  const nodeEls = [...view.querySelectorAll('[data-i]')].sort((a, b) => a.dataset.i - b.dataset.i);   // theo chỉ số node, không theo thứ tự DOM
  let run = null, prev = {}, lastStates = [], lastSig = '';
  const states = (r) => nodes.map((n, i) => {
    if (i === 0) return r ? 'done' : 'pending';
    if (i === N - 1) return r && r.status === 'done' ? 'done' : 'pending';
    return r?.stages?.[i - 1]?.status || 'pending';
  });
  const edgeClass = (a, b) => (b === 'running' && a === 'done' ? 'flow' : b === 'error' || a === 'error' ? 'err' : a === 'done' && b === 'done' ? 'done' : 'idle');
  const drawEdges = () => {
    const fr = flow.getBoundingClientRect(); if (!fr.width) return;
    svg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
    const P = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - fr.left, r: r.right - fr.left, t: r.top - fr.top, b: r.bottom - fr.top, cx: r.left - fr.left + r.width / 2, cy: r.top - fr.top + r.height / 2 }; };
    const bar = P(barEl), xc = bar.cx, yj = bar.t - 2;
    let h = '';
    // dải cong từ đáy mỗi thẻ chặng hội tụ về thanh tổng hợp (như bản mẫu Flow Probe)
    for (let i = 1; i <= S; i++) {
      const c = P(nodeEls[i]), y1 = c.b + 1, ym = y1 + (yj - y1) * 0.55, d = `M${c.cx},${y1} C${c.cx},${ym} ${xc},${ym} ${xc},${yj}`;
      h += `<g class="w2e idle" data-e="${i}"><path class="w2e-band" d="${d}"/><path class="w2e-core" d="${d}"/>${[0, 0.9].map((o) => `<circle class="dot" r="3.2"><animateMotion dur="1.8s" begin="${o}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')}</g>`;
    }
    // mũi tên bàn giao giữa các thẻ liên tiếp
    for (let i = 1; i < S; i++) {
      const a = P(nodeEls[i]), b = P(nodeEls[i + 1]), y = a.t + 30;
      if (b.l - a.r < 8 || Math.abs(a.t - b.t) > 4) continue;
      h += `<g class="w2h idle" data-h="${i}"><path d="M${a.r + 5},${y} L${b.l - 5},${y}"/><path d="M${b.l - 11},${y - 5} L${b.l - 5},${y} L${b.l - 11},${y + 5}"/></g>`;
    }
    // vòng kiểm tra Version: Data (ETL) → quay lại Key Metrics (chỉ khi người dùng chọn so sánh Version)
    const vs = run?.form?.versions || [], vc = run?.versionCheck || null, chip = $('#vchip');
    flow.classList.toggle('has-loop', vs.length > 0);
    if (vs.length && nodeEls[2] && nodeEls[3]) {
      const a = P(nodeEls[3]), b = P(nodeEls[2]), lift = 44, ya = a.t, yb = b.t;
      const d = `M${a.cx},${ya} C${a.cx},${ya - lift} ${b.cx},${yb - lift} ${b.cx},${yb - 3}`;
      const st = vc?.status === 'needs_data' ? 'wait' : ['ok', 'applied'].includes(vc?.status) ? 'done' : ['skipped', 'partial'].includes(vc?.status) ? 'skip' : (lastStates[3] === 'done' ? 'ready' : 'idle');
      h += `<g class="vloop ${st}"><path class="base" d="${d}"/><path class="glow" d="${d}"/>${[0, 0.5].map((o) => `<circle class="dot" r="4.5"><animateMotion dur="1.8s" begin="${o * 1.8}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')}<path class="arrow" d="M${b.cx - 6},${yb - 13} L${b.cx},${yb - 3} L${b.cx + 6},${yb - 13}"/></g>`;
      chip.hidden = false; chip.className = 'vchip ' + st; chip.style.left = (a.cx + b.cx) / 2 + 'px'; chip.style.top = Math.min(ya, yb) - lift * 0.75 - 14 + 'px';
      chip.innerHTML = { wait: '⚠ Version check — cần bổ sung dữ liệu', done: '✓ Version check — đã có dữ liệu', skip: '⚠ Version check — chạy không có dữ liệu', ready: '⟲ Version check', idle: '⟲ Version check' }[st];
      chip.title = 'Kiểm tra dữ liệu Version (' + vs.join(', ') + ') sau Data (ETL), quay lại Key Metrics';
    } else if (chip) chip.hidden = true;
    svg.innerHTML = h; applyEdges();
  };
  const applyEdges = () => {
    const st = lastStates; if (!st.length) return;
    svg.querySelectorAll('.w2e').forEach((g) => g.setAttribute('class', 'w2e ' + ({ running: 'flow', done: 'done', error: 'err' }[st[+g.dataset.e]] || 'idle')));
    svg.querySelectorAll('.w2h').forEach((g) => { const i = +g.dataset.h; g.setAttribute('class', 'w2h ' + edgeClass(st[i], st[i + 1])); });
  };
  const update = (r) => {
    run = r; lastStates = states(r); const now = Date.now();
    nodeEls.forEach((el, i) => {
      const s = lastStates[i], isStage = i > 0 && i < N - 1, st = isStage ? r?.stages?.[i - 1] : null;
      el.className = `${isStage ? 'w2-card' : 'w2-io w2-' + nodes[i].k} ${s}` + (prev[i] && prev[i] !== 'done' && s === 'done' && i > 0 ? ' pop' : '') + (prev[i] && prev[i] !== 'error' && s === 'error' ? ' shake' : '');
      let m = '', x = '', stText = ST_TEXT[s];
      if (i === 0) { m = r ? esc(r.file) : 'Chưa chọn file'; x = r ? 'Đã đọc & profile' : ''; stText = r ? 'Sẵn sàng' : 'Đang chờ'; }
      else if (i === N - 1) { m = r ? `output/${esc(r.id.slice(0, 14))}…` : 'output/'; stText = s === 'done' ? 'Đã xuất kết quả' : 'Đang chờ'; x = s === 'done' ? `${fmt(r.totals.total)} token tổng` : ''; }
      else {
        const sec = st?.startedAt && s === 'running' ? ` · ${Math.floor((now - st.startedAt) / 1000)}s` : '';
        stText = ST_TEXT[s] + sec; m = esc(st?.model || '—');
        const u = st?.usage, tot = u ? u.input + u.output + u.cacheRead + u.cacheCreate : 0;
        if (s === 'done') x = dur(st.ms);
        if (s === 'error') x = esc((st.error || '').slice(0, 60));
        $('.w2-v', el).textContent = u && (s === 'done' || s === 'running') ? fmt(tot) : '—';
        const bars = u ? [u.input, u.output, u.cacheRead, u.cacheCreate] : [0, 0, 0, 0], mx = Math.max(1, ...bars), sp = $('.w2-spark', el);
        sp.classList.toggle('has', !!u && tot > 0);
        [...sp.children].forEach((b, k) => { b.style.height = (u ? Math.max(8, (bars[k] / mx) * 100) : 8) + '%'; b.title = ['input', 'output', 'cache read', 'cache create'][k] + ': ' + fmt(bars[k]); });
        const eb = $('.w2-err', el); eb.hidden = s !== 'error'; eb.onclick = (e) => { e.stopPropagation(); showError(r, i - 1); };
        const bad = window.SK && window.SK[i - 1] && !window.SK[i - 1].ok; el.classList.toggle('noskill', !!bad);
        if (bad && s !== 'running') { stText = '⚠ Thiếu SKILL'; x = esc(window.SK[i - 1].reason); }
      }
      if (isStage) $('.w2-ico', el).innerHTML = s === 'running' ? '<span class="spin"></span>' : NS_ICON[s];
      $('.w2-m', el).innerHTML = m; $('.w2-s', el).textContent = stText; $('.w2-x', el).innerHTML = x;
      el.onclick = () => { if (!r) return; if (s === 'error') showError(r, i - 1); else if (s === 'done' || i === N - 1) location.hash = '#run/' + r.id; };
      el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.onclick(); } };
      if (el.className.includes(' pop') || el.className.includes(' shake')) setTimeout(() => el.classList.remove('pop', 'shake'), 1400);
      prev[i] = s;
    });
    { const sig = nodeEls.map((e) => e.offsetHeight).join(',') + '|' + flow.offsetWidth; if (sig !== lastSig) { lastSig = sig; requestAnimationFrame(drawEdges); } else applyEdges(); }   // chỉ vẽ lại đường nối khi bố cục đổi (giữ hiệu ứng chạy liên tục)
    if (r && r.status === 'waiting' && r.versionCheck?.status === 'needs_data' && window.openVersionModal) window.openVersionModal(r, { auto: true, refresh: () => window.__homeRefresh && window.__homeRefresh() });
    const chip = $('#vchip'); if (chip) chip.onclick = () => window.openVersionModal && window.openVersionModal(run, { refresh: () => window.__homeRefresh && window.__homeRefresh() });
    const t = r?.totals; setMeter(t);
    $('#hb-title').textContent = r ? (String(r.form?.requirement || '').replace(/^\[file\]\s*/, '').trim() || r.file || 'Lần chạy không tên') : 'Chưa có lần chạy nào';
    $('#hb-sub').textContent = r ? [r.file, fmtDT(r.startedAt || r.createdAt), `${(r.stages || []).filter((x) => x.status === 'done').length}/${(r.stages || []).length || 4} chặng xong`].filter(Boolean).join(' · ') : 'Tải file dữ liệu để bắt đầu.';
    $('#hb-pill').innerHTML = r ? statusPill(r.running ? 'running' : r.status) : '';
    const pct = t?.contextWindow ? Math.min(100, (t.maxContext / t.contextWindow) * 100) : 0;
    const setH = (el, html) => { if (el.__h !== html) { el.__h = html; el.innerHTML = html; } };
    const doneN = r ? r.stages.filter((s) => s.status === 'done').length : 0, evs = r ? r.stages.filter((s) => s.evaluation) : [];
    setH($('#hstats'), `
      <div class="w2-st"><b>${fmt(t?.total)}</b><span>Tổng token</span><em>in ${fmt(t?.input)} · out ${fmt(t?.output)} · cache ${fmt((t?.cacheRead || 0) + (t?.cacheCreate || 0))}</em></div>
      <div class="w2-st"><b>${pct.toFixed(1)}%</b><span>Context window</span><div class="ctxbar"><i style="width:${pct}%"></i></div><em>${fmt(t?.maxContext)} / ${fmt(t?.contextWindow)}</em></div>
      <div class="w2-st"><b>${doneN}/${META.stages.length}</b><span>Chặng hoàn thành</span><em>${r?.stages?.some((s) => s.status === 'error') ? '<span style="color:var(--err)">Có chặng lỗi</span>' : 'Không lỗi'}${evs.length ? ` · Evaluator đạt ${evs.filter((s) => s.evaluation.verdict === 'PASS').length}/${evs.length}` : ''}</em></div>
      <div class="w2-st"><b>$${(t?.cost || 0).toFixed(3)}</b><span>Chi phí</span><em>ước tính</em></div>
      <div class="w2-st"><b>${dur(t?.ms)}</b><span>Thời gian</span><em>model</em></div>`);
    // biểu đồ token theo chặng (dữ liệu thật từ usage của từng chặng)
    const rows = META.stages.map((sg, i) => { const u = r?.stages?.[i]?.usage; return { name: sg.name, inp: u ? u.input + u.cacheRead + u.cacheCreate : 0, out: u ? u.output : 0 }; });
    const mx = Math.max(1, ...rows.map((x) => x.inp + x.out));
    setH($('#w2chart'), rows.map((x) => `<div class="w2-col"><div class="w2-stack" title="input ${fmt(x.inp)} · output ${fmt(x.out)}"><i class="in" style="height:${(x.inp / mx) * 100}%"></i><i class="out" style="height:${(x.out / mx) * 100}%"></i></div><b>${x.inp + x.out ? fmt(x.inp + x.out) : '—'}</b><span>${esc(x.name)}</span></div>`).join(''));
    setH($('#htbl'), `<tr><th>Chặng</th><th>Model</th><th>Trạng thái</th><th>Input</th><th>Output</th><th>Context</th><th>Thời gian</th></tr>` +
      META.stages.map((sg, i) => { const s = r?.stages?.[i]; const u = s?.usage; const ctx = u ? u.input + u.output + u.cacheRead + u.cacheCreate : 0;
        return `<tr class="${s?.status === 'error' ? 'click' : ''}" data-err="${i}"><td><b>${i + 1}. ${esc(sg.name)}</b></td><td>${esc(s?.model || '—')}</td><td>${statusPill(s?.status || 'pending')}</td><td>${u ? fmt(u.input + u.cacheRead + u.cacheCreate) : '—'}</td><td>${u ? fmt(u.output) : '—'}</td><td>${u ? ((ctx / s.contextWindow) * 100).toFixed(1) + '%' : '—'}</td><td>${s?.ms ? dur(s.ms) : '—'}</td></tr>`; }).join(''));
    view.querySelectorAll('#htbl tr[data-err].click').forEach((tr) => (tr.onclick = () => showError(r, +tr.dataset.err)));
  };
  window.__lpSlider && window.__lpSlider();
  const rs = $('#runsel'); if (rs) rs.onchange = () => (location.hash = '#home/' + rs.value);
  window.onresize = drawEdges;
  const fetchRun = async () => { const r = await jget('/api/runs/' + id); update(r); return r; };
  drawEdges();
  if (!id) { update(null); return; }
  let r = await fetchRun(); requestAnimationFrame(drawEdges);
  const startPoll = () => { stopPoll(); poll = setInterval(async () => { try { const x = await fetchRun(); if (!x.running) stopPoll(); } catch { stopPoll(); } }, 1000); };
  window.__homeRefresh = async () => { const x = await fetchRun(); if (x.running) startPoll(); requestAnimationFrame(drawEdges); return x; };
  if (r.running) startPoll();
}
