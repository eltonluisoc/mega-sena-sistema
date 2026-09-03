# Prompt: Evolução de Sistema com Multiagentes (Claude Code)

Quero que você atue como um **orquestrador de agentes** para evoluir o sistema abaixo para uma nova versão. Use pelo menos **8 agentes especializados** (via Task tool / subagentes), cada um com uma função clara e entregável específico. Não faça o trabalho sozinho de forma monolítica — divida entre os agentes e sintetize os resultados no final.

## Contexto do projeto

- **Nome do sistema:** Bolões Aleatórios (repositório GitHub `mega-sena-sistema`, pasta local `CONTROLE_BOLOES`)
- **Stack atual:**
  - Site público + painel admin: HTML/CSS/JavaScript puro (sem framework, sem build step), hospedado no GitHub Pages
  - Backend: Firebase — Firestore (banco de dados), Firebase Authentication (login do admin), Firebase Analytics
  - Automação: 1 Cloud Function agendada em `functions/index.js` (bot Telegram de loteria acumulada — hoje redundante com `bot-telegram.js` via GitHub Actions; candidata a remoção futura)
  - Ferramenta desktop paralela: `bolao_pro_v3.py` (Python 3 + Tkinter + SQLite), usada para gestão offline de bolões/reservas financeiras, sincroniza com o mesmo Firestore via REST API
- **Descrição atual:** Sistema para gerir bolões de loteria (Mega-Sena, Lotofácil, Quina): cadastro de cartões (individual, em lote, ou via ferramenta desktop), conferência automática de resultados, gestão de participantes/pagamentos/reservas financeiras, geração de links de acesso pessoal por token, dashboard com estatísticas. `index.html` é a página pública onde participantes conferem resultados e sua situação; `admin.html` é de uso exclusivo do dono do sistema.
- **Objetivo da nova versão:** Evoluir o sistema para um padrão profissional — seguro, sem código morto/duplicado, com métricas confiáveis e telas revisadas uma a uma — com a perspectiva de eventualmente se tornar um produto rentável (não só uso pessoal).

## Estado atual — o que já evoluímos nesta sessão

Resumo do que já foi feito e verificado, para os agentes não refazerem nem contradizerem:

**Segurança**
- Login do admin trocado de hash MD5 verificado no navegador (burlável via `localStorage.setItem` no console) para Firebase Authentication real (e-mail/senha)
- Regras do Firestore reescritas do zero: antes qualquer pessoa podia ler *e escrever* em todas as coleções; agora escrita/exclusão exigem `request.auth != null` nas coleções sensíveis (`cartoes`, `participantes`, `participantes_tokens`, `reservas_participantes`, `config_boloes`, `config_geral`, `participantes_pendentes`, `resultados_mega/lotofacil/quina`). Leitura continua pública (necessária — as páginas públicas não têm backend próprio). `resultados_conferidos` mantém escrita pública de propósito (cache de resultado oficial da loteria, dado público e de baixo risco)
- `bolao_pro_v3.py` (ferramenta desktop) adaptado para autenticar no Firebase antes de escrever — pede a senha do admin numa caixinha na primeira sincronização de cada sessão, guarda só em memória (nunca em disco/variável de ambiente)

**Infraestrutura**
- Service Worker (`sw.js`) trocado de estratégia "cache primeiro" para "rede primeiro" — deploys novos paravam de aparecer pros usuários, escondidos atrás de cache antigo

**Limpeza de código (`admin.js`, foi de ~4200 para ~3100 linhas)**
- Removido código morto inalcançável: cadastro por imagem/OCR (nunca leu imagem de verdade, só simulava com números aleatórios), formulário de cadastro em textarea legado, importação via `prompt()`, importação CSV (a pedido), feature "participante rápido" inteira, botão "Forçar Recarregar" (duplicava leituras no Firestore à toa), botão "Duplicar Cartão" (quebrado, não fazia falta)
- Corrigidas múltiplas funções duplicadas silenciosas — em JavaScript a última declaração de uma função sempre vence; havia versões antigas/quebradas "escondendo" versões novas corretas, causando bugs reais (ex.: dashboard sempre mostrando "-" nos melhores resultados por um erro engolido por `try/catch`)
- Corrigido bug de CSS: a regra `input { appearance: none }` (sem qualificar o tipo) deixava **todos** os checkboxes do admin sem feedback visual de "marcado" (modo seleção, seleção de cartões, bolões, destaque)
- Implementada do zero a funcionalidade "Alterar Tipo" em lote — existia botão na tela sem nenhum código funcional por trás

