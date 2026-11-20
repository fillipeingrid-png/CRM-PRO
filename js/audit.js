/* Registro de atividades (auditoria) e Painel do Gestor */
const LOG_MAX = 5000;
const isManager = (u = Store.user()) => !!u && u.papel === 'Gestor';

/* Registros que o usuário atual pode ver: gestor vê tudo, vendedor só os próprios */
function visibleRecs(ent) {
  const u = Store.user();
  const all = Store.all(ent);
  return isManager(u) ? all : all.filter(r => r.funcionarioId === u?.id);
}
function canSeeRec(r) { const u = Store.user(); return isManager(u) || r.funcionarioId === u?.id; }

const ACOES = {
  criou: { l: 'Criou', tone: 'ok' },
  editou: { l: 'Editou', tone: 'info' },
  excluiu: { l: 'Excluiu', tone: 'bad' },
  restaurou: { l: 'Restaurou', tone: 'ok' },
  entrou: { l: 'Entrou', tone: 'info' },
  saiu: { l: 'Saiu', tone: 'wait' },
  falhou: { l: 'Senha errada', tone: 'bad' },
  compartilhou: { l: 'Enviou', tone: 'info' },
  imprimiu: { l: 'Imprimiu', tone: 'info' },
  backup: { l: 'Backup', tone: 'wait' },
  config: { l: 'Configurou', tone: 'wait' },
};
const COL_LABEL = c => (REC[c] || ENT[c])?.singular || c;
const FIELD_LABEL = { situacao: 'situação', clienteId: 'cliente', itens: 'itens', desconto: 'desconto', acrescimo: 'acréscimo', pagamento: 'pagamento', data: 'data', obs: 'observação', validade: 'validade', senhaHash: 'senha', papel: 'perfil', pago: 'pagamento recebido', vencimento: 'vencimento', valor: 'valor', preco: 'preço', estoque: 'estoque' };
const SKIP = ['id', 'criadoEm', 'atualizadoEm', 'baixas', 'total', 'numero', 'funcionario', 'funcionarioId'];

var Audit = {
  add(acao, desc, extra = {}) {
    const u = Store.user();
    const log = (Store.d.log ||= []);
    log.push({ id: uid(), ts: new Date().toISOString(), uid: extra.uid ?? u?.id ?? '', unome: extra.unome ?? u?.nome ?? '(sistema)', acao, desc, ...extra });
    if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
    Store.save();
  },
  describe(c, o) {
    if (!o) return COL_LABEL(c);
    if (REC[c]) return `${REC[c].singular} ${recNumber(c, o)} · ${clientName(o.clienteId) || 'sem cliente'} · ${money(recTotals(o).total)}`;
    const D = ENT[c];
    return `${D.singular} “${D.title(o)}”`;
  },
  diff(before, after) {
    const out = [];
    for (const k of Object.keys(after)) {
      if (SKIP.includes(k) || k.startsWith('_')) continue;
      const a = before[k], b = after[k];
      if (JSON.stringify(a ?? '') === JSON.stringify(b ?? '')) continue;
      const name = FIELD_LABEL[k] || ENT[Object.keys(ENT).find(e => ENT[e].fields.some(f => f.k === k))]?.fields.find(f => f.k === k)?.l?.toLowerCase() || k;
      if (k === 'senhaHash') out.push('senha alterada');
      else if (k === 'situacao') out.push(`situação: ${a || '—'} → ${b}`);
      else if (k === 'clienteId') out.push(`cliente: ${clientName(a) || '—'} → ${clientName(b) || '—'}`);
      else if (k === 'itens') out.push(`itens alterados (${(a || []).length} → ${(b || []).length})`);
      else if (['desconto', 'acrescimo', 'valor', 'preco', 'custo'].includes(k)) out.push(`${name}: ${money(a)} → ${money(b)}`);
      else if (typeof b === 'boolean') out.push(`${name}: ${b ? 'sim' : 'não'}`);
      else out.push(`${name}: ${a || '—'} → ${b || '—'}`);
    }
    return out.join(' · ');
  },
  /* chamado pelo Store a cada criação/edição/exclusão */
  onChange(c, acao, before, after) {
    if (c === 'log') return;
    if (acao === 'editou') {
      const det = this.diff(before, after);
      if (!det) return; // nada relevante mudou
      if (REC[c] && before.total != null && Math.abs(recTotals(after).total - (before.total || 0)) > 0.004)
        return this.add(acao, this.describe(c, after), { col: c, refId: after.id, det: det + ` · total: ${money(before.total)} → ${money(recTotals(after).total)}` });
      return this.add(acao, this.describe(c, after), { col: c, refId: after.id, det });
    }
    const o = after || before;
    const extra = { col: c, refId: o.id };
    if (acao === 'excluiu') { const snap = { ...before }; delete snap.senhaHash; extra.snap = snap; }
    this.add(acao, this.describe(c, o), extra);
  },
};

