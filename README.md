# CRM PRO — app de vendas

App de vendas para celular (PWA): clientes, produtos, serviços, vendas, pedidos, orçamentos, agendamentos, cobranças e relatórios.
Feito em HTML, CSS e JavaScript puros, sem dependências e sem etapa de build. Funciona offline e pode ser instalado na tela inicial.

## Como usar

- **Rápido:** abra o `index.html` no navegador.
- **Instalável/offline:** publique a pasta em qualquer hospedagem estática com HTTPS (GitHub Pages, Netlify, Vercel…). Depois, no celular, use “Adicionar à tela inicial”.
- Para testar localmente com o service worker: `python3 -m http.server` e acesse `http://localhost:8000`.

No primeiro acesso você cria a conta do **gestor**. Em *Configurações → Carregar dados de exemplo* dá para popular o app e testar.

## Funcionalidades

| Área | O que faz |
|---|---|
| **Início** | Saudação, total de vendas/pedidos/orçamentos do mês, agendamentos de hoje, pedidos e orçamentos pendentes, clientes, alerta de cobranças vencidas, ações rápidas, próximos agendamentos e últimos registros |
| **Menu** | Grade com Cadastros, Operação, Financeiro e Conta e Configurações |
| **Menu lateral** | Perfil do usuário, atalhos, Alterar senha, Sair da conta |
| **Vendas / Pedidos / Orçamentos** | Lista com busca por nº ou cliente e filtro por situação. Formulário em seções (Informações, Produtos, Serviços, Total) com desconto, acréscimo/frete e forma de pagamento |
| **Documento** | Visualização do documento com logo e dados da empresa; imprimir/salvar PDF, enviar pelo WhatsApp, duplicar, converter orçamento em venda e gerar cobrança parcelada |
| **Estoque** | Vendas e pedidos (não cancelados) dão baixa no estoque dos produtos que têm estoque informado; editar, cancelar ou excluir devolve o estoque |
| **Clientes** | Cadastro, ligar, histórico de compras, valores em aberto e atalho para WhatsApp |
| **Agendamentos** | Data, hora, cliente e situação |
| **Cobrança** | Contas a receber com vencimento, status (Em aberto / Vencida / Paga) e totais |
| **Relatórios** | Faturamento, ticket médio, recebido, a receber, vencido, gráfico por dia/mês, mais vendidos, melhores clientes, por funcionário, por forma de pagamento e por situação; exporta CSV |
| **Usuários** | Vários vendedores com login próprio; perfis **Gestor** e **Vendedor** |
| **Painel do Gestor** | Só para o gestor: resumo por usuário (último acesso, vendas, nº de ações, exclusões) e linha do tempo de tudo o que cada um fez — criou, editou (com o que mudou: situação, desconto, total…), excluiu, enviou pelo WhatsApp, imprimiu, entrou, saiu e tentativas de senha errada. Registros excluídos podem ser **restaurados** |
| **Permissões** | O vendedor vê só as próprias vendas, pedidos e orçamentos e nos relatórios só os próprios números; o gestor vê tudo e filtra relatórios por funcionário |
| **Personalizar Documentos** | Logo, nome, CNPJ/CPF, contatos, endereço, rodapé, cor e validade padrão do orçamento |
| **Configurações** | Exportar/restaurar backup (JSON), dados de exemplo, apagar tudo |

## Dados

Tudo fica salvo no `localStorage` **do próprio aparelho**: não há servidor. Isso significa que:

- cada aparelho/navegador tem seus próprios dados, e para levar os dados de um aparelho para outro é preciso usar **Exportar/Restaurar backup**;
- limpar os dados do navegador apaga as informações, então faça backups;
- o Painel do Gestor mostra as ações feitas **neste aparelho**; para acompanhar vendedores em celulares diferentes é preciso um servidor central (veja abaixo);
- o login protege o uso no dia a dia, mas não é uma proteção forte, porque quem tem acesso ao aparelho consegue ler o armazenamento local.

Para sincronizar entre aparelhos ou equipes, o próximo passo seria trocar a camada `js/store.js` por um backend (Firebase, Supabase ou uma API própria). O resto do app conversa só com `Store`.

## Estrutura

```
index.html            shell do app
manifest.webmanifest  configuração PWA
sw.js                 cache offline
css/styles.css        estilos
js/icons.js           ícones SVG
js/util.js            utilitários (moeda, datas, modais, toast)
js/store.js           persistência local e sessão
js/entities.js        definição dos cadastros simples
js/records.js         vendas/pedidos/orçamentos, documento, estoque, cobrança
js/reports.js         relatórios
js/audit.js           registro de atividades, permissões e Painel do Gestor
js/pages.js           telas (início, menu, listas, formulários, login…)
js/app.js             roteador, barra superior, menu lateral, navegação
```