**Dashboard (admin)**
- Corrigidos: Total de Bolões (cada concurso cadastrado conta como um bolão distinto, mesmo reaproveitando nome), Maior Bolão (agora mostra o concurso), ranking Top-3 por concurso/loteria (desempate por quantidade de cartões no nível, piso mínimo de "prêmio" — duque+ na Mega/Quina, 11+ pontos na Lotofácil — pra não listar "1 acerto" como conquista)
- Substituída a métrica "Probabilidade Média" (aproximação linear grosseira, sem relação real com chance de ganhar, misturava as 3 loterias) por "Bilhetes Jogados" (cálculo combinatório real — `combinação(n,k)` — mesmo usado no card "Potencial do Bolão" do site público)
- Removidos cards enganosos: "Média de Participantes/Bolão" (só existia 1 bolão formalizado com lista de participantes, o número não significava nada) e "Maiores Acertos" (redundante com os cards por loteria)

**Site público (`index.html` / `script.js`)**
- Card "Potencial do Bolão" agora aparece também em concursos já conferidos anteriormente (antes só aparecia no concurso mais recente, ainda não conferido)

## Requisitos que NÃO podem regredir

- Login do admin deve continuar exigindo autenticação real via Firebase Auth — não voltar a senha em JS/localStorage
- Regras do Firestore devem continuar bloqueando escrita anônima nas coleções sensíveis listadas acima
- `bolao_pro_v3.py` deve continuar se autenticando antes de escrever no Firestore
- Leitura pública de `index.html`, `consulta.html`, `meus-boloes.html`, `participantes.html` não pode passar a exigir login — não têm backend próprio
- `resultados_conferidos` deve continuar com escrita pública (usado pelo site público ao conferir resultados)
- Service Worker deve continuar em estratégia "rede primeiro" (não voltar a cachear agressivamente o HTML/JS) — e `forcarAtualizacaoCache()` (que desregistrava o SW a cada load) não pode voltar
- `participantes.html` deve continuar funcionando sem login, lendo 1 documento por vez (`get`) — só a listagem da coleção inteira (`list`) é que foi restringida
- `consulta.html` deve continuar aceitando acesso público por `?token=` sem login

## Rodada 2 — Multiagentes (Arquiteto + Requisitos) e o que evoluiu depois

Rodei os agentes "Arquiteto" e "Levantamento de Requisitos" (fase de pesquisa, sem editar nada) pra mapear o que falta pra próxima versão. Achados críticos novos, já corrigidos:

- **`participantes_tokens` e `reservas_participantes` eram listáveis publicamente** — a regra genérica `match /{document=**} { allow read: if true }` cobria tudo, inclusive isso. Qualquer um podia listar todos os tokens de acesso válidos + nome + telefone (o sistema de "link pessoal" não tinha segurança nenhuma), e todos os saldos financeiros por pessoa. Corrigido: `firestore.rules` reescrita sem a regra coringa, cada coleção declara `read`/`write` explicitamente; `participantes_tokens` permite `get` público (necessário pra `consulta.html` verificar o token do visitante) mas restringe `list` ao admin; `reservas_participantes` fica inteiramente restrita ao admin; `participantes` segue com `get` E `list` públicos por enquanto (ver item pendente abaixo).
- **`forcarAtualizacaoCache()` desregistrava o Service Worker a cada load do `index.html`** — anulava sozinha a correção "rede primeiro" feita antes. Removida.
- **Os dois caminhos de conferência de resultado (`conferirResultados` e `exibirResultadoSalvo`) davam números diferentes pro mesmo concurso** — um respeitava o filtro de bolão selecionado, o outro ignorava. Unificados.
- **`consulta.js` (busca por telefone): status do bolão nunca era aplicado** — a busca em `config_boloes` era assíncrona e disparada dentro do loop, resolvendo depois do bolão já ter sido adicionado à lista com o valor padrão "em andamento". Corrigido pra buscar uma vez, antes do loop.

