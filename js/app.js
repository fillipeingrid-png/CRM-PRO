/* Shell do app: roteador, barra superior, menu lateral e navegação inferior */
const APP_VERSION = '1.1.0';
let navDepth = 0;

const DRAWER = [
  [null, [['Início', 'home', '#/home'], ['Clientes', 'people', '#/list/clientes'], ['Agendamentos', 'calendar', '#/list/agendamentos']]],
  ['VENDAS', [['Pedidos', 'ticket', '#/list/pedidos'], ['Orçamentos', 'doc', '#/list/orcamentos'], ['Vendas', 'payments', '#/list/vendas'], ['Cobrança', 'money', '#/list/cobrancas'], ['Relatórios', 'chart', '#/reports']]],
  ['CADASTROS', [['Produtos', 'tag', '#/list/produtos'], ['Serviços', 'list', '#/list/servicos'], ['Usuários', 'users', '#/list/usuarios']]],
  ['CONTA', [['Painel do Gestor', 'eye', '#/activity', '', true], ['Plano PRO', 'star', '#/plan', 'gold'], ['Personalizar Documentos', 'doc', '#/docs'], ['Alterar senha', 'lock', '#/password'], ['Configurações', 'wrench', '#/settings']]],
];

function resolvePage() {
  const [p, a, b] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  switch (p) {
    case 'home': return homePage();
    case 'menu': return menuPage();
    case 'list': return listPage(a);
    case 'form': return entityFormPage(a, b);
    case 'doc': return REC[a] ? docPage(a, b) : notFound();
    case 'reports': return reportsPage();
    case 'settings': return settingsPage();
    case 'docs': return docsPage();
    case 'plan': return planPage();
    case 'web': return webPage();
    case 'password': return passwordPage();
    case 'activity': return activityPage();
    default: return notFound();
  }
}

function render() {
  closeDrawer();
  $('#overlays').innerHTML = '';
  if (!Store.user()) return authScreen();
  document.body.classList.remove('auth');
  const page = resolvePage();
  const top = $('#topbar');

  if (page.main) {
    top.className = 'topbar';
    top.innerHTML = `
      <button class="icon-btn" data-open-drawer aria-label="Abrir menu">${icon('menu')}</button>
      <h1 class="brand">CRM PRO</h1>
      ${page.refresh ? `<button class="icon-btn" data-refresh aria-label="Atualizar">${icon('refresh')}</button>` : ''}
      <button class="icon-btn" data-kebab aria-label="Mais opções">${icon('more')}</button>`;
  } else {
    top.className = 'topbar sub' + (page.tabs ? ' with-tabs' : '');
    top.innerHTML = `
      <div class="top-row">
        <button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button>
        ${page.icon ? `<span class="circle glass">${icon(page.icon)}</span>` : ''}
        <h1 class="ell">${esc(page.title)}</h1>
        <div class="top-actions">${page.actions || ''}</div>
      </div>
      ${page.tabs ? `<div class="tabs">${page.tabs.map(t => t.active ? `<span class="tab on">${t.l}</span>` : `<a class="tab" href="${t.href}" data-replace>${t.l}</a>`).join('')}</div>` : ''}`;
  }

  const view = $('#view');
  view.className = 'view' + (page.main ? '' : ' sub');
  view.innerHTML = page.body;
  window.scrollTo(0, 0);

  const nav = $('#bottomnav');
  nav.hidden = !page.nav;
  if (page.nav) {
    nav.innerHTML = [['home', 'Home', 'home', '#/home'], ['menu', 'Menu', 'grid', '#/menu'], ['vendas', 'Vendas', 'receipt', '#/list/vendas']]
      .map(([k, l, ic, href]) => `<a href="${href}" class="${page.nav === k ? 'on' : ''}" ${page.nav === k ? 'aria-current="page"' : ''}><span class="pill">${icon(ic)}</span>${l}</a>`).join('');
  }
  document.body.classList.toggle('has-nav', !!page.nav);

  top.querySelector('[data-open-drawer]')?.addEventListener('click', openDrawer);
  top.querySelector('[data-refresh]')?.addEventListener('click', () => { render(); toast('Atualizado.'); });
  top.querySelector('[data-kebab]')?.addEventListener('click', kebab);
  top.querySelector('[data-back]')?.addEventListener('click', () => {
    if (page.backTo) location.hash = page.backTo;
    else if (navDepth > 1) history.back();
    else location.hash = '#/menu';
  });
  top.querySelectorAll('[data-replace]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); location.replace(a.getAttribute('href')); }));
  top.querySelector('[data-del]')?.addEventListener('click', () => page.onAction?.('del'));
  page.mount?.(view);
}

/* ---------- Menu lateral ---------- */
function openDrawer() {
  const u = Store.user();
  const cur = location.hash || '#/home';
  $('#drawer .drawer-panel').innerHTML = `
    <div class="drawer-head"><span class="avatar">${esc((u.nome || '?')[0].toUpperCase())}</span><b>${esc(u.nome)}</b><small>${esc(u.email)}</small></div>
    <nav class="drawer-list">${DRAWER.map(([sec, items]) => `${sec ? `<h4>${sec}</h4>` : ''}${items.filter(i => !i[4] || isManager()).map(([l, ic, href, tone]) => `<a href="${href}" class="${cur === href ? 'on' : ''} ${tone || ''}">${icon(ic)}<span>${l}</span></a>`).join('')}`).join('')}</nav>
    <div class="drawer-foot"><button class="logout" data-logout>${icon('logout')}<span>Sair da conta</span></button><small>Versão ${APP_VERSION}</small></div>`;
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#drawer [data-logout]').onclick = logout;
}
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); }

async function logout() {
  closeDrawer();
  if (!await confirmDlg('Deseja sair da conta?', { ok: 'Sair' })) return;
  Audit.add('saiu', 'Saiu do app');
  Store.logout(); location.hash = '#/home'; render();
}

function kebab() {
  sheet({
    title: 'Opções',
    body: `<div class="menu-list">
      <a href="#/settings">${icon('wrench')} Configurações</a>
      <button data-exp>${icon('download')} Exportar backup</button>
      <a href="#/web">${icon('computer')} Versão Web / Instalar</a>
      <button data-out class="danger">${icon('logout')} Sair da conta</button></div>`,
    onMount(el, api) {
      el.querySelector('[data-exp]').onclick = () => { Audit.add('backup', 'Exportou backup dos dados'); download(`crm-pro-backup-${todayISO()}.json`, Store.exportJSON()); api.close(); toast('Backup exportado.'); };
      el.querySelector('[data-out]').onclick = () => { api.close(); logout(); };
    },
  });
}

/* ---------- Inicialização ---------- */
function boot() { Store.load(); render(); }
$('#drawer').addEventListener('click', e => { if (e.target.closest('[data-close-drawer]') || e.target.closest('.drawer-list a')) closeDrawer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); $$('.sheet-wrap [data-x]').pop()?.click(); } });
window.addEventListener('hashchange', () => { navDepth++; render(); });
window.addEventListener('storage', e => { if (e.key === Store.KEY) { Store.load(); render(); } });
if (!location.hash) history.replaceState(null, '', '#/home');
navDepth = 1;
boot();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
