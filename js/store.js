/* Persistência local (localStorage). Todos os dados ficam no aparelho. */
const Store = {
  KEY: 'crmpro.data.v1',
  SESSION: 'crmpro.session',
  d: null,
  defaults() {
    return {
      usuarios: [], clientes: [], produtos: [], servicos: [],
      vendas: [], pedidos: [], orcamentos: [], agendamentos: [], cobrancas: [],
      seq: {}, log: [],
      settings: {
        empresa: '', documento: '', telefone: '', email: '', endereco: '',
        rodape: 'Obrigado pela preferência!', validade: 7, cor: '#1565c0', logo: '',
        mostrarAssinatura: true,
      },
    };
  },
  load() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch { raw = {}; }
    const def = this.defaults();
    this.d = Object.assign(def, raw);
    this.d.settings = Object.assign(def.settings, raw.settings || {});
    this.d.usuarios.forEach(u => { if (u.papel === 'Administrador') u.papel = 'Gestor'; });
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); return true; }
    catch (e) { toast('Não foi possível salvar: armazenamento cheio.', 'err'); return false; }
  },
  all(c) { return (this.d[c] ||= []); },
  get(c, id) { return this.all(c).find(x => x.id === id); },
  put(c, obj, { silent = false } = {}) {
    const arr = this.all(c);
    const now = new Date().toISOString();
    if (obj.id) {
      const i = arr.findIndex(x => x.id === obj.id);
      if (i >= 0) {
        const before = arr[i];
        arr[i] = { ...before, ...obj, atualizadoEm: now }; this.save();
        if (!silent) window.Audit?.onChange(c, 'editou', before, arr[i]);
        return arr[i];
      }
    }
    const o = { ...obj, id: obj.id || uid(), criadoEm: now, atualizadoEm: now };
    arr.push(o); this.save();
    if (!silent) window.Audit?.onChange(c, 'criou', null, o);
    return o;
  },
  del(c, id) {
    const before = this.get(c, id);
    this.d[c] = this.all(c).filter(x => x.id !== id); this.save();
    if (before) window.Audit?.onChange(c, 'excluiu', before, null);
  },
  next(key) { this.d.seq[key] = (this.d.seq[key] || 0) + 1; return this.d.seq[key]; },

  /* Sessão */
  user() { const id = localStorage.getItem(this.SESSION); return id ? this.get('usuarios', id) : null; },
  login(u) { localStorage.setItem(this.SESSION, u.id); },
  logout() { localStorage.removeItem(this.SESSION); },

  exportJSON() { return JSON.stringify({ app: 'crm-pro', versao: 1, exportadoEm: new Date().toISOString(), dados: this.d }, null, 2); },
  importJSON(text) {
    const j = JSON.parse(text);
    const dados = j.dados || j;
    if (!dados || !Array.isArray(dados.clientes)) throw new Error('Arquivo de backup inválido');
    const def = this.defaults();
    this.d = Object.assign(def, dados);
    this.d.settings = Object.assign(def.settings, dados.settings || {});
    this.save();
  },
  reset() { localStorage.removeItem(this.KEY); this.load(); },
};
Store.load();