### Pendente — bloqueado por decisão de custo, não por código

- **Exposição de dados pessoais em `participantes` continua aberta.** `consulta.js` e `consulta.html` ainda baixam a coleção `participantes` inteira (nome, telefone, valor pago, situação de TODOS os participantes de TODOS os bolões) e filtram no navegador. A correção desenhada: duas Cloud Functions (`buscarBoloesPorTelefone`, `buscarBoloesPorToken`, já escritas em `functions/functions/index.js`) fazem essa busca no servidor via Admin SDK e devolvem só o que cada pessoa tem direito de ver. **Não foi possível fazer o deploy**: o projeto está no plano Spark (gratuito) do Firebase, e Cloud Functions exigem o plano Blaze (pago por uso, com camada gratuita generosa — tende a ficar em R$0/mês nesse volume de uso, mas exige cartão cadastrado). Decisão de não mexer em plano/pagamento por enquanto. Quando decidirem fazer o upgrade: `firebase deploy --only functions --project mega-sena-sistema` (rodar dentro de `functions/`), depois trocar as chamadas `db.collection('participantes').get()` em `consulta.js`/`consulta.html` por `fetch()` nas novas functions, e por fim restringir `participantes` no `firestore.rules` do mesmo jeito que já foi feito com `participantes_tokens`/`reservas_participantes`.

## Rodada 3 — dinheiro decimal, ID estável, integração desktop↔web, testes, UX

Trabalho feito depois da Rodada 2, incluindo uma investigação dedicada (agente) à confiabilidade da sincronização entre `bolao_pro_v3.py` (desktop) e o site.

**Dados/integridade**
- `valorPorCota` (e `valorPago` no desktop) migrado de `integerValue` (sem centavos) para `doubleValue` em todos os pontos de escrita, dos dois lados
- `boloes.firebase_doc_id` (SQLite): ID do documento Firestore gerado uma única vez e reaproveitado sempre — antes, renomear um bolão publicado recalculava o ID a partir do título e criava um documento duplicado/órfão no Firebase
- Escritas do Firestore (PATCH) passaram a usar `updateMask.fieldPaths` — antes sobrescreviam o documento inteiro; hoje é inofensivo (nada mais escreve nesses docs), mas evitava um risco futuro
- PATCH de bolão já publicado (`firebase_doc_id` salvo) exige `currentDocument.exists=true`: se o admin excluir o bolão no site, o próximo fechamento do desktop **não recria mais o documento** — marca `encerrado=1` localmente em vez disso
- "Remover do site" no desktop agora usa o `firebase_doc_id` salvo em vez de buscar por título (falhava depois de renomear)
- Fechar o app não esconde mais erro de sincronização: só fecha sozinho se tudo deu certo; com erro, exige fechamento manual e mantém o log visível
- Senha do Firebase agora é pedida na abertura do app (fica em cache pro resto da sessão), não mais no meio do fechamento

**Testes e documentação**
- `test/` com 16 testes automatizados (`node --test`, sem dependências extras) cobrindo as funções puras do site (combinatória de cartões, nível de acerto, ordenação por acertos, telefone) via `node:vm`, sem modificar `script.js`/`consulta.js`
- `README.md` criado (arquitetura, como rodar site/desktop, deploy, notas de segurança); `package.json` com nome/versão/scripts

