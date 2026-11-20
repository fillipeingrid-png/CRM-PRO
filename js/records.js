/* Vendas, Pedidos e Orçamentos: formulário com itens, documento e ações */
const REC = {
  vendas: { label: 'Vendas', singular: 'Venda', prefix: 'V', icon: 'receipt', tone: 'green', status: ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'], baixaEstoque: true },
  pedidos: { label: 'Pedidos', singular: 'Pedido', prefix: 'P', icon: 'ticket', tone: 'green', status: ['Pendente', 'Em Andamento', 'Entregue', 'Cancelado'], baixaEstoque: true },
  orcamentos: { label: 'Orçamentos', singular: 'Orçamento', prefix: 'O', icon: 'doc', tone: 'green', status: ['Pendente', 'Aprovado', 'Recusado'], baixaEstoque: false },
};
const isCancelled = r => /cancel|recus/.test(norm(r.situacao));

function recTotals(r) {
  const prod = (r.itens || []).filter(i => i.tipo === 'produto').reduce((s, i) => s + i.qtd * i.valor, 0);
  const serv = (r.itens || []).filter(i => i.tipo === 'servico').reduce((s, i) => s + i.qtd * i.valor, 0);
  const total = Math.max(0, prod + serv - (r.desconto || 0) + (r.acrescimo || 0));
  return { prod, serv, total };
}

/* ---------- Seletor (cliente / produto / serviço) ---------- */
function pick(col) {
  const cfg = {
    clientes: { title: 'Selecione o cliente', sub: x => x.telefone || x.email || '', newLabel: 'Novo cliente' },
    produtos: { title: 'Selecione o produto', sub: x => money(x.preco) + (x.estoque !== '' && x.estoque != null ? ` · Estoque: ${num(x.estoque)}` : ''), newLabel: 'Novo produto' },
    servicos: { title: 'Selecione o serviço', sub: x => money(x.preco), newLabel: 'Novo serviço' },
  }[col];
  return new Promise(resolve => {
    const s = sheet({
      title: cfg.title, full: true,
      body: `<div class="search-row in-sheet"><label class="search">${icon('search')}<input type="search" placeholder="Pesquisar…" data-q autocomplete="off"></label></div>
        <button class="btn outline block" data-new>${icon('add')} ${cfg.newLabel}</button>
        <div class="pick-list" data-list></div>`,
      onMount(el, api) {
        const list = el.querySelector('[data-list]');
        const q = el.querySelector('[data-q]');
        const draw = () => {
          const t = norm(q.value);
          const items = Store.all(col).filter(x => norm(ENT[col].search(x)).includes(t)).sort(ENT[col].sort);
          list.innerHTML = items.length ? items.map(x => `<button class="pick-item" data-id="${x.id}"><strong>${esc(x.nome)}</strong><span>${esc(cfg.sub(x))}</span></button>`).join('')
            : `<p class="empty-sm">Nenhum registro encontrado.</p>`;
        };
        q.oninput = draw; draw();
        list.onclick = e => { const b = e.target.closest('[data-id]'); if (b) api.close(Store.get(col, b.dataset.id)); };
        el.querySelector('[data-new]').onclick = async () => {
          const created = await quickCreate(col, q.value);
          if (created) api.close(created);
        };
        setTimeout(() => q.focus(), 250);
      },
    });
    s.onClose = v => resolve(v || null);
  });
}

/* Cadastro rápido dentro do seletor */
function quickCreate(col, nome = '') {
  const def = ENT[col];
  const fields = def.fields.filter(f => ['nome', 'telefone', 'preco', 'unidade', 'estoque'].includes(f.k));
  return new Promise(resolve => {
    const s = sheet({
      title: def.singular + ' — cadastro rápido',
      body: `<form class="form" data-f>${fields.map(f => fieldHTML(f, f.k === 'nome' ? nome : '')).join('')}
        <button class="btn primary block lg" type="submit">SALVAR</button></form>`,
      onMount(el, api) {
        bindMoney(el);
        el.querySelector('[data-f]').onsubmit = e => {
          e.preventDefault();
          const v = formValues(e.target);
          if (!v.nome) return toast('Informe o nome.', 'err');
          api.close(Store.put(col, v));
          toast(def.singular + ' cadastrado!');
        };
      },
    });
    s.onClose = v => resolve(v || null);
  });
}

/* ---------- Formulário de registro ---------- */
function recordFormPage(ent, id) {
  const R = REC[ent];
  const existing = id ? Store.get(ent, id) : null;
  if (id && !existing) return notFound();
  const user = Store.user();
  const st = existing ? JSON.parse(JSON.stringify(existing)) : {
    data: todayISO(), clienteId: '', situacao: R.status[0], obs: '', itens: [], desconto: 0, acrescimo: 0, pagamento: '',
    validade: ent === 'orcamentos' ? addDays(todayISO(), Number(Store.d.settings.validade) || 7) : '',
  };
  const open = { info: true, produto: false, servico: false, total: false };

  const acc = (key, ic, title, inner) => `
    <section class="acc ${open[key] ? 'open' : ''}" data-acc="${key}">
      <button type="button" class="acc-head" aria-expanded="${open[key]}">
        <span class="circle">${icon(ic)}</span><span class="acc-title" data-title="${key}">${title}</span>${icon('expand', 'chev')}
      </button>
      <div class="acc-body">${inner}</div>
    </section>`;

  const itemAdder = tipo => `
    <div class="field"><label>${tipo === 'produto' ? 'Produto' : 'Serviço'}</label>
      <button type="button" class="input picker" data-pick="${tipo}"><span class="ph">Selecione o ${tipo === 'produto' ? 'produto' : 'serviço'}</span>${icon('search')}</button></div>
    <div class="row2">
      <div class="field"><label>Quantidade</label><input class="input" type="number" inputmode="decimal" min="0" step="any" placeholder="Informe a quantidade" data-qtd="${tipo}"></div>
      <div class="field"><label>Valor Unitário</label><input class="input" inputmode="numeric" data-money data-val="${tipo}" value="${money(0)}"></div>
    </div>
    <button type="button" class="btn accent block lg" data-add="${tipo}">ADICIONAR ${tipo === 'produto' ? 'PRODUTO' : 'SERVIÇO'}</button>
    <div class="items" data-items="${tipo}"></div>`;

  const body = `
  <form class="rec-form" data-form novalidate>
    ${acc('info', R.icon, 'INFORMAÇÕES', `
      <div class="field"><label>Data</label><input class="input" type="date" name="data" value="${esc(st.data)}" required></div>
      <div class="field"><label>Cliente</label>
        <button type="button" class="input picker" data-pick="cliente"><span class="${st.clienteId ? '' : 'ph'}" data-cliente-label>${esc(clientName(st.clienteId) || 'Selecione o cliente')}</span>${icon('search')}</button></div>
      <div class="field"><label>Situação</label><select class="input" name="situacao">${R.status.map(s => `<option ${s === st.situacao ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      ${ent === 'orcamentos' ? `<div class="field"><label>Válido até</label><input class="input" type="date" name="validade" value="${esc(st.validade)}"></div>` : ''}
      <div class="field"><label>Observação</label><textarea class="input" name="obs" rows="3">${esc(st.obs)}</textarea></div>`)}
    ${acc('produto', 'tag', 'PRODUTOS (0 selecionados)', itemAdder('produto'))}
    ${acc('servico', 'wrench', 'SERVIÇOS (0 selecionados)', itemAdder('servico'))}
    ${acc('total', 'money', 'TOTAL', `
      <div class="tot-lines" data-totlines></div>
      <div class="row2">
        <div class="field"><label>Desconto</label><input class="input" inputmode="numeric" data-money name="desconto" value="${money(st.desconto)}"></div>
        <div class="field"><label>Acréscimo / Frete</label><input class="input" inputmode="numeric" data-money name="acrescimo" value="${money(st.acrescimo)}"></div>
      </div>
      <div class="field"><label>Forma de pagamento</label><select class="input" name="pagamento">${PAGAMENTOS.map(p => `<option value="${p}" ${p === st.pagamento ? 'selected' : ''}>${p || 'Não informado'}</option>`).join('')}</select></div>
      <div class="grand"><span>Total</span><strong data-grand></strong></div>`)}
    <div class="sticky-actions"><button class="btn primary block xl" type="submit">${existing ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR'}</button></div>
  </form>`;

  const sel = { produto: null, servico: null };

  function syncFromInputs(form) {
    st.data = form.data.value; st.situacao = form.situacao.value; st.obs = form.obs.value.trim();
    st.desconto = parseMoney(form.desconto.value); st.acrescimo = parseMoney(form.acrescimo.value);
    st.pagamento = form.pagamento.value;
    if (form.validade) st.validade = form.validade.value;
  }

  function drawItems(root) {
    ['produto', 'servico'].forEach(tipo => {
      const its = st.itens.map((it, idx) => ({ it, idx })).filter(x => x.it.tipo === tipo);
      root.querySelector(`[data-items="${tipo}"]`).innerHTML = its.map(({ it, idx }) => `
        <div class="item-row">
          <div><strong>${esc(it.nome)}</strong><span>${num(it.qtd)} × ${money(it.valor)}</span></div>
          <b>${money(it.qtd * it.valor)}</b>
          <button type="button" class="icon-btn sm" data-rm="${idx}" aria-label="Remover item">${icon('delete')}</button>
        </div>`).join('');
      root.querySelector(`[data-title="${tipo}"]`).textContent = `${tipo === 'produto' ? 'PRODUTOS' : 'SERVIÇOS'} (${its.length} selecionado${its.length === 1 ? '' : 's'})`;
    });
    const t = recTotals(st);
    root.querySelector('[data-totlines]').innerHTML = `
      <div><span>Produtos</span><b>${money(t.prod)}</b></div>
      <div><span>Serviços</span><b>${money(t.serv)}</b></div>`;
    root.querySelector('[data-grand]').textContent = money(t.total);
  }

  return {
    title: R.singular, back: true, icon: R.icon,
    tabs: existing ? [{ l: 'Cadastro', active: true }, { l: 'Documento', href: `#/doc/${ent}/${id}` }] : [{ l: 'Cadastro', active: true }],
    actions: existing ? `<button class="icon-btn" data-del aria-label="Excluir">${icon('delete')}</button>` : '',
    body,
    mount(root) {
      const form = root.querySelector('[data-form]');
      bindMoney(root);
      drawItems(root);
      root.querySelectorAll('.acc-head').forEach(h => h.onclick = () => {
        const s = h.parentElement; s.classList.toggle('open'); h.setAttribute('aria-expanded', s.classList.contains('open'));
      });
      ['desconto', 'acrescimo'].forEach(n => form[n].addEventListener('input', () => { syncFromInputs(form); drawItems(root); }));

      root.addEventListener('click', async e => {
        const p = e.target.closest('[data-pick]');
        if (p) {
          const tipo = p.dataset.pick;
          if (tipo === 'cliente') {
            const c = await pick('clientes');
            if (c) { st.clienteId = c.id; const l = root.querySelector('[data-cliente-label]'); l.textContent = c.nome; l.className = ''; }
          } else {
            const x = await pick(tipo === 'produto' ? 'produtos' : 'servicos');
            if (x) {
              sel[tipo] = x;
              p.querySelector('span').textContent = x.nome; p.querySelector('span').className = '';
              root.querySelector(`[data-val="${tipo}"]`).value = money(x.preco);
              const q = root.querySelector(`[data-qtd="${tipo}"]`); if (!q.value) q.value = 1;
            }
          }
          return;
        }
        const a = e.target.closest('[data-add]');
        if (a) {
          const tipo = a.dataset.add;
          const x = sel[tipo];
          const qtd = Number(root.querySelector(`[data-qtd="${tipo}"]`).value);
          const valor = parseMoney(root.querySelector(`[data-val="${tipo}"]`).value);
          if (!x) return toast(`Selecione o ${tipo === 'produto' ? 'produto' : 'serviço'}.`, 'err');
          if (!(qtd > 0)) return toast('Informe a quantidade.', 'err');
          st.itens.push({ tipo, refId: x.id, nome: x.nome, unidade: x.unidade || '', qtd, valor });
          sel[tipo] = null;
          const pb = root.querySelector(`[data-pick="${tipo}"] span`); pb.textContent = `Selecione o ${tipo === 'produto' ? 'produto' : 'serviço'}`; pb.className = 'ph';
          root.querySelector(`[data-qtd="${tipo}"]`).value = '';
          root.querySelector(`[data-val="${tipo}"]`).value = money(0);
          drawItems(root);
          toast('Item adicionado.');
          return;
        }
        const rm = e.target.closest('[data-rm]');
        if (rm) { st.itens.splice(Number(rm.dataset.rm), 1); drawItems(root); }
      });

      form.onsubmit = e => {
        e.preventDefault();
        syncFromInputs(form);
        if (!st.data) return toast('Informe a data.', 'err');
        if (!st.clienteId) return toast('Selecione o cliente.', 'err');
        if (!st.itens.length) return toast('Adicione ao menos um produto ou serviço.', 'err');
        st.total = recTotals(st).total;
        if (!existing) {
          st.numero = Store.next(ent);
          st.funcionario = user?.nome || '';
          st.funcionarioId = user?.id || '';
        }
        const saved = Store.put(ent, st);
        applyStock(ent, saved);
        toast(`${R.singular} ${existing ? 'atualizada' : 'registrada'} com sucesso!`);
        location.replace(`#/doc/${ent}/${saved.id}`);
      };
    },
    onAction: async name => {
      if (name === 'del' && await confirmDlg(`Excluir ${R.singular.toLowerCase()} ${recNumber(ent, existing)}?`, { ok: 'Excluir', danger: true })) {
        revertStock(existing);
        Store.del(ent, id);
        toast('Registro excluído.');
        location.hash = `#/list/${ent}`;
      }
    },
  };
}

const recNumber = (ent, r) => `#${REC[ent].prefix}-${String(r.numero || 0).padStart(5, '0')}`;

/* Baixa de estoque: aplicada em vendas/pedidos não cancelados; refeita a cada edição */
function revertStock(r) {
  (r.baixas || []).forEach(b => { const p = Store.get('produtos', b.id); if (p && p.estoque !== '' && p.estoque != null) p.estoque = Number(p.estoque) + b.qtd; });
}
function applyStock(ent, rec) {
  const r = Store.get(ent, rec.id);
  revertStock(r);
  r.baixas = [];
  if (REC[ent].baixaEstoque && !isCancelled(r)) {
    r.itens.filter(i => i.tipo === 'produto').forEach(i => {
      const p = Store.get('produtos', i.refId);
      if (p && p.estoque !== '' && p.estoque != null) { p.estoque = Number(p.estoque) - i.qtd; r.baixas.push({ id: p.id, qtd: i.qtd }); }
    });
  }
  Store.save();
}

/* ---------- Documento (visualizar / imprimir / compartilhar) ---------- */
function docPage(ent, id) {
  const R = REC[ent];
  const r = Store.get(ent, id);
  if (!r) return notFound();
  const s = Store.d.settings;
  const c = Store.get('clientes', r.clienteId) || { nome: '—' };
  const t = recTotals(r);
  const rows = tipo => r.itens.filter(i => i.tipo === tipo).map(i => `
    <tr><td>${esc(i.nome)}</td><td class="r">${num(i.qtd)}${i.unidade ? ' ' + esc(i.unidade) : ''}</td><td class="r">${money(i.valor)}</td><td class="r">${money(i.qtd * i.valor)}</td></tr>`).join('');
  const table = (tipo, title) => rows(tipo) ? `<h4>${title}</h4><table class="doc-table"><thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>${rows(tipo)}</tbody></table>` : '';
  const conv = ent === 'orcamentos' ? `<button class="btn outline" data-act="convert">${icon('swap')} Converter em venda</button>` : '';
  const cob = ent !== 'orcamentos' ? `<button class="btn outline" data-act="charge">${icon('money')} Gerar cobrança</button>` : '';

  return {
    title: `${R.singular} ${recNumber(ent, r)}`, back: true, icon: R.icon, backTo: `#/list/${ent}`,
    tabs: [{ l: 'Cadastro', href: `#/form/${ent}/${id}` }, { l: 'Documento', active: true }],
    body: `
      <div class="doc-actions">
        ${EMBEDDED ? '' : `<button class="btn primary" data-act="print">${icon('print')} Imprimir / PDF</button>`}
        <button class="btn green" data-act="whats">${icon('share')} WhatsApp</button>
        ${conv}${cob}
        <button class="btn outline" data-act="dup">${icon('copy')} Duplicar</button>
      </div>
      <article class="paper" style="--doc:${esc(s.cor || '#1565c0')}">
        <header class="paper-head">
          ${s.logo ? `<img src="${s.logo}" alt="Logo" class="paper-logo">` : ''}
          <div><h2>${esc(s.empresa || 'Minha Empresa')}</h2>
            <p>${[s.documento && 'CNPJ/CPF: ' + s.documento, s.telefone, s.email].filter(Boolean).map(esc).join(' · ')}</p>
            ${s.endereco ? `<p>${esc(s.endereco)}</p>` : ''}</div>
        </header>
        <div class="paper-title"><h3>${R.singular.toUpperCase()} ${recNumber(ent, r)}</h3>${badge(r.situacao)}</div>
        <div class="paper-meta">
          <div><span>Data</span><b>${fmtDate(r.data)}</b></div>
          ${r.validade ? `<div><span>Válido até</span><b>${fmtDate(r.validade)}</b></div>` : ''}
          <div><span>Atendente</span><b>${esc(r.funcionario || '—')}</b></div>
        </div>
        <div class="paper-client"><span>Cliente</span><b>${esc(c.nome)}</b>
          <small>${[c.documento, c.telefone, c.email].filter(Boolean).map(esc).join(' · ')}</small>
          ${c.endereco ? `<small>${esc(c.endereco)}</small>` : ''}</div>
        ${table('produto', 'Produtos')}
        ${table('servico', 'Serviços')}
        <div class="paper-tot">
          ${t.prod ? `<div><span>Produtos</span><b>${money(t.prod)}</b></div>` : ''}
          ${t.serv ? `<div><span>Serviços</span><b>${money(t.serv)}</b></div>` : ''}
          ${r.desconto ? `<div><span>Desconto</span><b>− ${money(r.desconto)}</b></div>` : ''}
          ${r.acrescimo ? `<div><span>Acréscimo / Frete</span><b>${money(r.acrescimo)}</b></div>` : ''}
          <div class="big"><span>TOTAL</span><b>${money(t.total)}</b></div>
          ${r.pagamento ? `<div><span>Pagamento</span><b>${esc(r.pagamento)}</b></div>` : ''}
        </div>
        ${r.obs ? `<div class="paper-obs"><span>Observações</span><p>${esc(r.obs)}</p></div>` : ''}
        ${s.mostrarAssinatura ? `<div class="paper-sign"><div></div><span>Assinatura do cliente</span></div>` : ''}
        ${s.rodape ? `<footer class="paper-foot">${esc(s.rodape)}</footer>` : ''}
      </article>`,
    mount(root) {
      root.querySelector('.doc-actions').onclick = async e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const act = b.dataset.act;
        if (act === 'print') window.print();
        if (act === 'whats') shareWhats(ent, r, c, t);
        if (act === 'dup') {
          const copy = JSON.parse(JSON.stringify(r));
          delete copy.id; delete copy.baixas;
          Object.assign(copy, { numero: Store.next(ent), data: todayISO(), situacao: R.status[0], funcionario: Store.user()?.nome || '' });
          const n = Store.put(ent, copy); applyStock(ent, n);
          toast('Registro duplicado.'); location.hash = `#/form/${ent}/${n.id}`;
        }
        if (act === 'convert') {
          if (!await confirmDlg('Criar uma venda a partir deste orçamento e marcá-lo como Aprovado?')) return;
          const v = { ...JSON.parse(JSON.stringify(r)), situacao: 'Pendente', data: todayISO(), numero: Store.next('vendas'), validade: '', origem: recNumber(ent, r), funcionario: Store.user()?.nome || '' };
          delete v.id; delete v.baixas;
          const n = Store.put('vendas', v); applyStock('vendas', n);
          Store.put(ent, { id: r.id, situacao: 'Aprovado' });
          toast('Venda criada a partir do orçamento!'); location.hash = `#/doc/vendas/${n.id}`;
        }
        if (act === 'charge') chargeDialog(ent, r, t.total);
      };
    },
  };
}

