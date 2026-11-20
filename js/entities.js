/* Definição dos cadastros simples (CRUD genérico) */
const UNIDADES = ['UN', 'KG', 'G', 'M', 'M²', 'L', 'CX', 'PC', 'PAR', 'HR'];
const PAGAMENTOS = ['', 'PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'A prazo'];

const clientName = id => Store.get('clientes', id)?.nome || '';

const ENT = {
  clientes: {
    label: 'Clientes', singular: 'Cliente', icon: 'people', tone: 'blue',
    fields: [
      { k: 'nome', l: 'Nome', req: true, ph: 'Nome completo ou razão social' },
      { k: 'telefone', l: 'Telefone / WhatsApp', type: 'tel', ph: '(00) 00000-0000' },
      { k: 'email', l: 'E-mail', type: 'email', ph: 'cliente@email.com' },
      { k: 'documento', l: 'CPF / CNPJ', ph: 'Opcional' },
      { k: 'endereco', l: 'Endereço', type: 'textarea' },
      { k: 'obs', l: 'Observação', type: 'textarea' },
    ],
    title: x => x.nome,
    lines: x => [x.telefone && 'Tel: ' + x.telefone, x.email].filter(Boolean),
    search: x => [x.nome, x.telefone, x.email, x.documento].join(' '),
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  produtos: {
    label: 'Produtos', singular: 'Produto', icon: 'tag', tone: 'blue',
    fields: [
      { k: 'nome', l: 'Nome do produto', req: true },
      { k: 'codigo', l: 'Código / SKU', half: true },
      { k: 'unidade', l: 'Unidade', type: 'select', opts: UNIDADES, half: true },
      { k: 'preco', l: 'Preço de venda', type: 'money', half: true },
      { k: 'custo', l: 'Preço de custo', type: 'money', half: true },
      { k: 'estoque', l: 'Estoque (deixe vazio para não controlar)', type: 'number' },
      { k: 'descricao', l: 'Descrição', type: 'textarea' },
    ],
    title: x => x.nome,
    lines: x => [money(x.preco) + (x.unidade ? ' / ' + x.unidade : ''), x.estoque !== '' && x.estoque != null ? 'Estoque: ' + num(x.estoque) : '', x.codigo && 'Cód: ' + x.codigo].filter(Boolean),
    search: x => [x.nome, x.codigo, x.descricao].join(' '),
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  servicos: {
    label: 'Serviços', singular: 'Serviço', icon: 'list', tone: 'blue',
    fields: [
      { k: 'nome', l: 'Nome do serviço', req: true },
      { k: 'preco', l: 'Valor', type: 'money', half: true },
      { k: 'duracao', l: 'Duração (min)', type: 'number', half: true },
      { k: 'descricao', l: 'Descrição', type: 'textarea' },
    ],
    title: x => x.nome,
    lines: x => [money(x.preco), x.duracao && x.duracao + ' min'].filter(Boolean),
    search: x => [x.nome, x.descricao].join(' '),
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  usuarios: {
    label: 'Usuários', singular: 'Usuário', icon: 'users', tone: 'blue',
    fields: [
      { k: 'nome', l: 'Nome de usuário', req: true },
      { k: 'email', l: 'E-mail (login)', type: 'email', req: true },
      { k: 'papel', l: 'Perfil', type: 'select', opts: ['Vendedor', 'Administrador'] },
      { k: 'senha', l: 'Senha', type: 'password', ph: 'Mínimo 4 caracteres' },
    ],
    title: x => x.nome,
    lines: x => [x.email, x.papel].filter(Boolean),
    search: x => [x.nome, x.email].join(' '),
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  agendamentos: {
    label: 'Agendamentos', singular: 'Agendamento', icon: 'calendar', tone: 'green',
    status: ['Agendado', 'Confirmado', 'Concluído', 'Cancelado'],
    fields: [
      { k: 'titulo', l: 'Título / Serviço', req: true, ph: 'Ex.: Instalação, visita técnica…' },
      { k: 'clienteId', l: 'Cliente', type: 'client' },
      { k: 'data', l: 'Data', type: 'date', req: true, half: true, def: () => todayISO() },
      { k: 'hora', l: 'Hora', type: 'time', half: true },
      { k: 'situacao', l: 'Situação', type: 'select', opts: ['Agendado', 'Confirmado', 'Concluído', 'Cancelado'] },
      { k: 'obs', l: 'Observação', type: 'textarea' },
    ],
    title: x => x.titulo,
    lines: x => [`Data: ${fmtDate(x.data)}${x.hora ? ' às ' + x.hora : ''}`, x.clienteId && 'Cliente: ' + clientName(x.clienteId)].filter(Boolean),
    badge: x => x.situacao || 'Agendado',
    search: x => [x.titulo, clientName(x.clienteId), x.obs].join(' '),
    sort: (a, b) => (b.data + (b.hora || '')).localeCompare(a.data + (a.hora || '')),
  },
  cobrancas: {
    label: 'Cobrança', singular: 'Cobrança', icon: 'money', tone: 'orange',
    status: ['Em aberto', 'Vencida', 'Paga'],
    fields: [
      { k: 'descricao', l: 'Descrição', req: true, ph: 'Ex.: Mensalidade, parcela 1/3…' },
      { k: 'clienteId', l: 'Cliente', type: 'client' },
      { k: 'valor', l: 'Valor', type: 'money', half: true, req: true },
      { k: 'vencimento', l: 'Vencimento', type: 'date', half: true, req: true, def: () => todayISO() },
      { k: 'forma', l: 'Forma de pagamento', type: 'select', opts: PAGAMENTOS },
      { k: 'pago', l: 'Pagamento recebido', type: 'check' },
      { k: 'pagoEm', l: 'Data do recebimento', type: 'date' },
      { k: 'obs', l: 'Observação', type: 'textarea' },
    ],
    title: x => x.descricao,
    lines: x => [`Valor: ${money(x.valor)}`, `Vencimento: ${fmtDate(x.vencimento)}`, x.clienteId && 'Cliente: ' + clientName(x.clienteId)].filter(Boolean),
    badge: x => cobrancaStatus(x),
    search: x => [x.descricao, clientName(x.clienteId), x.ref].join(' '),
    sort: (a, b) => (a.pago - b.pago) || a.vencimento.localeCompare(b.vencimento),
    beforeSave: o => { if (o.pago && !o.pagoEm) o.pagoEm = todayISO(); if (!o.pago) o.pagoEm = ''; return o; },
  },
};

function cobrancaStatus(x) {
  if (x.pago) return 'Paga';
  return x.vencimento && x.vencimento < todayISO() ? 'Vencida' : 'Em aberto';
}

/* Cores de situação: verde = concluído, âmbar = aguardando, vermelho = cancelado, índigo = em andamento */
function statusTone(s) {
  const n = norm(s);
  if (/conclu|entreg|aprov|paga|confirm/.test(n)) return 'ok';
  if (/cancel|recus|vencid/.test(n)) return 'bad';
  if (/andamento|agendado/.test(n)) return 'info';
  return 'wait';
}
const badge = s => `<span class="badge ${statusTone(s)}">${esc(s)}</span>`;