**Bugs corrigidos no site**
- Cartões na tela de conferência de resultado não vinham ordenados por acertos (só a tela de "resultado já conferido" ordenava; a que desenha a lista de fato, `mostrarCartoes()`, não)
- Banner de instalação PWA quebrava palavra por linha no Safari iOS ("font boosting" automático em coluna estreita, sem `text-size-adjust: 100%` pra desativar)
- Botão "Salvar como App" quase invisível (cinza sobre cinza no rodapé)
- Dashboard do admin: 5 cards condensados em 3, removendo números repetidos ("Total de Cartões" x "Cartões por Loteria" mostravam o mesmo total duas vezes; idem "Total de Bolões" x "Maior Bolão")
- Avisos de confidencialidade adicionados no login e no topo do dashboard do admin

**UX no cadastro do desktop (fluxo "importar membro de bolão anterior + pagar")**
- Importar membro já recalcula o valor esperado (antes deixava "0,00" fixo)
- Confirmação de importação virou aviso inline (era popup bloqueante)
- Atalhos: Enter busca, duplo-clique importa, Enter registra o pagamento (campos já vêm com o padrão preenchido)

### Achados da investigação de integração desktop↔web ainda NÃO corrigidos

Investigação dedicada (leitura completa dos caminhos de sync) achou mais itens, priorizados; só os 4 críticos acima foram corrigidos até agora. Ainda pendentes:

- **Centavos perdidos no `valorPago`** publicado pelo desktop (`int(round(pago))` em vez de manter o float) — ex.: R$45,50 vira R$46 no site
- **Colisão de ID em reservas sem telefone**: duas pessoas com o mesmo nome e sem telefone geram o mesmo doc ID em `reservas_participantes`, uma sobrescreve a outra
- **Duas tabelas de mapeamento de ID hardcoded** no desktop (`FIREBASE_BOLAO_IDS` vs `FIREBASE_IDS`), resquício que o `firebase_doc_id` já deveria ter aposentado — as chaves duplicadas/mortas dentro de cada uma foram limpas na Rodada 4, mas as duas tabelas continuam existindo separadamente (só usadas no 1º publish de um bolão, antes de existir `firebase_doc_id`; unificá-las de vez segue pendente)
- **Prompt de senha sem timeout** podia travar o fechamento do app (mitigado, mas não eliminado, pelo login antecipado na abertura)
- `dataLimite` escrito pelo desktop no documento do bolão é campo morto (o site usa `config_boloes/ativos` como fonte real)
- `vagasDisponiveis`/`vagasTotais` são lidos por `script.js` mas nunca escritos por ninguém
- Feature "Sincronizar Participantes Pendentes" no desktop é código morto (nenhum lugar escreve na coleção `participantes_pendentes`, e as regras já exigem admin pra escrever lá)

## Rodada 4 — Revisão multiagente de qualidade (4 agentes de pesquisa: desktop, web, segurança, produto)

Rodada dedicada a "evoluir pra um padrão profissional", cobrindo desktop e web juntos a pedido do usuário. 4 agentes de pesquisa (sem editar nada) rodaram em paralelo; todos os achados foram mostrados pro usuário antes de qualquer correção, que aprovou corrigir tudo (críticos + importantes + menores). Também: a senha do Firebase no desktop passou a ser pedida na abertura do app (fica em cache pro resto da sessão), não mais no meio do fechamento.

**Críticos de segurança corrigidos (achados por 2 agentes independentes, reforçando confiança)**
- `resultados_conferidos` aceitava escrita pública sem validação — qualquer visitante podia forjar o resultado de um sorteio já conferido a qualquer momento, e o site confiava cegamente nesse cache sem revalidar contra a API oficial depois. `firestore.rules` agora só permite `create` (com validação de shape/tipo); `update`/`delete` exigem admin. Deployado e verificado com 4 testes reais via REST API (create inválido bloqueado, update anônimo bloqueado, create válido funciona, sobrescrita anônima do doc recém-criado bloqueada). Precisou criar `firebase.json`/`.firebaserc` na raiz (faltava config de deploy pra `firestore:rules` fora da pasta `functions/`).
- `gerarTokenUnico()` (token que protege `consulta.html?token=...`) usava `Math.random()` — PRNG não criptográfico, previsível a partir de algumas amostras. Trocado por `crypto.getRandomValues()`.
- Nome de participante/título de bolão iam pro `innerHTML` sem escapar em `script.js`, `admin.js`, `consulta.js`, `consulta.html` e `participantes.html` — XSS armazenado, inclusive dentro da sessão autenticada do admin. Adicionado `escapeHtml()` (escapa `<>&"'`) em cada arquivo, aplicado em toda interpolação de nome/título em `innerHTML` ou atributo `data-*`.

