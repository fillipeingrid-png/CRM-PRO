/* Relatórios */
function periodRange(p, from, to) {
  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  switch (p) {
    case 'hoje': return [todayISO(), todayISO()];
    case '7d': return [addDays(todayISO(), -6), todayISO()];
    case 'mes': return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
    case 'mespassado': return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
    case 'ano': return [`${y}-01-01`, `${y}-12-31`];
    case 'custom': return [from || '0000-01-01', to || '9999-12-31'];
    default: return ['0000-01-01', '9999-12-31'];
  }
}

const repState = { p: 'mes', tipo: 'vendas', from: '', to: '', func: '' };

function hbars(rows, fmt = money) {
  if (!rows.length) return `<p class="empty-sm">Sem dados no período.</p>`;
  const max = Math.max(...rows.map(r => r.v)) || 1;
  return `<div class="hbars">${rows.map(r => `
    <div class="hbar" title="${esc(r.k)}: ${esc(fmt(r.v))}${r.n ? ` (${r.n})` : ''}">
      <div class="hbar-top"><span>${esc(r.k)}</span><b>${fmt(r.v)}</b></div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(2, (r.v / max) * 100)}%"></div></div>
    </div>`).join('')}</div>`;
}

function vbars(series) {
  if (!series.some(s => s.v)) return `<p class="empty-sm">Sem faturamento no período.</p>`;
  const max = Math.max(...series.map(s => s.v)) || 1;
  const step = Math.ceil(series.length / 8);
  return `<div class="vbars" role="img" aria-label="Faturamento por período">${series.map((s, i) => `
    <div class="vcol" tabindex="0">
      <div class="vtip">${esc(s.label)}<b>${money(s.v)}</b></div>
      <div class="vbar" style="height:${s.v ? Math.max(2, (s.v / max) * 100) : 0}%"></div>
      <span class="vlab">${i % step === 0 ? esc(s.short) : ''}</span>
    </div>`).join('')}</div>`;
}

function group(arr, keyFn, valFn) {
  const m = new Map();
  arr.forEach(x => { const k = keyFn(x); const e = m.get(k) || { k, v: 0, n: 0 }; e.v += valFn(x); e.n++; m.set(k, e); });
  return [...m.values()].sort((a, b) => b.v - a.v);
}

