/* Utilitários gerais */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function isoDate(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}
const todayISO = () => isoDate();
const fmtDate = iso => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
function addMonths(iso, n) { const d = new Date(iso + 'T12:00:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return isoDate(d); }
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

async function sha256(text) {
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (contexto não seguro): hash simples
  let h = 5381; for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return 'x' + (h >>> 0).toString(16);
}
const hashPass = (email, senha) => sha256('crmpro:' + norm(email) + ':' + senha);

/* Campos monetários: digita só números, formata como R$ */
function parseMoney(str) {
  const d = String(str ?? '').replace(/\D/g, '');
  return d ? Number(d) / 100 : 0;
}
function bindMoney(root = document) {
  $$('input[data-money]', root).forEach(inp => {
    if (inp._money) return; inp._money = true;
    inp.addEventListener('input', () => { inp.value = money(parseMoney(inp.value)); inp.setSelectionRange(inp.value.length, inp.value.length); });
    inp.addEventListener('focus', () => setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length)));
  });
}

let toastTimer;
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
}

/* Modal / bottom sheet genérico */
function sheet({ title, body = '', full = false, onMount }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet ${full ? 'full' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-x aria-label="Fechar">${icon('close')}</button></div>
      <div class="sheet-body">${body}</div>
    </div>`;
  $('#overlays').appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const api = {
    el: wrap,
    onClose: null,
    close(v) {
      if (closed) return; closed = true;
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 200);
      api.onClose && api.onClose(v);
    },
  };
  wrap.querySelector('.sheet-backdrop').onclick = () => api.close();
  wrap.querySelector('[data-x]').onclick = () => api.close();
  onMount && onMount(wrap, api);
  return api;
}

function confirmDlg(msg, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise(resolve => {
    const s = sheet({
      title: 'Confirmação',
      body: `<p class="dlg-msg">${esc(msg)}</p>
        <div class="dlg-actions"><button class="btn ghost" data-no>Cancelar</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button></div>`,
      onMount(el, api) {
        el.querySelector('[data-no]').onclick = () => api.close(false);
        el.querySelector('[data-yes]').onclick = () => api.close(true);
      },
    });
    s.onClose = v => resolve(!!v);
  });
}

/* Lê valores de um formulário pelo atributo name */
function formValues(form) {
  const o = {};
  $$('[name]', form).forEach(el => {
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.dataset.money !== undefined) o[el.name] = parseMoney(el.value);
    else if (el.type === 'number') o[el.name] = el.value === '' ? '' : Number(el.value);
    else o[el.name] = el.value.trim();
  });
  return o;
}

/* Redimensiona imagem para data URL (logo) */
function resizeImage(file, max = 360) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

function download(filename, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