**Importantes corrigidos — web**
- `formatarTelefone()` divergia entre `admin.js`/`consulta.html` (formato errado, sem parênteses) e `consulta.js` (formato correto) — alinhados.
- Diálogo "Limpar Seleção" tinha semântica OK/Cancelar invertida: fechar com Esc (= Cancelar) acionava a ação destrutiva. Invertido.
- Botão "🔄 RECARREGAR" na aba Cartões do admin não tinha handler — ligado a `carregarDadosAdmin()`.

**Importantes corrigidos — desktop**
- `to_float()` zerava valor inválido de pagamento silenciosamente, sem avisar — corrigido nos 2 pontos que editam PAGAMENTO (não em `valor_esperado`, que legitimamente aceita zero — caso do ADM isento).
- Auto-atualização do Dashboard ao trocar de aba estava morta havia tempo: dois `bind()` no mesmo notebook, o segundo sobrescrevendo o primeiro em silêncio, e a condição que sobrou nunca era verdadeira. Corrigido com 2 binds em widgets diferentes.
- Registrar pagamento não atualizava Dashboard/Relatório na hora.
- "É o administrador?" divergia entre o Relatório (só checava a flag `is_adm`) e Dashboard/Cards/publicação pro Firebase (checavam flag OU nome batendo com `adm_nome`) — Relatório unificado com o mesmo critério.
- Publicação manual de bolão ganhou a mesma trava de "sem valor de cota" que a sincronização automática já tinha.

**Menores corrigidos**
- Web: removidas 2 funções mortas em `script.js`, markup morto (`#loadingIndicator`) em `index.html`, texto de 9px do link de convite subiu pra 12px, comentário cruzado nas 2 cópias de `combinacao()`.
- Desktop: excluir bolão agora limpa `saques_emergenciais`/`taxa_adm` também (ficavam órfãos); removidas 2 funções stub mortas; chaves duplicadas/mortas removidas de `FIREBASE_BOLAO_IDS`/`FIREBASE_IDS`; reimplementação inline de `fmt_brl()` trocada pela função existente.

### Deliberadamente NÃO corrigido nesta rodada (escopo/risco)

- **Unificar de vez `FIREBASE_BOLAO_IDS`/`FIREBASE_IDS`** numa tabela só, ou eliminá-las (só valem no 1º publish de um bolão) — limpeza pontual feita, unificação completa fica pra depois.
- **Unificar a lógica de payload do Firebase** (hoje triplicada entre `enviar_bolao_para_site()`, o bloco inline de `_on_close`, e `_pub_montar_dados_impl()`) — só a divergência concreta (trava de valor de cota faltando na publicação manual) foi corrigida; a unificação completa é um refactor maior, adiado por risco de regressão num app que não dá pra testar visualmente aqui.
- **Refatorar funções grandes do desktop** (`_adm_load` com N+1 queries, `_dash_load`/`_cards_visuais` misturando UI+regra+SQL) — mesma razão: alto risco, baixo retorno imediato.
- **Mover a navegação de abas do admin (`admin.html`) pra dentro de `admin.js`** — só organização, sem valor funcional, não valia o risco.
- **Self-signup do Firebase Auth não restrito** — não é bug de código, é uma configuração a mudar no Console do Firebase (desabilitar criação de conta por padrão pro provedor Email/Password); baixa prioridade, nenhum caso de uso legítimo depende disso hoje.
- **Achados da investigação de integração desktop↔web da Rodada 3** (centavos perdidos em `valorPago`, colisão de ID em reservas sem telefone, `dataLimite`/`vagasDisponiveis` mortos, "Sincronizar Pendentes" morto) — continuam pendentes, listados acima.
- **Avaliação de prontidão de produto** (mono-admin hardcoded em 3 lugares, app desktop preso a 1 projeto Firebase, zero onboarding self-service, leitura ineficiente que escala mal, Analytics sem eventos de negócio, falta notificação proativa de resultado) — é decisão estratégica, não bug; documentado pro usuário decidir se/quando perseguir virar produto multi-tenant.