function reportsPage() {
  return {
    title: 'Relatórios', back: true, icon: 'chart',
    body: `<div class="filters">
        <div class="chips" data-period>${[['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['ano', 'Este ano'], ['tudo', 'Tudo'], ['custom', 'Período']].map(([k, l]) => `<button class="chip" data-p="${k}">${l}</button>`).join('')}</div>
        <div class="row2 custom-range" hidden>
          <div class="field"><label>De</label><input class="input" type="date" data-from></div>
          <div class="field"><label>Até</label><input class="input" type="date" data-to></div>
        </div>
        <div class="field"><label>Tipo de registro</label><select class="input" data-tipo>
          <option value="vendas">Vendas</option><option value="pedidos">Pedidos</option><option value="orcamentos">Orçamentos</option><option value="todos">Vendas + Pedidos + Orçamentos</option></select></div>
        ${isManager() ? `<div class="field"><label>Funcionário</label><select class="input" data-func><option value="">Todos</option>${Store.all('usuarios').map(u => `<option value="${u.id}" ${u.id === repState.func ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select></div>` : ''}
      </div>
      <div data-out></div>`,
    mount(root) {
      const out = root.querySelector('[data-out]');
      const draw = () => {
        root.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === repState.p));
        root.querySelector('.custom-range').hidden = repState.p !== 'custom';
        root.querySelector('[data-tipo]').value = repState.tipo;
        const [a, b] = periodRange(repState.p, repState.from, repState.to);
        const cols = repState.tipo === 'todos' ? Object.keys(REC) : [repState.tipo];
        const all = cols.flatMap(c => visibleRecs(c).map(r => ({ ...r, _ent: c }))).filter(r => r.data >= a && r.data <= b && (!repState.func || r.funcionarioId === repState.func));
        const valid = all.filter(r => !isCancelled(r));
        const fat = valid.reduce((s, r) => s + recTotals(r).total, 0);
        const ticket = valid.length ? fat / valid.length : 0;
        const cob = Store.all('cobrancas');
        const recebido = cob.filter(x => x.pago && x.pagoEm >= a && x.pagoEm <= b).reduce((s, x) => s + x.valor, 0);
        const aReceber = cob.filter(x => !x.pago).reduce((s, x) => s + x.valor, 0);
        const vencido = cob.filter(x => !x.pago && x.vencimento < todayISO()).reduce((s, x) => s + x.valor, 0);

        // Série temporal: por dia (até 62 dias) ou por mês
        const realA = a === '0000-01-01' ? (valid.map(r => r.data).sort()[0] || todayISO()) : a;
        const realB = b === '9999-12-31' ? todayISO() : b;
        const days = Math.round((new Date(realB) - new Date(realA)) / 864e5) + 1;
        let series = [];
        if (days <= 62) {
          for (let d = realA; d <= realB; d = addDays(d, 1)) {
            series.push({ label: fmtDate(d), short: d.slice(8, 10), v: valid.filter(r => r.data === d).reduce((s, r) => s + recTotals(r).total, 0) });
          }
        } else {
          for (let d = realA.slice(0, 7) + '-01'; d <= realB; d = addMonths(d, 1)) {
            const ym = d.slice(0, 7);
            series.push({ label: `${MESES[+ym.slice(5) - 1]}/${ym.slice(0, 4)}`, short: MESES[+ym.slice(5) - 1].slice(0, 3), v: valid.filter(r => r.data.startsWith(ym)).reduce((s, r) => s + recTotals(r).total, 0) });
          }
          if (series.length > 36) series = series.slice(-36);
        }

        const itens = valid.flatMap(r => r.itens.map(i => ({ ...i, total: i.qtd * i.valor })));
        const topItens = group(itens, i => i.nome, i => i.total).slice(0, 8);
        const topCli = group(valid, r => clientName(r.clienteId) || '(sem cliente)', r => recTotals(r).total).slice(0, 8);
        const porFunc = group(valid, r => r.funcionario || '—', r => recTotals(r).total);
        const porSit = group(all, r => r.situacao, () => 1);
        const porPag = group(valid, r => r.pagamento || 'Não informado', r => recTotals(r).total);

        out.innerHTML = `
          <p class="period-note">Período: <b>${fmtDate(realA)}</b> a <b>${fmtDate(realB)}</b></p>
          <div class="kpis">
            <div class="kpi hero"><span>Faturamento</span><b>${money(fat)}</b><small>${valid.length} registro(s) · cancelados/recusados não entram</small></div>
            <div class="kpi"><span>Ticket médio</span><b>${money(ticket)}</b></div>
            <div class="kpi"><span>Recebido (cobrança)</span><b>${money(recebido)}</b></div>
            <div class="kpi"><span>A receber</span><b>${money(aReceber)}</b></div>
            <div class="kpi"><span>Vencido</span><b class="${vencido ? 'neg' : ''}">${money(vencido)}</b></div>
          </div>
          <section class="card pad"><h3 class="card-h">Faturamento ${days <= 62 ? 'por dia' : 'por mês'}</h3>${vbars(series)}</section>
          <section class="card pad"><h3 class="card-h">Produtos e serviços mais vendidos</h3>${hbars(topItens)}</section>
          <section class="card pad"><h3 class="card-h">Melhores clientes</h3>${hbars(topCli)}</section>
          <section class="card pad"><h3 class="card-h">Por funcionário</h3>${hbars(porFunc)}</section>
          <section class="card pad"><h3 class="card-h">Por forma de pagamento</h3>${hbars(porPag)}</section>
          <section class="card pad"><h3 class="card-h">Registros por situação</h3>${hbars(porSit, v => num(v))}</section>
          <button class="btn outline block" data-csv>${icon('download')} Exportar registros do período (CSV)</button>`;
        out.querySelector('[data-csv]').onclick = () => {
          const head = ['Tipo', 'Número', 'Data', 'Cliente', 'Situação', 'Pagamento', 'Funcionário', 'Total'];
          const lines = all.map(r => [REC[r._ent].singular, recNumber(r._ent, r), fmtDate(r.data), clientName(r.clienteId), r.situacao, r.pagamento || '', r.funcionario || '', recTotals(r).total.toFixed(2).replace('.', ',')]);
          const csv = [head, ...lines].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
          download(`relatorio-${realA}-a-${realB}.csv`, '﻿' + csv, 'text/csv');
        };
      };
      root.querySelector('[data-period]').onclick = e => { const b = e.target.closest('[data-p]'); if (b) { repState.p = b.dataset.p; draw(); } };
      root.querySelector('[data-tipo]').onchange = e => { repState.tipo = e.target.value; draw(); };
      root.querySelector('[data-func]')?.addEventListener('change', e => { repState.func = e.target.value; draw(); });
      root.querySelector('[data-from]').onchange = e => { repState.from = e.target.value; draw(); };
      root.querySelector('[data-to]').onchange = e => { repState.to = e.target.value; draw(); };
      draw();
    },
  };
}
