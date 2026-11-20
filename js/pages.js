/* Telas */
function notFound() {
  return { title: 'Não encontrado', back: true, body: `<div class="empty">${icon('info')}<p>Registro não encontrado.</p><a class="btn primary" href="#/home">Voltar ao início</a></div>` };
}

function fieldHTML(f, v) {
  const val = v ?? (f.def ? f.def() : '');
  const id = 'f_' + f.k;
  const lab = `<label for="${id}">${esc(f.l)}${f.req ? ' *' : ''}</label>`;
  let inp;
  switch (f.type) {
    case 'textarea': inp = `<textarea class="input" id="${id}" name="${f.k}" rows="3" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`; break;
    case 'select': inp = `<select class="input" id="${id}" name="${f.k}">${f.opts.map(o => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(o || 'Não informado')}</option>`).join('')}</select>`; break;
    case 'money': inp = `<input class="input" id="${id}" name="${f.k}" data-money inputmode="numeric" value="${money(val)}">`; break;
    case 'check': return `<label class="check"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}><span>${esc(f.l)}</span></label>`;
    case 'client': inp = `<input type="hidden" name="${f.k}" value="${esc(val)}"><button type="button" class="input picker" id="${id}" data-client-pick><span class="${val ? '' : 'ph'}">${esc(clientName(val) || 'Selecione o cliente')}</span>${icon('search')}</button>`; break;
    case 'number': inp = `<input class="input" id="${id}" name="${f.k}" type="number" step="any" inputmode="decimal" value="${esc(val)}" placeholder="${esc(f.ph || '')}">`; break;
    default: inp = `<input class="input" id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${f.type === 'password' ? '' : esc(val)}" placeholder="${esc(f.ph || '')}" ${f.type === 'password' ? 'autocomplete="new-password"' : ''}>`;
  }
  return `<div class="field ${f.half ? 'half' : ''}">${lab}${inp}</div>`;
}

/* ---------- Início ---------- */
function homePage() {
  const u = Store.user();
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const ym = todayISO().slice(0, 7);
  const monthTotal = Object.keys(REC).flatMap(c => Store.all(c)).filter(r => r.data?.startsWith(ym) && !isCancelled(r)).reduce((s, r) => s + recTotals(r).total, 0);
  const agHoje = Store.all('agendamentos').filter(a => a.data === todayISO() && a.situacao !== 'Cancelado').length;
  const pedPend = Store.all('pedidos').filter(p => ['Pendente', 'Em Andamento'].includes(p.situacao)).length;
  const orcPend = Store.all('orcamentos').filter(p => p.situacao === 'Pendente').length;
  const cli = Store.all('clientes').length;
  const vencidas = Store.all('cobrancas').filter(x => cobrancaStatus(x) === 'Vencida');
  const proximos = Store.all('agendamentos').filter(a => a.data >= todayISO() && !['Cancelado', 'Concluído'].includes(a.situacao)).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || ''))).slice(0, 3);
  const recentes = Object.keys(REC).flatMap(c => Store.all(c).map(r => ({ ...r, _ent: c }))).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')).slice(0, 4);

  const stat = (n, label, ic, tone, href) => `<a class="stat card" href="${href}"><span class="circle ${tone}">${icon(ic)}</span><div><b>${n}</b><span>${label}</span></div></a>`;
  const quick = (l, ic, tone, href) => `<a class="quick" href="${href}"><span class="circle xl ${tone}">${icon(ic)}</span><span>${l}</span></a>`;

  return {
    main: true, nav: 'home', refresh: true,
    body: `
      <div class="hello"><h1>${greet}, ${esc(u.nome)}</h1><p>${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]}</p></div>
      <a class="hero-card" href="#/reports">
        <span class="circle glass">${icon('money')}</span>
        <div><small>VENDAS/PEDIDOS/ORÇAM. NO MÊS (${ym.slice(5)}/${ym.slice(0, 4)})</small><strong>${money(monthTotal)}</strong></div>
        ${icon('chevron', 'go')}
      </a>
      <div class="stats">
        ${stat(agHoje, 'Agendamentos para hoje', 'event', 'blue', '#/list/agendamentos')}
        ${stat(pedPend, 'Pedidos pendentes', 'ticket', 'amber', '#/list/pedidos')}
        ${stat(orcPend, 'Orçamentos pendentes', 'doc', 'purple', '#/list/orcamentos')}
        ${stat(cli, 'Clientes cadastrados', 'people', 'slate', '#/list/clientes')}
      </div>
      ${vencidas.length ? `<a class="alert card" href="#/list/cobrancas">${icon('info')}<span><b>${vencidas.length} cobrança(s) vencida(s)</b> somando ${money(vencidas.reduce((s, x) => s + x.valor, 0))}</span>${icon('chevron')}</a>` : ''}
      <section class="card pad">
        <h3 class="card-h caps">Ações rápidas</h3>
        <div class="quicks">
          ${quick('Nova venda', 'store', 'green', '#/form/vendas')}
          ${quick('Novo pedido', 'receipt', 'orange', '#/form/pedidos')}
          ${quick('Novo cliente', 'personAdd', 'blue', '#/form/clientes')}
          ${quick('Novo agend.', 'event', 'purple', '#/form/agendamentos')}
        </div>
      </section>
      ${proximos.length ? `<section class="card pad"><h3 class="card-h caps">Próximos agendamentos</h3>
        ${proximos.map(a => `<a class="mini-row" href="#/form/agendamentos/${a.id}"><span class="date-pill"><b>${a.data.slice(8, 10)}</b>${MESES[+a.data.slice(5, 7) - 1].slice(0, 3)}</span><div><strong>${esc(a.titulo)}</strong><small>${esc(a.hora || '')} ${esc(clientName(a.clienteId))}</small></div>${badge(a.situacao)}</a>`).join('')}</section>` : ''}
      ${recentes.length ? `<section class="card pad"><h3 class="card-h caps">Últimos registros</h3>
        ${recentes.map(r => `<a class="mini-row" href="#/doc/${r._ent}/${r.id}"><span class="circle sm green">${icon(REC[r._ent].icon)}</span><div><strong>${REC[r._ent].singular} ${recNumber(r._ent, r)}</strong><small>${esc(clientName(r.clienteId))} · ${money(recTotals(r).total)}</small></div>${badge(r.situacao)}</a>`).join('')}</section>` : ''}
    `,
  };
}