## Rodada 5 — Sincronização de reservas nos dois sentidos + achados de arquitetura de informação nas abas

**Reservas: sincronização web→desktop (feature nova)**

Antes, reservas pessoais só sincronizavam desktop→site (o app publica saldo/histórico calculado do SQLite local, sobrescrevendo o documento inteiro no Firestore). Não existia caminho contrário — um depósito feito "no campo" só entrava no sistema se alguém abrisse o desktop e lançasse manualmente.

Implementado seguindo o mesmo padrão de fila que já existia (morto) pra `participantes_pendentes`:
- Nova coleção `reservas_movimentos_pendentes` no Firestore (`allow read, write: if isAdmin()` — deployado e testado: escrita/leitura anônima bloqueadas com 403).
- Admin web (`admin.html`/`admin.js`, seção Reservas): botão "➕ REGISTRAR MOVIMENTO" abre modal pra lançar depósito OU saque/uso, pra pessoa já cadastrada OU pessoa nova (nome+telefone+PIX opcional). Grava na fila, não altera o saldo na hora (deixa isso explícito no toast de confirmação).
- Desktop (`bolao_pro_v3.py`): `_importar_movimentos_pendentes_web()`, chamada logo após o login inicial na abertura do app. Busca a pessoa local por telefone (prioridade) ou nome; se não achar, cria. Insere o movimento em `reservas_movimentos` local, apaga o item da fila no Firestore, e mostra um aviso resumido ("N movimentos importados do site: depósitos RX, saques RY") só se houver algo pra importar — silencioso quando a fila está vazia.
- Depois de importado, o próximo push do desktop pro site (fechamento ou publicação manual) já inclui o movimento normalmente, porque ele passa a fazer parte do SQLite local — não precisou mexer na lógica de push existente.

**Achados de arquitetura de informação nas abas do desktop (apresentados, aguardando aprovação pra aplicar)**
- "✏ Editar" (Financeiro) é redundante com "📋 Histórico" — Histórico já cobre 100% do caso de uso de Editar (busca por nome + duplo-clique pra editar) e tem mais recursos (KPIs, filtro, export). Candidata a remoção.
- Sub-aba "🔄 Sincronizar Participantes" (dentro de Site/Publicar) corresponde à feature já identificada como código morto na Rodada 4 — remover a aba junto com o código.
- Nomes parecidos demais pra conceitos diferentes: "💼 Reserva/Caixa" (Gestão, fundo de caixa do bolão) vs "💰 Reservas Pessoais" (Financeiro, saldo de cada pessoa).

## Rodada 6 — Bug financeiro grave (ADM isento contado nos totais) + fusão Dashboard/Administração

O usuário relatou 3 vezes (com exemplos numéricos reais) que "Total Esperado" no Dashboard incluía o valor esperado dele mesmo em bolões onde está configurado como ADM isento (não paga) — ex.: Mega da Virada com 47 participantes, sendo 46 pagantes de verdade, mostrava o total como se fossem 47.

**Causa raiz encontrada**: `valor_esperado` do ADM só é zerado automaticamente no cadastro se ele for cadastrado DEPOIS do bolão já estar marcado como isento (`_cad_adm_toggle`). Se o bolão virou isento depois de já cadastrado, o valor antigo fica salvo no banco — e o Dashboard calculava "Total Esperado" com um `SUM(valor_esperado)` cru, sem excluir quem é ADM isento pelo critério `is_adm`/nome. `total_pago`/`total_saldo` já excluíam corretamente (via `_status_part_adm`), só "esperado" estava errado.