/* ---------- Painel do Gestor ---------- */
const actState = { p: '7d', user: '', tipo: '', limit: 150 };
const fmtTime = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDay = ts => { const d = isoDate(new Date(ts)); return d === todayISO() ? 'Hoje' : d === addDays(todayISO(), -1) ? 'Ontem' : `${DIAS[new Date(ts).getDay()]}, ${fmtDate(d)}`; };

function activityPage() {
  if (!isManager()) return { title: 'Painel do Gestor', back: true, icon: 'eye', body: `<div class="empty">${icon('lock')}<p>Somente o gestor tem acesso a este painel.</p></div>` };
  return {
    title: 'Painel do Gestor', back: true, icon: 'eye',
    body: `<div class="chips" data-period>${[['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['tudo', 'Tudo']].map(([k, l]) => `<button class="chip" data-p="${k}">${l}</button>`).join('')}</div>
      <h3 class="sec">Equipe</h3><div class="team" data-team></div>
      <h3 class="sec">Atividades</h3>
      <div class="field"><label for="act-user">Usuário</label><select class="input" id="act-user" data-user></select></div>
      <div class="chips" data-tipo>${[['', 'Todas'], ['criou', 'Criações'], ['editou', 'Edições'], ['excluiu', 'Exclusões'], ['acesso', 'Acessos'], ['outros', 'Outros']].map(([k, l]) => `<button class="chip" data-t="${k}">${l}</button>`).join('')}</div>
      <div data-feed></div>`,
    mount(root) {
      const draw = () => {
        const [a, b] = periodRange(actState.p);
        const inP = ts => { const d = isoDate(new Date(ts)); return d >= a && d <= b; };
        const log = (Store.d.log || []).filter(e => inP(e.ts));
        const users = Store.all('usuarios');
        root.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x.dataset.p === actState.p));
        root.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === actState.tipo));

        // Resumo por usuário
        root.querySelector('[data-team]').innerHTML = users.map(u => {
          const mine = log.filter(e => e.uid === u.id);
          const last = (Store.d.log || []).filter(e => e.uid === u.id && e.acao === 'entrou').pop();
          const vend = ['vendas', 'pedidos'].flatMap(c => Store.all(c)).filter(r => r.funcionarioId === u.id && r.data >= a && r.data <= b && !isCancelled(r));
          const del = mine.filter(e => e.acao === 'excluiu').length;
          return `<button class="member card ${actState.user === u.id ? 'on' : ''}" data-member="${u.id}">
            <span class="avatar sm">${esc(u.nome[0].toUpperCase())}</span>
            <div class="m-main"><strong class="ell">${esc(u.nome)}</strong><small>${esc(u.papel)} · último acesso: ${last ? fmtDay(last.ts).toLowerCase() + ' ' + fmtTime(last.ts) : 'nunca'}</small></div>
            <div class="m-nums"><span><b>${vend.length}</b> vendas/pedidos</span><span><b>${money(vend.reduce((s, r) => s + recTotals(r).total, 0))}</b></span>
            <span><b>${mine.length}</b> ações${del ? ` · <em>${del} exclus${del > 1 ? 'ões' : 'ão'}</em>` : ''}</span></div></button>`;
        }).join('');

        const sel = root.querySelector('[data-user]');
        sel.innerHTML = `<option value="">Todos os usuários</option>` + users.map(u => `<option value="${u.id}" ${u.id === actState.user ? 'selected' : ''}>${esc(u.nome)}</option>`).join('');

        let feed = log.slice().reverse();
        if (actState.user) feed = feed.filter(e => e.uid === actState.user);
        if (actState.tipo === 'acesso') feed = feed.filter(e => ['entrou', 'saiu', 'falhou'].includes(e.acao));
        else if (actState.tipo === 'outros') feed = feed.filter(e => !['criou', 'editou', 'excluiu', 'entrou', 'saiu', 'falhou'].includes(e.acao));
        else if (actState.tipo) feed = feed.filter(e => e.acao === actState.tipo);

        const shown = feed.slice(0, actState.limit);
        let day = '';
        root.querySelector('[data-feed]').innerHTML = !shown.length ? `<p class="empty-sm">Nenhuma atividade neste período.</p>` :
          `<p class="list-sum">${feed.length} atividade(s)</p><div class="feed card">` + shown.map(e => {
            const d = fmtDay(e.ts);
            const head = d !== day ? `<div class="feed-day">${d}</div>` : '';
            day = d;
            const A = ACOES[e.acao] || { l: e.acao, tone: 'info' };
            const exists = e.col && e.refId && Store.get(e.col, e.refId);
            const href = exists ? (REC[e.col] ? `#/doc/${e.col}/${e.refId}` : `#/form/${e.col}/${e.refId}`) : '';
            return `${head}<div class="feed-row ${e.acao === 'excluiu' || e.acao === 'falhou' ? 'alert-row' : ''}">
              <span class="feed-time">${fmtTime(e.ts)}</span>
              <div class="feed-main"><div class="feed-top"><b>${esc(e.unome)}</b><span class="badge ${A.tone}">${esc(A.l)}</span></div>
                <span class="feed-desc">${esc(e.desc)}</span>${e.det ? `<small>${esc(e.det)}</small>` : ''}
                <div class="feed-links">${href ? `<a href="${href}">Abrir</a>` : ''}${e.acao === 'excluiu' && e.snap && !exists ? `<button data-restore="${e.id}">Restaurar</button>` : ''}</div></div></div>`;
          }).join('') + `</div>` + (feed.length > shown.length ? `<button class="btn outline block" data-more>Mostrar mais</button>` : '');
      };
      root.querySelector('[data-period]').onclick = e => { const x = e.target.closest('[data-p]'); if (x) { actState.p = x.dataset.p; draw(); } };
      root.querySelector('[data-tipo]').onclick = e => { const x = e.target.closest('[data-t]'); if (x) { actState.tipo = x.dataset.t; draw(); } };
      root.querySelector('[data-user]').onchange = e => { actState.user = e.target.value; draw(); };
      root.querySelector('[data-team]').onclick = e => { const x = e.target.closest('[data-member]'); if (x) { actState.user = actState.user === x.dataset.member ? '' : x.dataset.member; draw(); } };
      root.querySelector('[data-feed]').onclick = async e => {
        if (e.target.closest('[data-more]')) { actState.limit += 150; draw(); return; }
        const r = e.target.closest('[data-restore]');
        if (!r) return;
        const ent = (Store.d.log || []).find(x => x.id === r.dataset.restore);
        if (!ent || !await confirmDlg(`Restaurar ${ent.desc}?`, { ok: 'Restaurar' })) return;
        const snap = { ...ent.snap, baixas: [] };
        Store.put(ent.col, snap, { silent: true });
        if (REC[ent.col]) applyStock(ent.col, snap);
        Audit.add('restaurou', ent.desc, { col: ent.col, refId: snap.id, det: `excluído por ${ent.unome}` });
        toast('Registro restaurado.'); draw();
      };
      draw();
    },
  };
}

/* Bloco de atividade recente na tela inicial do gestor */
function teamActivityCard() {
  if (!isManager()) return '';
  const last = (Store.d.log || []).slice(-5).reverse();
  if (!last.length) return '';
  return `<section class="card pad"><div class="card-row"><h3 class="card-h caps">Atividade da equipe</h3><a class="link" href="#/activity">Ver tudo</a></div>
    ${last.map(e => { const A = ACOES[e.acao] || { l: e.acao, tone: 'info' }; return `<a class="mini-row" href="#/activity"><span class="avatar sm">${esc((e.unome || '?')[0].toUpperCase())}</span><div><strong>${esc(e.unome)} · ${esc(A.l.toLowerCase())}</strong><small>${esc(e.desc)} · ${fmtDay(e.ts).toLowerCase()} ${fmtTime(e.ts)}</small></div></a>`; }).join('')}</section>`;
}