/* ---------- Menu ---------- */
const MENU = [
  ['CADASTROS', [['Clientes', 'people', '#/list/clientes', 'blue'], ['Produtos', 'tag', '#/list/produtos', 'blue'], ['Serviços', 'list', '#/list/servicos', 'blue'], ['Usuários', 'users', '#/list/usuarios', 'blue']]],
  ['OPERAÇÃO', [['Pedidos', 'ticket', '#/list/pedidos', 'green'], ['Orçamentos', 'doc', '#/list/orcamentos', 'green'], ['Vendas', 'payments', '#/list/vendas', 'green'], ['Agendamentos', 'calendar', '#/list/agendamentos', 'green']]],
  ['FINANCEIRO', [['Cobrança', 'money', '#/list/cobrancas', 'orange'], ['Relatórios', 'chart', '#/reports', 'orange']]],
  ['CONTA E CONFIGURAÇÕES', [['Plano PRO', 'star', '#/plan', 'gold'], ['Personalizar Documentos', 'doc', '#/docs', 'slate'], ['Versão Web', 'computer', '#/web', 'slate'], ['Configurações', 'wrench', '#/settings', 'slate']]],
];
function menuPage() {
  return {
    main: true, nav: 'menu',
    body: MENU.map(([sec, items]) => `<h3 class="sec">${sec}</h3><div class="tiles">${items.map(([l, ic, href, tone]) => `
      <a class="tile card ${tone === 'gold' ? 'gold' : ''}" href="${href}"><span class="circle xl ${tone}">${icon(ic)}</span><span>${l}</span></a>`).join('')}</div>`).join(''),
  };
}