**Corrigido**:
- `_dash_load()`: `total_esp` agora é somado dentro do mesmo loop que já detecta `eh_adm and not adm_paga`, excluindo o ADM isento de todos os totais (esperado, arrecadado, pendente) de forma consistente — removida a lógica antiga que somava `SUM(valor_esperado)` cru e ainda adicionava 1 cota extra se o ADM isento não estivesse cadastrado.
- `_gerar_rel()` (Relatório): a linha sintética do ADM isento também inflava `te`/`tp` (esperado E arrecadado) com o valor dele — removido, a linha agora só aparece como "QUITADO (isento)" sem entrar em nenhum total.
- `_registrar_pag()`: aviso (não bloqueio) ao tentar registrar um pagamento pro ADM isento — esse tipo de lançamento aparecia escondido no "Total Recebido" da aba Depósitos mesmo o ADM não pagando (Depósitos em si está correto — soma `pagamentos` reais, que por construção não deveriam ter linha pro isento; o aviso é preventivo contra dado incorreto).
- Auditoria: Cards Visuais (só conta status, sem soma monetária — ok), publicação pro site (`_pub_montar_dados_impl`/`_on_close`, já zeravam `valorPago` do ADM isento corretamente — ok), Administração/atrasados (já excluía corretamente — ok).

**UI: Dashboard + Administração fundidos numa tela só** (pedido do usuário, aprovado com "rolagem" em vez de lado-a-lado): "Início" tinha 3 níveis de abas (Início > Administração > Visão Geral/Pendências). Agora são 2 abas diretas: "🏠 Visão Geral" (Dashboard do bolão + resumo da Administração empilhados, com scroll do mouse) e "📅 Pendências por Bolão" (promovida a aba própria, como pedido). Bloco "Ganhos por Loteria" também ficou menor (só 3-4 loterias, não precisava do mesmo espaço do Histórico).

### Rodada 7 — os 3 itens de arquitetura de informação, aprovados e aplicados (v4.1)
- Aba "✏ Editar" removida (redundante com Histórico). Histórico ganhou botão "🗑 Excluir Selecionado" (mesma trava: não deixa excluir pagamento já depositado) pra cobrir a única diferença real que havia.
- Sub-aba "🔄 Sincronizar Participantes" removida (código morto confirmado). A limpeza de "Pagamentos Órfãos" que vivia dentro dela foi preservada e virou botão em "📋 Histórico" — é uma utilidade independente, ainda relevante.
- "💼 Reserva / Caixa" renomeada pra "💼 Caixa por Loteria", pra não confundir com "💰 Reservas Pessoais" (conceitos diferentes: fundo do organizador vs. saldo de cada pessoa).

## Rodada 8 — Reestruturação completa de "Início > Visão Geral" (v4.2 → v5.0)

Sequência de feedback real de uso, culminando numa reestruturação grande:

**v4.2** — Bug de UX: a rolagem do mouse não funcionava na tela fundida. Causa: `bind("<MouseWheel>", ...)` direto no canvas só dispara com o cursor sobre a área vazia dele, quase impossível numa tela cheia de widgets. Corrigido com o padrão certo: `bind_all` ligado/desligado via `<Enter>`/`<Leave>` no canvas.

**v4.3** — Pedido de revisão de UX da tela fundida. 3 tentativas de usar o modelo Opus como segunda opinião falharam por sobrecarga do servidor (erro 529, três vezes seguidas — instabilidade real, não da tarefa). A revisão foi feita por Sonnet mesmo, lendo `_build_dashboard()`/`_dash_load()` por completo: achou e corrigiu 5 problemas (árvores com altura herdada de tela cheia, 3 números duplicados entre KPIs e bloco Financeiro, divisória fraca demais entre as duas metades da tela, cores de KPI repetindo significado entre as duas metades, formulário de ação espremido no meio de uma leitura longa).