function shareWhats(ent, r, c, t) {
  const s = Store.d.settings;
  const lines = [
    `*${s.empresa || 'Minha Empresa'}*`,
    `${REC[ent].singular} ${recNumber(ent, r)} — ${fmtDate(r.data)}`,
    `Cliente: ${c.nome}`, '',
    ...r.itens.map(i => `• ${i.nome} — ${num(i.qtd)} × ${money(i.valor)} = ${money(i.qtd * i.valor)}`), '',
    r.desconto ? `Desconto: − ${money(r.desconto)}` : '',
    r.acrescimo ? `Acréscimo/Frete: ${money(r.acrescimo)}` : '',
    `*Total: ${money(t.total)}*`,
    r.pagamento ? `Pagamento: ${r.pagamento}` : '',
    r.validade ? `Válido até: ${fmtDate(r.validade)}` : '',
    s.rodape ? '\n' + s.rodape : '',
  ].filter(x => x !== '');
  const text = lines.join('\n');
  let phone = String(c.telefone || '').replace(/\D/g, '');
  if (phone && phone.length <= 11) phone = '55' + phone;
  openExternal(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
}

function chargeDialog(ent, r, total) {
  sheet({
    title: 'Gerar cobrança',
    body: `<form class="form" data-f>
      <p class="dlg-msg">Gera parcelas em <b>Cobrança</b> para ${esc(clientName(r.clienteId))}, total ${money(total)}.</p>
      <div class="row2">
        <div class="field"><label>Parcelas</label><input class="input" type="number" name="n" min="1" max="48" value="1"></div>
        <div class="field"><label>1º vencimento</label><input class="input" type="date" name="venc" value="${todayISO()}"></div>
      </div>
      <div class="field"><label>Forma de pagamento</label><select class="input" name="forma">${PAGAMENTOS.map(p => `<option value="${p}" ${p === r.pagamento ? 'selected' : ''}>${p || 'Não informado'}</option>`).join('')}</select></div>
      <button class="btn primary block lg" type="submit">GERAR</button></form>`,
    onMount(el, api) {
      el.querySelector('[data-f]').onsubmit = e => {
        e.preventDefault();
        const v = formValues(e.target);
        const n = Math.max(1, Math.min(48, Number(v.n) || 1));
        const cents = Math.round(total * 100);
        const base = Math.floor(cents / n);
        for (let i = 0; i < n; i++) {
          const val = (i === n - 1 ? cents - base * (n - 1) : base) / 100;
          Store.put('cobrancas', {
            descricao: `${REC[ent].singular} ${recNumber(ent, r)}${n > 1 ? ` — parcela ${i + 1}/${n}` : ''}`,
            clienteId: r.clienteId, valor: val, vencimento: addMonths(v.venc || todayISO(), i), forma: v.forma,
            pago: false, pagoEm: '', obs: '', ref: recNumber(ent, r),
          });
        }
        api.close();
        toast(`${n} cobrança(s) gerada(s).`);
        location.hash = '#/list/cobrancas';
      };
    },
  });
}