/* ---------- Lista genérica ---------- */
const listState = {};
function listPage(ent) {
  const isRec = !!REC[ent];
  const D = REC[ent] || ENT[ent];
  if (!D) return notFound();
  const ls = (listState[ent] ||= { q: '', f: '' });
  const statuses = D.status || [];

  const card = x => {
    if (isRec) {
      return `<div class="rcard card" data-open="#/doc/${ent}/${x.id}">
        <span class="circle lg">${icon(D.icon)}</span>
        <div class="rbody"><strong>${recNumber(ent, x)}</strong>
          <span>Data: ${fmtDate(x.data)}</span><span class="ell">Cliente: ${esc(clientName(x.clienteId))}</span>
          <span>Valor: ${money(recTotals(x).total)}</span><span>Funcionário: ${esc(x.funcionario || '—')}</span>
          <span class="badge-solid ${statusTone(x.situacao)}">${esc(x.situacao)}</span></div>
        <a class="icon-btn soft" href="#/form/${ent}/${x.id}" aria-label="Editar">${icon('edit')}</a></div>`;
    }
    return `<div class="rcard card" data-open="#/form/${ent}/${x.id}">
      <span class="circle lg">${icon(D.icon)}</span>
      <div class="rbody"><strong class="ell">${esc(D.title(x))}</strong>${D.lines(x).map(l => `<span class="ell">${esc(l)}</span>`).join('')}
        ${D.badge ? `<span class="badge-solid ${statusTone(D.badge(x))}">${esc(D.badge(x))}</span>` : ''}</div>
      ${ent === 'clientes' && x.telefone ? `<a class="icon-btn soft" href="tel:${esc(x.telefone.replace(/[^\d+]/g, ''))}" aria-label="Ligar">${icon('phone')}</a>` : `<a class="icon-btn soft" href="#/form/${ent}/${x.id}" aria-label="Editar">${icon('edit')}</a>`}</div>`;
  };

  const filtered = () => {
    const q = norm(ls.q);
    let arr = Store.all(ent).slice();
    if (isRec) {
      arr = arr.filter(x => !q || norm(recNumber(ent, x) + ' ' + x.numero + ' ' + clientName(x.clienteId)).includes(q));
      if (ls.f) arr = arr.filter(x => x.situacao === ls.f);
      arr.sort((a, b) => (b.data + String(b.numero).padStart(9, '0')).localeCompare(a.data + String(a.numero).padStart(9, '0')));
    } else {
      arr = arr.filter(x => !q || norm(D.search(x)).includes(q));
      if (ls.f) arr = arr.filter(x => D.badge(x) === ls.f);
      arr.sort(D.sort);
    }
    return arr;
  };

  const summary = arr => {
    if (isRec) return `${arr.length} registro(s) · ${money(arr.filter(r => !isCancelled(r)).reduce((s, r) => s + recTotals(r).total, 0))}`;
    if (ent === 'cobrancas') {
      const ab = arr.filter(x => !x.pago).reduce((s, x) => s + x.valor, 0), pg = arr.filter(x => x.pago).reduce((s, x) => s + x.valor, 0);
      return `Em aberto: <b>${money(ab)}</b> · Recebido: <b>${money(pg)}</b>`;
    }
    return `${arr.length} registro(s)`;
  };

  return {
    title: D.label, back: ent !== 'vendas', main: ent === 'vendas', nav: ent === 'vendas' ? 'vendas' : null, icon: D.icon,
    body: `
      <div class="search-row">
        <label class="search">${icon('search')}<input type="search" data-q placeholder="${isRec ? 'Nº do registro ou cliente' : 'Pesquisar ' + D.label.toLowerCase()}" value="${esc(ls.q)}" autocomplete="off"><button class="clear" data-clear aria-label="Limpar">${icon('cancel')}</button></label>
        <a class="fab-sq" href="#/form/${ent}" aria-label="Novo">${icon('add')}</a>
      </div>
      ${statuses.length ? `<div class="chips" data-chips><button class="chip" data-s="">Todos</button>${statuses.map(s => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
      <p class="list-sum" data-sum></p>
      <div class="rlist" data-list></div>`,
    mount(root) {
      const q = root.querySelector('[data-q]');
      const draw = () => {
        const arr = filtered();
        root.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === ls.f));
        root.querySelector('[data-sum]').innerHTML = summary(arr);
        root.querySelector('[data-list]').innerHTML = arr.length ? arr.map(card).join('') : `<div class="empty">${icon(D.icon)}<p>${ls.q || ls.f ? 'Nada encontrado com esse filtro.' : `Nenhum registro em ${D.label.toLowerCase()} ainda.`}</p><a class="btn primary" href="#/form/${ent}">${icon('add')} Adicionar</a></div>`;
      };
      q.oninput = () => { ls.q = q.value; draw(); };
      root.querySelector('[data-clear]').onclick = e => { e.preventDefault(); q.value = ''; ls.q = ''; draw(); q.focus(); };
      root.querySelector('[data-chips]')?.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { ls.f = b.dataset.s; draw(); } });
      root.querySelector('[data-list]').addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const c = e.target.closest('[data-open]'); if (c) location.hash = c.dataset.open;
      });
      draw();
    },
  };
}

/* ---------- Formulário genérico ---------- */
function entityFormPage(ent, id) {
  if (REC[ent]) return recordFormPage(ent, id);
  const D = ENT[ent];
  if (!D) return notFound();
  const x = id ? Store.get(ent, id) : null;
  if (id && !x) return notFound();
  const me = Store.user();
  if (ent === 'usuarios' && me.papel !== 'Administrador' && (!x || x.id !== me.id)) {
    return { title: 'Usuários', back: true, body: `<div class="empty">${icon('lock')}<p>Somente administradores podem cadastrar ou editar outros usuários.</p></div>` };
  }
  const fields = D.fields.filter(f => !(ent === 'usuarios' && f.k === 'senha' && x));

  return {
    title: D.singular, back: true, icon: D.icon,
    tabs: [{ l: 'Cadastro', active: true }],
    actions: x && !(ent === 'usuarios' && x.id === me.id) ? `<button class="icon-btn" data-del aria-label="Excluir">${icon('delete')}</button>` : '',
    body: `<form class="form card pad" data-f novalidate>
        <div class="fgrid">${fields.map(f => fieldHTML(f, x ? x[f.k] : undefined)).join('')}</div>
        ${ent === 'usuarios' && x ? `<p class="hint">Para trocar a senha, o próprio usuário usa “Alterar senha” no menu lateral.</p>` : ''}
      </form>
      ${ent === 'clientes' && x ? clientHistory(x) : ''}
      <div class="sticky-actions"><button class="btn primary block xl" data-save>${x ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR'}</button></div>`,
    mount(root) {
      bindMoney(root);
      const form = root.querySelector('[data-f]');
      root.querySelector('[data-client-pick]')?.addEventListener('click', async e => {
        const btn = e.currentTarget;
        const c = await pick('clientes');
        if (c) { form.clienteId.value = c.id; btn.querySelector('span').textContent = c.nome; btn.querySelector('span').className = ''; }
      });
      root.querySelector('[data-save]').onclick = async () => {
        let v = formValues(form);
        for (const f of fields) if (f.req && (v[f.k] === '' || v[f.k] == null || (f.type === 'money' && !v[f.k]))) return toast(`Preencha: ${f.l}`, 'err');
        if (ent === 'usuarios') {
          const dup = Store.all('usuarios').find(u => norm(u.email) === norm(v.email) && u.id !== x?.id);
          if (dup) return toast('Já existe um usuário com esse e-mail.', 'err');
          if (!x) {
            if ((v.senha || '').length < 4) return toast('A senha precisa ter ao menos 4 caracteres.', 'err');
            v.senhaHash = await hashPass(v.email, v.senha);
          } else if (norm(v.email) !== norm(x.email)) {
            return toast('Para trocar o e-mail de login, crie um novo usuário.', 'err');
          }
          delete v.senha;
        }
        if (D.beforeSave) v = D.beforeSave(v);
        if (x) v.id = x.id;
        Store.put(ent, v);
        toast(`${D.singular} ${x ? 'atualizado' : 'cadastrado'}!`);
        history.length > 1 ? history.back() : (location.hash = `#/list/${ent}`);
      };
    },
    onAction: async name => {
      if (name !== 'del') return;
      if (ent === 'clientes') {
        const used = Object.keys(REC).some(c => Store.all(c).some(r => r.clienteId === id));
        if (used && !await confirmDlg('Este cliente possui registros (vendas, pedidos ou orçamentos). Excluir mesmo assim? Os registros serão mantidos sem o nome do cliente.', { ok: 'Excluir', danger: true })) return;
        if (!used && !await confirmDlg(`Excluir ${D.singular.toLowerCase()} “${D.title(x)}”?`, { ok: 'Excluir', danger: true })) return;
      } else if (!await confirmDlg(`Excluir ${D.singular.toLowerCase()} “${D.title(x)}”?`, { ok: 'Excluir', danger: true })) return;
      Store.del(ent, id);
      toast('Excluído.');
      location.hash = `#/list/${ent}`;
    },
  };
}

function clientHistory(c) {
  const recs = Object.keys(REC).flatMap(e => Store.all(e).filter(r => r.clienteId === c.id).map(r => ({ ...r, _ent: e }))).sort((a, b) => b.data.localeCompare(a.data));
  const total = recs.filter(r => r._ent !== 'orcamentos' && !isCancelled(r)).reduce((s, r) => s + recTotals(r).total, 0);
  const aberto = Store.all('cobrancas').filter(x => x.clienteId === c.id && !x.pago).reduce((s, x) => s + x.valor, 0);
  return `<section class="card pad">
    <h3 class="card-h caps">Histórico do cliente</h3>
    <div class="kpis two"><div class="kpi"><span>Total comprado</span><b>${money(total)}</b></div><div class="kpi"><span>Em aberto</span><b class="${aberto ? 'neg' : ''}">${money(aberto)}</b></div></div>
    ${recs.length ? recs.slice(0, 10).map(r => `<a class="mini-row" href="#/doc/${r._ent}/${r.id}"><span class="circle sm green">${icon(REC[r._ent].icon)}</span><div><strong>${REC[r._ent].singular} ${recNumber(r._ent, r)}</strong><small>${fmtDate(r.data)} · ${money(recTotals(r).total)}</small></div>${badge(r.situacao)}</a>`).join('') : '<p class="empty-sm">Nenhuma venda, pedido ou orçamento ainda.</p>'}
    ${c.telefone ? `<a class="btn green block" target="_blank" rel="noopener" href="https://wa.me/${(c.telefone.replace(/\D/g, '').length <= 11 ? '55' : '') + c.telefone.replace(/\D/g, '')}">${icon('share')} Conversar no WhatsApp</a>` : ''}
  </section>`;
}

/* ---------- Personalizar documentos ---------- */
function docsPage() {
  const s = Store.d.settings;
  return {
    title: 'Personalizar Documentos', back: true, icon: 'doc',
    body: `<form class="form card pad" data-f>
      <p class="hint">Esses dados aparecem no cabeçalho e rodapé de vendas, pedidos e orçamentos impressos ou compartilhados.</p>
      <div class="logo-row">
        <div class="logo-box" data-logo>${s.logo ? `<img src="${s.logo}" alt="Logo">` : icon('upload')}</div>
        <div><label class="btn outline">${icon('upload')} Enviar logo<input type="file" accept="image/*" hidden data-file></label>
        ${s.logo ? `<button type="button" class="btn ghost" data-rmlogo>Remover</button>` : ''}</div>
      </div>
      <div class="fgrid">
        ${fieldHTML({ k: 'empresa', l: 'Nome da empresa' }, s.empresa)}
        ${fieldHTML({ k: 'documento', l: 'CNPJ / CPF', half: true }, s.documento)}
        ${fieldHTML({ k: 'telefone', l: 'Telefone', type: 'tel', half: true }, s.telefone)}
        ${fieldHTML({ k: 'email', l: 'E-mail', type: 'email' }, s.email)}
        ${fieldHTML({ k: 'endereco', l: 'Endereço', type: 'textarea' }, s.endereco)}
        ${fieldHTML({ k: 'rodape', l: 'Texto do rodapé', type: 'textarea' }, s.rodape)}
        ${fieldHTML({ k: 'validade', l: 'Validade padrão do orçamento (dias)', type: 'number', half: true }, s.validade)}
        <div class="field half"><label for="f_cor">Cor do documento</label><input class="input color" id="f_cor" type="color" name="cor" value="${esc(s.cor || '#1565c0')}"></div>
        ${fieldHTML({ k: 'mostrarAssinatura', l: 'Mostrar linha de assinatura do cliente', type: 'check' }, s.mostrarAssinatura)}
      </div>
    </form>
    <div class="sticky-actions"><button class="btn primary block xl" data-save>SALVAR</button></div>`,
    mount(root) {
      root.querySelector('[data-file]').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try { Store.d.settings.logo = await resizeImage(f); Store.save(); toast('Logo atualizada.'); render(); } catch { toast('Não foi possível ler a imagem.', 'err'); }
      };
      root.querySelector('[data-rmlogo]')?.addEventListener('click', () => { Store.d.settings.logo = ''; Store.save(); render(); });
      root.querySelector('[data-save]').onclick = () => {
        Object.assign(Store.d.settings, formValues(root.querySelector('[data-f]')));
        Store.save(); toast('Documentos personalizados!');
      };
    },
  };
}

/* ---------- Configurações ---------- */
function settingsPage() {
  const counts = ['clientes', 'produtos', 'servicos', 'vendas', 'pedidos', 'orcamentos', 'agendamentos', 'cobrancas'].map(c => `${(REC[c] || ENT[c]).label}: ${Store.all(c).length}`).join(' · ');
  const isAdmin = Store.user().papel === 'Administrador';
  return {
    title: 'Configurações', back: true, icon: 'wrench',
    body: `
      <section class="card pad"><h3 class="card-h">Backup dos dados</h3>
        <p class="hint">Os dados ficam salvos <b>neste aparelho</b>. Faça backups com frequência e use o arquivo para restaurar ou levar para outro aparelho.</p>
        <p class="hint small">${counts}</p>
        ${EMBEDDED ? '<p class="hint small"><b>Modo de teste:</b> nesta página de teste o download do backup pode não funcionar. Na versão publicada do site ele funciona normalmente.</p>' : ''}
        <div class="btn-col">
          <button class="btn primary" data-exp>${icon('download')} Exportar backup</button>
          <label class="btn outline">${icon('upload')} Restaurar backup<input type="file" accept=".json,application/json" hidden data-imp></label>
        </div></section>
      <section class="card pad"><h3 class="card-h">Dados de exemplo</h3>
        <p class="hint">Cria clientes, produtos, serviços e algumas vendas para testar o app.</p>
        <button class="btn outline block" data-demo>${icon('add')} Carregar dados de exemplo</button></section>
      ${isAdmin ? `<section class="card pad"><h3 class="card-h">Zona de perigo</h3>
        <p class="hint">Apaga todos os dados deste aparelho, inclusive usuários.</p>
        <button class="btn danger block" data-reset>${icon('delete')} Apagar todos os dados</button></section>` : ''}
      <section class="card pad"><h3 class="card-h">Sobre</h3><p class="hint">CRM PRO · versão ${APP_VERSION}<br>App offline (PWA). Funciona sem internet depois de aberto a primeira vez.</p></section>`,
    mount(root) {
      root.querySelector('[data-exp]').onclick = () => { download(`crm-pro-backup-${todayISO()}.json`, Store.exportJSON()); toast('Backup exportado.'); };
      root.querySelector('[data-imp]').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        if (!await confirmDlg('Restaurar o backup substitui TODOS os dados atuais. Continuar?', { ok: 'Restaurar', danger: true })) return;
        try { Store.importJSON(await f.text()); toast('Backup restaurado!'); if (!Store.user()) Store.logout(); boot(); }
        catch (err) { toast('Arquivo inválido: ' + err.message, 'err'); }
      };
      root.querySelector('[data-demo]').onclick = async () => {
        if (!await confirmDlg('Adicionar dados de exemplo aos dados atuais?')) return;
        loadDemo(); toast('Dados de exemplo criados!'); location.hash = '#/home';
      };
      root.querySelector('[data-reset]')?.addEventListener('click', async () => {
        if (!await confirmDlg('Tem certeza? Esta ação não pode ser desfeita. Exporte um backup antes.', { ok: 'Apagar tudo', danger: true })) return;
        Store.reset(); Store.logout(); boot();
      });
    },
  };
}

function loadDemo() {
  const cli = [['Alan Síndico do Condomínio Solar', '(11) 98888-1111'], ['Beatriz Lima', '(11) 97777-2222'], ['Mercado Bom Preço LTDA', '(11) 3333-4444'], ['Carlos Souza', '(21) 96666-5555'], ['Daniela Rocha', '(31) 95555-6666']]
    .map(([nome, telefone]) => Store.put('clientes', { nome, telefone, email: '', documento: '', endereco: '', obs: '' }));
  const prod = [['Roteador Wi-Fi AC1200', 249.9, 15], ['Cabo de rede Cat6 (metro)', 3.5, 300], ['Conector RJ45', 1.2, 500], ['Switch 8 portas', 179, 6]]
    .map(([nome, preco, estoque], i) => Store.put('produtos', { nome, preco, custo: +(preco * 0.6).toFixed(2), estoque, unidade: i === 1 ? 'M' : 'UN', codigo: 'P' + (100 + i), descricao: '' }));
  const serv = [['Plano Internet 300 Mega (mensal)', 89.9], ['Instalação', 120], ['Visita técnica', 80]]
    .map(([nome, preco]) => Store.put('servicos', { nome, preco, duracao: '', descricao: '' }));
  const u = Store.user();
  const mk = (ent, daysAgo, c, itens, situacao, extra = {}) => {
    const r = Store.put(ent, { data: addDays(todayISO(), -daysAgo), clienteId: c.id, situacao, obs: '', itens, desconto: 0, acrescimo: 0, pagamento: 'PIX', numero: Store.next(ent), funcionario: u.nome, funcionarioId: u.id, validade: ent === 'orcamentos' ? addDays(todayISO(), 7) : '', ...extra });
    r.total = recTotals(r).total; Store.save(); applyStock(ent, r);
  };
  const it = (x, tipo, qtd) => ({ tipo, refId: x.id, nome: x.nome, unidade: x.unidade || '', qtd, valor: x.preco });
  mk('vendas', 0, cli[0], [it(serv[0], 'servico', 1)], 'Em Andamento');
  mk('vendas', 2, cli[1], [it(prod[0], 'produto', 1), it(serv[1], 'servico', 1)], 'Concluída');
  mk('vendas', 5, cli[2], [it(prod[3], 'produto', 2), it(prod[1], 'produto', 40), it(prod[2], 'produto', 20)], 'Concluída', { desconto: 20 });
  mk('vendas', 9, cli[3], [it(serv[2], 'servico', 1)], 'Cancelada');
  mk('pedidos', 1, cli[4], [it(prod[0], 'produto', 2)], 'Pendente');
  mk('orcamentos', 0, cli[2], [it(prod[3], 'produto', 3), it(serv[1], 'servico', 3)], 'Pendente');
  Store.put('agendamentos', { titulo: 'Instalação de internet', clienteId: cli[1].id, data: todayISO(), hora: '14:00', situacao: 'Agendado', obs: '' });
  Store.put('agendamentos', { titulo: 'Visita técnica', clienteId: cli[3].id, data: addDays(todayISO(), 2), hora: '09:30', situacao: 'Confirmado', obs: '' });
  Store.put('cobrancas', { descricao: 'Mensalidade internet', clienteId: cli[0].id, valor: 89.9, vencimento: addDays(todayISO(), -3), forma: 'PIX', pago: false, pagoEm: '', obs: '' });
  Store.put('cobrancas', { descricao: 'Mensalidade internet', clienteId: cli[1].id, valor: 89.9, vencimento: addDays(todayISO(), 10), forma: 'Boleto', pago: false, pagoEm: '', obs: '' });
  Store.put('cobrancas', { descricao: 'Instalação', clienteId: cli[1].id, valor: 120, vencimento: addDays(todayISO(), -2), forma: 'PIX', pago: true, pagoEm: addDays(todayISO(), -2), obs: '' });
}

/* ---------- Plano PRO ---------- */
function planPage() {
  const feats = ['Clientes, produtos e serviços ilimitados', 'Vendas, pedidos e orçamentos com PDF', 'Envio de documentos pelo WhatsApp', 'Agendamentos e cobranças com parcelas', 'Relatórios de faturamento e exportação CSV', 'Vários usuários / vendedores', 'Logo e cores personalizadas', 'Backup e restauração dos dados'];
  return {
    title: 'Plano PRO', back: true, icon: 'star',
    body: `<div class="plan card">
      <span class="circle xl gold">${icon('star')}</span>
      <h2>Plano PRO ativo</h2>
      <p>Todos os recursos estão liberados nesta instalação.</p>
      <ul>${feats.map(f => `<li>${icon('check')}${f}</li>`).join('')}</ul>
    </div>`,
  };
}

/* ---------- Versão Web ---------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
function webPage() {
  return {
    title: 'Versão Web', back: true, icon: 'computer',
    body: `<section class="card pad">
      <h3 class="card-h">Use no computador ou instale no celular</h3>
      <p class="hint">Este app roda direto no navegador. Abra o mesmo endereço no computador para usar em tela grande.</p>
      <div class="url-box"><code>${esc(location.origin + location.pathname)}</code><button class="icon-btn soft" data-copy aria-label="Copiar endereço">${icon('copy')}</button></div>
      <button class="btn primary block" data-install ${installPrompt ? '' : 'hidden'}>${icon('download')} Instalar aplicativo</button>
      <h4>Como instalar</h4>
      <ol class="steps"><li><b>Android (Chrome):</b> menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.</li>
      <li><b>iPhone (Safari):</b> botão Compartilhar → “Adicionar à Tela de Início”.</li>
      <li><b>Computador (Chrome/Edge):</b> ícone de instalar na barra de endereço.</li></ol>
      <p class="hint small">Atenção: os dados ficam em cada aparelho. Para levar seus dados para outro aparelho, use Configurações → Exportar/Restaurar backup.</p>
    </section>`,
    mount(root) {
      root.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname); toast('Endereço copiado!'); } catch { toast('Não foi possível copiar.', 'err'); } };
      root.querySelector('[data-install]').onclick = async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); };
    },
  };
}

/* ---------- Alterar senha ---------- */
function passwordPage() {
  return {
    title: 'Alterar senha', back: true, icon: 'lock',
    body: `<form class="form card pad" data-f>
      ${fieldHTML({ k: 'atual', l: 'Senha atual', type: 'password' })}
      ${fieldHTML({ k: 'nova', l: 'Nova senha', type: 'password', ph: 'Mínimo 4 caracteres' })}
      ${fieldHTML({ k: 'conf', l: 'Confirme a nova senha', type: 'password' })}
      <button class="btn primary block xl" type="submit">ALTERAR SENHA</button></form>`,
    mount(root) {
      root.querySelector('[data-f]').onsubmit = async e => {
        e.preventDefault();
        const v = formValues(e.target), u = Store.user();
        if (await hashPass(u.email, v.atual) !== u.senhaHash) return toast('Senha atual incorreta.', 'err');
        if (v.nova.length < 4) return toast('A nova senha precisa ter ao menos 4 caracteres.', 'err');
        if (v.nova !== v.conf) return toast('As senhas não conferem.', 'err');
        Store.put('usuarios', { id: u.id, senhaHash: await hashPass(u.email, v.nova) });
        toast('Senha alterada!'); location.hash = '#/home';
      };
    },
  };
}

/* ---------- Login / primeiro acesso ---------- */
function authScreen() {
  const first = Store.all('usuarios').length === 0;
  document.body.classList.add('auth');
  $('#topbar').innerHTML = ''; $('#bottomnav').hidden = true;
  $('#view').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-brand"><span class="auth-logo">${icon('receipt')}</span><h1>CRM PRO</h1><p>Clientes, vendas e cobranças na palma da mão</p></div>
      <form class="auth-card card" data-f novalidate>
        <h2>${first ? 'Criar sua conta' : 'Entrar'}</h2>
        ${first ? `<p class="hint">Primeiro acesso neste aparelho. Esta conta será o administrador.</p>${fieldHTML({ k: 'nome', l: 'Nome de usuário', ph: 'Como você quer ser chamado' })}${fieldHTML({ k: 'empresa', l: 'Nome da empresa (opcional)' })}` : ''}
        ${fieldHTML({ k: 'email', l: 'E-mail', type: 'email', ph: 'seu@email.com' })}
        ${fieldHTML({ k: 'senha', l: 'Senha', type: 'password', ph: first ? 'Mínimo 4 caracteres' : '' })}
        <button class="btn primary block xl" type="submit">${first ? 'CRIAR CONTA' : 'ENTRAR'}</button>
        ${first ? '' : `<p class="hint small center">Esqueceu a senha? Peça a um administrador para criar um novo usuário, ou restaure um backup em outro aparelho.</p>`}
      </form>
      <p class="auth-foot">Os dados ficam salvos somente neste aparelho.</p>
    </div>`;
  $('[data-f]').onsubmit = async e => {
    e.preventDefault();
    const v = formValues(e.target);
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return toast('Informe um e-mail válido.', 'err');
    if (first) {
      if (!v.nome) return toast('Informe o nome de usuário.', 'err');
      if (v.senha.length < 4) return toast('A senha precisa ter ao menos 4 caracteres.', 'err');
      const u = Store.put('usuarios', { nome: v.nome, email: v.email, papel: 'Administrador', senhaHash: await hashPass(v.email, v.senha) });
      if (v.empresa) { Store.d.settings.empresa = v.empresa; Store.d.settings.email = v.email; Store.save(); }
      Store.login(u);
    } else {
      const u = Store.all('usuarios').find(x => norm(x.email) === norm(v.email));
      if (!u || u.senhaHash !== await hashPass(v.email, v.senha)) return toast('E-mail ou senha incorretos.', 'err');
      Store.login(u);
    }
    document.body.classList.remove('auth');
    location.hash = '#/home';
    render();
  };
}