**v5.0** — Feedback de que a tela ainda não estava boa: o usuário queria a visão geral (todos os bolões) **primeiro**, não o bolão selecionado. Junto, achado um bug real: a coluna "Devidas" em Participantes Atrasados mostrava um número cumulativo (parcelas esperadas desde o início do bolão, ex.: 8), não quanto realmente falta (ex.: pagou 7 de 8 → falta só 1) — confundia porque a coluna "Saldo" ao lado já mostrava o valor certo. Reestruturação completa, aprovada antes de implementar:
- Corrigida a coluna (virou "Faltam" = Devidas − Pagas).
- Ordem invertida: Visão Geral (todos os bolões) primeiro — 7 KPIs essenciais (Bolões Ativos, Arrecadado Geral, Pendente Depósito Geral, Participantes Atrasados, Total Ganho/Sacado/Saldo do organizador), Depósitos Pendentes, Participantes Atrasados, novo bloco "Últimos Pagamentos (Geral)", Histórico de Lançamentos.
- "Ganhos por Loteria" e "Registrar Lançamento" viraram botões que abrem janelas próprias (`_abrir_ganhos_por_loteria`/`_abrir_registrar_lancamento`) — não competem mais por espaço com informação essencial.
- Novo seletor de bolão: cartões clicáveis (`_atualizar_cartoes_bolao`) em vez do combo pequeno do cabeçalho. `_on_bolao_sel` fatorado numa `_selecionar_bolao_por_id` compartilhada.
- Abaixo do seletor: resumo do bolão (6 KPIs) primeiro, detalhe depois — mesmo conteúdo de antes, reordenado.

## Agentes a utilizar

1. **Agente Arquiteto** — analisa a estrutura atual do código, mapeia dependências e propõe o desenho técnico da nova versão (módulos, fluxo de dados, pontos de risco).
2. **Agente de Levantamento de Requisitos** — lê o código e/ou documentação existente e lista requisitos funcionais e não funcionais da versão nova, incluindo o que NÃO pode regredir.
3. **Agente Desenvolvedor Core** — implementa a lógica principal/backend da nova versão conforme o desenho do Arquiteto.
4. **Agente Desenvolvedor de Interface** — implementa ou ajusta a camada de UI/UX (Tkinter, React, etc.), quando aplicável.
5. **Agente de Dados/Persistência** — cuida de schema de banco, migrações e integridade dos dados existentes.
6. **Agente de Testes/QA** — escreve e roda testes (unitários e de integração), cobrindo cenários críticos e casos de borda.
7. **Agente Revisor de Código** — revisa tudo que os demais agentes produziram, aponta contradições, riscos, código duplicado e desvios do desenho original.
8. **Agente de Segurança e Performance** — avalia riscos de segurança (validação de dados, exposição de credenciais, etc.) e gargalos de performance.
9. **Agente de Documentação** — atualiza README, changelog e comentários relevantes, documentando o que mudou e por quê.

## Fluxo de trabalho esperado

1. Arquiteto + Levantamento de Requisitos trabalham primeiro e em paralelo, depois convergem num plano único.
2. Desenvolvedores (Core, Interface, Dados) implementam com base no plano aprovado.
3. QA e Revisor atuam sobre o código já implementado, de forma independente entre si.
4. Segurança/Performance revisa por último, antes da documentação.
5. Ao final, apresente um **resumo consolidado**: o que foi feito, decisões tomadas, contradições encontradas entre agentes (se houver) e como foram resolvidas, e o que ficou pendente.

## Regras obrigatórias

- Cada agente deve declarar explicitamente seu papel e escopo antes de agir.
- Nenhum agente deve sobrescrever o trabalho de outro sem justificativa registrada.
- Aponte **contradições** entre as decisões dos agentes (ex: Arquiteto propõe X, mas Desenvolvedor implementa Y) antes de finalizar.
- Não quebrar funcionalidades existentes sem aviso explícito no resumo final.
- Ao terminar, listar arquivos alterados/criados e comandos para rodar/testar a nova versão.
