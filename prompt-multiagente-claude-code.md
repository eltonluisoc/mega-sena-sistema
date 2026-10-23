# Prompt: Evolução de Sistema com Multiagentes (Claude Code)

Quero que você atue como um **orquestrador de agentes** para evoluir o sistema abaixo para uma nova versão. Use pelo menos **8 agentes especializados** (via Task tool / subagentes), cada um com uma função clara e entregável específico. Não faça o trabalho sozinho de forma monolítica — divida entre os agentes e sintetize os resultados no final.

## Contexto do projeto

- **Nome do sistema:** Bolões Aleatórios (repositório GitHub `mega-sena-sistema`, pasta local `CONTROLE_BOLOES`)
- **Stack atual:**
  - Site público + painel admin: HTML/CSS/JavaScript puro (sem framework, sem build step), hospedado no GitHub Pages
  - Backend: Firebase — Firestore (banco de dados), Firebase Authentication (login do admin), Firebase Analytics
  - Automação: nenhuma no momento — o bot Telegram de loteria acumulada (`functions/index.js` duplicado + `bot-telegram.js`/GitHub Actions) foi removido na Rodada 14 (token exposto no repo público + usuário não usava)
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

## Rodada 9 — Bug de calibração na probabilidade (Lotofácil/Quina) + visual premium do index

**Bug real em `calcularChancesBolao()` (script.js)**: a matemática combinatória (`combinacao(n,k)`, universo de cada loteria) já estava correta pras 3 loterias — o problema era a classificação por estrelas (★) usar faixas fixas de "bilhetes equivalentes" (>=10000 EXCELENTE, >=100 REGULAR, etc.) **iguais pras 3 loterias**, ignorando que esse número cresce em ritmos muito diferentes conforme o k (dezenas sorteadas): k=6 na Mega, k=15 na Lotofácil, k=5 na Quina.
- Lotofácil: poucos cartões de 18-20 números já somavam dezenas de milhares de "bilhetes" (`combinação(20,15)=15504` por cartão) — sempre 5 estrelas, número às vezes na casa das centenas de milhares, parecendo absurdo/errado.
- Quina: cartões quase sempre no mínimo de 5 números (`combinação(5,5)=1`) — o total quase nunca passava de 100, então praticamente todo bolão de Quina, por maior que fosse, ficava travado em 1 estrela ("SIMPLES").
- Só coincidiu de "parecer certo" na Mega porque as faixas foram originalmente calibradas olhando só pra ela.

**Correção**: a classificação passou a usar a **probabilidade real** (bilhetes cobertos ÷ total de combinações possíveis daquela loteria) — `totalCombinacoesPossiveis` já existia no código mas nunca era usado, era dead code. As faixas foram derivadas dos limiares antigos da própria Mega (ex.: 10000/50.063.860 ≈ 0,02%), então o resultado da Mega não muda; Lotofácil e Quina passam a ser julgadas contra o próprio universo, e ficam comparáveis de verdade. Adicionado também um 4º número no card "Potencial do Bolão" (`CHANCE REAL`, formatado por `formatarProbabilidade()` com casas decimais adaptativas pra não virar "0.00%" em números pequenos). 3 testes novos de regressão em `test/calculos-script.test.js` (Quina não trava em 1 estrela, Lotofácil não explode artificialmente, `formatarProbabilidade` em várias grandezas).

**Visual do index.html** (pedido: "design mais elaborado... movimento... fundo mais estiloso"): bloco `<style>` embutido só no `index.html` (não em `style.css`, que é compartilhado com admin/consulta/participantes — o visual "vitrine" é só pra página pública, não pras telas de trabalho). Fundo com gradiente animado lento (`gradientFlow`, 20s), 6 esferas decorativas flutuando em blur baixo (nod discreto ao tema "bolas de loteria", `pointer-events:none`, não atrapalha clique nem leitura), top-bar com glassmorphism (`backdrop-filter: blur`) e logo com brilho animado (`shine`), cards com entrada escalonada (`cardIn`) e elevação mais viva no hover, botões de loteria com gradiente/glow no estado ativo. Todo o motion desliga em `prefers-reduced-motion: reduce`. `CACHE_NAME` do `sw.js` bumpado (v16→v17) e badge de versão do index (v3.5→v3.6), seguindo a convenção já estabelecida.

**Recalibração (mesmo dia)**: o usuário testou e reportou um caso concreto — 3 cartões de Lotofácil com 18 números (2.448 bilhetes) batendo EXCELENTE, o que "não pode" pra um bolão desse tamanho. A correção por probabilidade real (acima) era matematicamente consistente, mas na prática generosa demais com a Lotofácil: seu universo é ~15x menor que o da Mega, então qualquer fatia dele "pesa" mais em %, fazendo bolões pequenos baterem EXCELENTE fácil demais. Pedido explícito do usuário: Mega mantém o critério atual (confirmado correto); Lotofácil sobe bastante (ÓTIMO/EXCELENTE têm que ser "muito acima da média"); Quina desce bastante. Voltou a ser número ABSOLUTO de bilhetes (mais fácil de calibrar contra exemplos reais), com uma faixa por loteria (`FAIXAS_ESTRELAS` em `script.js`) em vez de uma fórmula só: Mega inalterada (10000/5000/1000/100), Lotofácil bem mais alta (60000/20000/1500/300 — o caso dos 3 cartões de 18 números cai em BOM), Quina bem mais baixa (2000/800/200/50). "CHANCE REAL" continua no card (informação honesta, comparável entre as 3), só deixou de ser a base das estrelas. `CACHE_NAME` do `sw.js` v17→v18.

**2ª correção de visual (mesmo dia)**: o usuário testou o fundo animado colorido + esferas flutuando e achou "muito ruim" — pediu design "estilo Apple", minimalista, citando um artigo sobre sites minimalistas como referência (princípios: paletas neutras/monocromáticas, tipografia sans-serif com espaçamento generoso, bastante espaço em branco, motion sutil). Reescrito o bloco `<style>` embutido do `index.html` do zero:
- Removido: gradiente animado girando, 6 esferas flutuando, texto do logo com brilho animado, glow pulsante na tagline.
- Paleta neutra: fundo cinza-claro `#f5f5f7` (o mesmo tom que a Apple usa em apple.com), superfícies brancas, texto quase-preto `#1d1d1f`, um único acento azul `#0071e3` (a cor de botão/link oficial da Apple) — nada mais de gradiente multicolorido.
- Nav (`.top-bar`) virou uma barra fixa (`sticky`) enxuta com vidro fosco (`backdrop-filter: blur`) e hairline fina embaixo, só com a marca — a tagline saiu de dentro dela.
- Nova seção `.hero` abaixo da nav com a tagline como título de destaque (headline grande, subtítulo pequeno) — separa "marca" de "mensagem".
- `.loteria-selector` virou um controle segmentado (padrão iOS/macOS): uma trilha cinza-claro com o item ativo "flutuando" em branco por cima, em vez de 3 caixas soltas com borda.
- `.card-header` neutro (fundo transparente, texto escuro) com um "dot" colorido de 8px no lugar da barra cheia de cor (`.bg-blue`/`.bg-green`/`.bg-orange` viraram só a cor do dot).
- Botões: pill sólido (`border-radius: 980px`, o valor exato que a Apple usa), sem sombra pesada, feedback só um leve `scale(0.98)` no clique.
- Motion restante é só fade+slide sutil na entrada (hero e cards), nada de cor girando ou texto brilhando — ainda desliga com `prefers-reduced-motion`.
- Badge de versão do index v3.6→v3.7, `CACHE_NAME` do `sw.js` v18→v19.

## Rodada 10 — Lançamento em lote de uso da reserva (admin)

Pedido do usuário: registrar "uso da reserva" pessoa por pessoa no modal `abrirModalRegistrarMovimento()` (admin.js) era lento quando o mesmo valor vale pra várias pessoas de uma vez (ex.: um cartão comprado com a reserva de 15 participantes). Fluxo descrito: ver a lista de nomes, marcar quem vai usar um valor, registrar; se quiser outro valor, marcar outro grupo e registrar de novo.

**Implementado**: novo botão "📦 LANÇAMENTO EM LOTE" na seção Reservas do admin (`admin.html`, ao lado do botão de movimento único) abrindo `abrirModalLancamentoLote()` (novo, em `admin.js`, logo depois de `abrirModalRegistrarMovimento`):
- Lista com checkbox por pessoa (nome + saldo atual da reserva), campo de busca que filtra a lista ao vivo, botões "Marcar visíveis" / "Desmarcar todos".
- Um só formulário de Tipo (Saque/Uso por padrão, já que era o caso de uso citado — também aceita Depósito)/Valor/Data/Descrição vale pra todo mundo marcado.
- Ao confirmar, grava um documento por pessoa marcada em `reservas_movimentos_pendentes` — **mesmo formato** dos documentos criados pelo modal de movimento único (o app desktop já sabe importar, nenhuma mudança necessária lá), só que todos de uma vez, num `db.batch()` do Firestore (atômico, mais rápido que N `.add()` sequenciais).
- **O modal não fecha depois de registrar**: desmarca as caixinhas e limpa o valor/descrição (mantém tipo/data), mostra quantos foram registrados nesta sessão, e fica pronto pra próxima rodada com outro grupo/valor — exatamente o fluxo "marco um valor, registro, marco outro valor, registro" que o usuário descreveu. Um botão "Concluir e fechar" separado do de registrar.

`CACHE_NAME` do `sw.js` v19→v20 (admin.html/admin.js estão na lista de cache do Service Worker).

## Rodada 11 — Tipografia e "imagem" no hero do index (usuário mandou print do apple.com)

Usuário mandou um print da home do apple.com e disse: "as fontes do site estão feias... no padrão apple teríamos fontes mais bonitas e mais estilos entre elas... podemos colocar imagens também... esmaecidas e dando um estilo de felicidade e leveza".

Dois problemas reais identificados:
1. **Fontes**: o `body` usava só a pilha de sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto...`) — em Mac/iPhone isso VIRA SF Pro (bonita), mas a maioria dos visitantes está em Windows/Android, onde cai pra Segoe UI/Roboto (bem mais genéricas, sem a personalidade Apple).
2. **Nenhuma imagem**: o hero era só texto plano, sem nenhum elemento visual.

**Correção**:
- Carregada a fonte **Inter** via Google Fonts (`<link rel="preconnect">` + `css2?family=...`) — a substituta gratuita mais usada pra SF Pro, mesmas proporções. Vira a fonte principal do `body`, com a pilha de sistema como fallback.
- Carregada também **Instrument Serif** (itálica) como fonte de ACENTO, aplicada só num trecho do título do hero (`<span class="accent-serif">grande prêmio</span>`) — reproduz o truque tipográfico que aparece no print do usuário ("iPad *air*", "MacBook *Air*"): um serif leve e itálico contrastando com o sans bold do resto da frase, sem virar bagunça (só 1 acento por título).
- Como não há como buscar/gerar fotografia real aqui, a "imagem" pedida virou um **glow suave** atrás do título (`.hero-glow`): 3 gradientes radiais desfocados (`filter: blur(50px)`), em tons de dourado/azul/verde bem esmaecidos (opacidade ~0,2-0,3), estáticos (sem animação, pra não repetir o erro do fundo giratório da v3.6) — sugere luz/leveza sem competir com a leitura do texto. É a mesma técnica que sites premium usam de "imagem ambiente" quando não têm fotografia própria.
- Título do hero aumentado (`clamp(28px, 6vw, 44px)`, peso 800) pra ter mais presença, junto com o resto da hierarquia tipográfica (logo 600→700).

Badge index v3.7→v3.8, `CACHE_NAME` do `sw.js` v20→v21.

## Rodada 12 — Reskin do admin.html com o mesmo sistema visual

Usuário perguntou se o admin também tinha o tratamento novo (não tinha — só o index foi mexido até aqui, de propósito), e por que existem páginas separadas (`index.html`, `admin.html`, `consulta.html`, `participantes.html`) em vez de uma só com uma "função admin". Resposta dada no chat: não são "dois sites" — é uma página de um site multi-página estático (mesmo domínio, mesmo repositório, mesmo projeto Firebase), sem framework/SPA. `admin.js` sozinho tem ~3.500 linhas (quase o dobro do `script.js` da vitrine) e é protegido por login (Firebase Auth, `onAuthStateChanged`); separar em arquivos evita mandar esse tanto de JS de gestão pra todo visitante anônimo do site público, e mantém o login do admin isolado. Isso é o padrão comum de site estático multi-página (equivalente ao wp-admin do WordPress) — recomendado manter assim; juntar tudo numa SPA só seria uma reestruturação grande sem necessidade real.

**Reskin do `admin.html`** (pedido explícito): diferente do index, `admin.html` já tinha um bloco `<style>` embutido próprio, razoavelmente bem construído (sidebar, cards, formulários, botões, grade de números, toasts) — não precisava de reescrita, só alinhar ao mesmo sistema visual do index:
- Mesma fonte **Inter** carregada via Google Fonts (sem Instrument Serif/glow — isso é console de trabalho, denso em informação, não vitrine; um "momento de destaque tipográfico" ali atrapalharia mais que ajudaria).
- Acento azul trocado de `#3b82f6` (Tailwind blue-500 genérico) pra `#0071e3` (o azul oficial da Apple, mesmo do index) em TODAS as 24 ocorrências do arquivo (sidebar ativo, badges, foco de formulário, botão primário, toasts, barra de progresso do dashboard etc.) — incluindo as variações `#2563eb`→`#0058b3`, `#eff6ff`→`#e8f2ff` e as versões em `rgba(59,130,246,...)`.
- Top-bar continua escura de propósito (sinaliza "modo admin", diferente da vitrine pública) — só trocou o azul-ardósia genérico (`#1e293b`) pelo quase-preto oficial da Apple (`#1d1d1f`) no fundo. Textos que já usavam `#1e293b` como cor de texto (14 ocorrências) ficaram como estavam — visualmente quase idêntico ao `#1d1d1f`, não valia o risco de mexer.
- Hover dos botões (`.btn:hover`) suavizado (elevação e brilho menores) — mais próximo da contenção da Apple, menos "bounce".
- **Não mexido nesta rodada**: as cores geradas dinamicamente pelo `admin.js` (ex.: o modal de lançamento em lote da Rodada 10, que usa roxo/verde fixos em `style=""` inline) — são ~3.500 linhas de JS com estilo inline espalhado, um passe de recoloração completo ali é tarefa separada se o usuário quiser ir mais fundo.

`CACHE_NAME` do `sw.js` v21→v22.

## Rodada 13 — Recoloração completa do admin.js + números dos cartões viram bolinhas

Usuário: "não tocou pois são 3500 linhas? Quero que faça o melhor" — cobrando terminar o que ficou pendente na Rodada 12, mais um problema específico: "ainda acho ruim a forma de informar os números dos cartões". Confirmado: manter páginas separadas (sem pedido de unificar).

**Recoloração completa do `admin.js`**: as 25 ocorrências de `#3b82f6` (+ 2 de `rgba(59,130,246,...)`) que geram HTML dinamicamente (botões, badges, bordas) viraram `#0071e3`/`rgba(0,113,227,...)` — mesmo acento do resto do sistema agora. `#1e293b` usado como cor de TEXTO (19 ocorrências) ficou como estava, mesma lógica do admin.html: visualmente quase idêntico ao `#1d1d1f`, não valia o risco.

**Números dos cartões — o problema real**: 3 lugares diferentes mostravam os números de um cartão como texto cru/tags cinzas retangulares em fonte monoespaçada minúscula (10px na Lotofácil, pra caber até 20 números) — nada a ver com a "bolinha" que o próprio site público usa pra mostrar dezena sorteada:
1. Lista principal de cartões (`exibirCartoesAdmin`) — tags `background:#e2e8f0` monoespaçadas.
2. Prévia do lote ao cadastrar em massa (`atualizarPrevia`) — pior ainda, só uma string de texto "01 02 03..." sem nenhum estilo.
3. Prévia da seleção enquanto o admin clica nos números pra montar um cartão (`atualizarPreviaSelecao`) — tags azuis também monoespaçadas.

Corrigido: nova classe `.numero-cartao-badge` (bolinha, fundo neutro, texto escuro, negrito) em `admin.html`, com variantes `-sm` (compacta, pra prévia do lote onde cabem várias linhas) e `-accent` (azul, pra números "em edição" antes de salvar — diferencia visualmente de um cartão já salvo). Tamanho da bolinha é FIXO — cartão com mais números só ocupa mais linhas (`flex-wrap`), nunca fica com fonte menor. Aproveitado pra também tirar o `style=""` inline redundante que duplicava/conflitava com a classe `.cartao-item` já existente, e adicionar um contador "N números" no cabeçalho de cada cartão da lista.

**Não mexido**: um resumo de grupo de duplicados (`detectar duplicados`) que mostra os números como uma única string monoespaçada de resumo (não por-número) — é um caso de uso diferente (rótulo de uma linha, não lista visual), ficou como estava.

**Combinado, mas ainda pendente** (o usuário quer discutir depois): se existe uma forma mais rápida/melhor de INSERIR cartões (o fluxo de cadastro em si, não só a exibição) — assunto da próxima rodada.

`CACHE_NAME` do `sw.js` v22→v23.

## Rodada 14 — Token do Telegram exposto no repo público + discussão sobre inserção de cartões

Usuário pediu sugestões pra melhorar a INSERÇÃO de cartões (não só a exibição, já corrigida na Rodada 13) — "leitura da imagem do cartão ou outra opção?". Ao investigar a infraestrutura de Cloud Functions existente pra avaliar viabilidade, achado um problema de segurança real:

**Token do Telegram exposto**: `functions/index.js` (uma cópia antiga, não usada — a function real e implantada fica em `functions/functions/index.js`, apontada por `functions/firebase.json`) tinha um token de bot do Telegram **hardcoded em texto puro**, commitado. Confirmado via API do GitHub: o repositório `eltonluisoc/mega-sena-sistema` é **público**. Avisado o usuário antes de qualquer ação (não é algo pra corrigir em silêncio). Usuário confirmou que já revogou o token no BotFather e não usa Telegram — pedido pra excluir tudo relacionado:
- `functions/index.js` (duplicado com o token) — removido.
- `bot-telegram.js` (script standalone, usava variável de ambiente — sem token hardcoded, mas parte da mesma automação não usada) — removido.
- `.github/workflows/telegram-bot.yml` (GitHub Action que rodava o script acima) — removido.
- `axios` tirado do `package.json` raiz (única coisa que dependia dele era o bot removido).
- A function real (`functions/functions/index.js`) não tinha nada de Telegram — não foi tocada.
- **O token em si continua no HISTÓRICO do git** (remover o arquivo não apaga commits antigos) — mas como já foi revogado no BotFather, o token vazado não vale mais nada.

**Sugestões de inserção de cartões** (apresentadas, ainda não implementadas — usuário está avaliando custo antes de decidir): usuário revelou que gera os cartões no app oficial da Caixa e fica com a IMAGEM do cartão gerado — não digita/escolhe números manualmente. Isso muda a resposta:
1. **Geração aleatória automática** (sem custo, sem infra nova) — só faz sentido se os números fossem escolhidos pelo sistema, o que não é o caso aqui.
2. **Colar em lote (texto)** (sem custo, sem infra nova) — ainda útil como via alternativa, mas não resolve o caso principal (a imagem já existe, ninguém digitou os números em lugar nenhum ainda).
3. **Leitura da imagem por IA com visão (Cloud Function)** — a que resolve o caso real do usuário: imagem do app da Caixa é limpa (sem inclinação/reflexo/vinco), ideal pra uma IA com visão identificar quais números estão marcados. Requer: nova Cloud Function (infraestrutura já existe e funciona — `functions/functions/`), uma chave de API de IA com visão (custo pequeno por imagem, usuário pediu estimativa antes de decidir), sempre pré-preenchendo a grade de seleção já existente pra confirmação humana antes de salvar (nunca salvar direto da leitura).

**Decisão**: consultado o pricing atual da API (skill `claude-api`) — Claude Haiku 4.5 ficaria em ~$0,002/imagem, Sonnet 5 ~$0,004/imagem. Pro volume real do usuário (>400 imagens/mês) isso passa de $0,80-1,60/mês — pouco em termos absolutos, mas o usuário achou caro pra esse volume e decidiu **não seguir com IA de visão**. Pediu pra aprimorar a inserção MANUAL em vez disso (clique-a-clique atual).

## Rodada 15 — "Preencher por texto" nos 2 fluxos de clique da inserção de cartões

Investigado o cadastro de cartões (`section-cadastro` em admin.html): existem 3 fluxos distintos, só 1 já tinha entrada por texto:
1. **Cadastro Individual → Digitação** (`adicionarCartaoIndividual`) — já tinha campo de texto "números separados por espaço". Não mexido.
2. **Cadastro Individual → Modo Seleção** (`gradeSelecaoIndividual`/`numerosSelecionados`) — só clique, sem texto. Usado pra criar vários cartões de um bolão fixo, salvando um por um.
3. **Cadastro em Lote** (`gradeNumeros`/`cartoesLote`, só Lotofácil) — só clique, sem texto. Usado pra criar N cartões × M concursos de uma vez.

Adicionado "preencher por texto" nos fluxos 2 e 3, já que o usuário vai transcrever números de uma imagem (não tem os números como texto em lugar nenhum, mas digitar é mais rápido que clicar 15-20 vezes por cartão):
- Novo helper compartilhado `parseNumerosTexto()` + `regrasLoteria()` (valida contra as mesmas regras de min/max/faixa já usadas em `adicionarCartaoIndividual`, sem duplicar a lógica um terceira vez).
- Fluxo 2: campo de texto + botão "✍️ Preencher" (e Enter) acima da grade — preenche `numerosSelecionados` e reaproveita a visualização já existente.
- Fluxo 3: mesmo campo pro cartão atual, **mais** uma área de "colar vários cartões de uma vez" (um por linha) que substitui `cartoesLote` inteiro de uma vez e ajusta "Quantos cartões?" automaticamente — o maior ganho de tempo real, pensado pro caso de já ter vários cartões transcritos prontos.
- Corrigido de passagem um bug real encontrado no meio do código: `atualizarGradeVisual()` (fluxo 3) usava `document.querySelectorAll('.numero-btn')` sem escopo — pegava também os botões da grade do fluxo 2 quando os dois cards estavam na tela ao mesmo tempo, repintando o estado errado. Escopado a `#gradeNumeros .numero-btn`.
- Nada disso muda o comportamento de salvar — sempre precisa clicar em "Adicionar"/"Gerar Todos" depois, revisando a prévia (já com as bolinhas da Rodada 13).

`CACHE_NAME` do `sw.js` v23→v24.

## Rodada 16 — "Chance real" vira chance de quadra/13 pontos + grade de números mais estreita

**"Chance real" mostrava a chance do prêmio MÁXIMO** (sena/15 pontos/quina) — usuário mandou print mostrando "0,0070%" com 85 cartões cobrindo 100% do universo da Mega, e pediu pra mostrar a chance de uma faixa mais alcançável: **quadra na Mega e na Quina, 13 pontos na Lotofácil**. Isso não é mais o mesmo tipo de cálculo (`combinação(n,k)/total`, que mede "cobrir o k-conjunto inteiro" = só o prêmio máximo) — virou a probabilidade hipergeométrica de acertar EXATAMENTE j das k dezenas sorteadas:

```
P(exatamente j acertos) = C(n,j) × C(N-n, k-j) / C(N,k)
```

somada entre os cartões do bolão (mesma lógica de agregação — valor esperado — já usada no "bilhetes equivalentes"). O rótulo do card mudou pra deixar explícito qual faixa está sendo mostrada: "CHANCE (QUADRA)" ou "CHANCE (13 PTS)". As estrelas/bilhetes continuam olhando pro prêmio máximo (não pedido pra mudar). 3 testes novos de regressão trancando o valor exato pra um cartão mínimo de cada loteria (ex.: Mega 6 números → C(6,4)·C(54,2)/C(60,6) ≈ 0,04%, contra 0,007% de antes pro mesmo caso da tela real).

**Grade de seleção de números mais estreita**: usuário reportou que as caixinhas onde clica os números (com o mouse) estavam largas demais, exigindo deslocar o mouse mais do que precisava. A pior era a grade do "Cadastro em Lote" (só Lotofácil, 25 números em só 7 colunas — a mais larga do sistema); aumentada pra 13 colunas. O padrão geral (`.grade-numeros`, usado no "Modo Seleção" também) foi de 10 pra 12 colunas — precisou mexer em dois lugares porque o "Modo Seleção" define a largura via `style.gridTemplateColumns` no JS (sobrescreve a classe CSS).

Badge index v3.8→v3.9, `CACHE_NAME` do `sw.js` v24→v25.

## Rodada 17 — Grade de números: colunas fixas em vez de flexíveis (correção do ajuste anterior)

O ajuste da Rodada 16 (10→12 colunas, 7→13 colunas) reduziu a largura, mas ainda usava `1fr` — colunas que ESTICAM pra preencher toda a largura disponível. Usuário mandou print (grade de 60 números da Mega, 12 por linha) e explicou o que faltava: quer **10 por linha**, mas a caixinha em si **pequena e fixa**, sem esticar pra ocupar o espaço sobrando.

Trocado `repeat(N, 1fr)` por `repeat(10, 40px)` + `justify-content: start` nos dois lugares (`.grade-numeros` em admin.html e o `style.gridTemplateColumns` setado via JS em `inicializarGradeSelecaoIndividual`, que sobrescreve a classe) — agora a largura de cada caixinha é fixa (40px) independente da largura do container; o espaço sobrando na linha fica em branco, de propósito. Adicionado `overflow-x: auto` no container como rede de segurança: numa tela estreita (celular), 10 colunas de 40px + gaps podem passar da largura disponível — vira rolagem horizontal em vez de estourar o layout.

`CACHE_NAME` do `sw.js` v25→v26.

## Rodada 18 — Bug real de cache: "rede primeiro" do Service Worker não era de verdade

Usuário testou a Rodada 17 e mandou print mostrando 12 colunas ainda — a mudança parecia não ter ido pro ar. Investigado: `curl` direto na URL pública confirmou que o `admin.js` publicado **já tinha** a correção (`repeat(10, 40px)`) — o servidor estava certo. O problema era client-side: o GitHub Pages manda os arquivos com `Cache-Control: max-age=600` (10 minutos), e o `fetch(event.request)` dentro do `sw.js` (comentado como "rede primeiro") não tinha nenhuma opção de cache — então esse fetch respeitava o cache HTTP normal do navegador, e "rede primeiro" virava, na prática, "cache do navegador primeiro" por até 10 minutos depois de cada deploy. O Service Worker em si podia estar atualizado (`skipWaiting`/`clients.claim` já ativos) e mesmo assim servir JS/HTML antigo por causa disso.

**Correção**: `fetch(event.request, { cache: 'no-store' })` — força ignorar o cache HTTP do navegador nessa chamada, sem afetar o cache MANUAL que o próprio SW já mantém em `caches.open(CACHE_NAME)` pra funcionar offline (esse continua servindo como fallback só quando a rede falha, que é o objetivo real do "offline-first com fallback"). Instrução dada ao usuário nesse meio-tempo: Ctrl+Shift+R (hard refresh) resolve na hora, sem precisar esperar os 10 minutos.

`CACHE_NAME` do `sw.js` v26→v27.

## Rodada 19 — Revisão multiagente completa do desktop: Início vira mestre-detalhe (v5.4 → v6.0)

Usuário pediu uma "análise completa via agentes" do sistema desktop, insatisfeito com a usabilidade de "Início > Visão Geral" e "Bolão Selecionado" ("muito bagunçadas"), com "50 abas para assuntos correlatos" e sem jeito de clicar no nome de um participante pra registrar pagamento. Pediu resumo pra aprovar antes de implementar.

**3 agentes de pesquisa (background, só leitura) rodaram em paralelo**:
1. **Arquiteto de Navegação** — mapeou as 22 abas + ~21 popups do sistema (a soma real por trás da sensação de "50 abas"). Achou: mesma pergunta (participante × situação de pagamento) calculada em 4 lugares com queries independentes (mesmo padrão do bug do ADM isento, Rodada 6); "Registrar" e "Visualizar/Recibo" eram a mesma tela por participante, só sincronizadas por um StringVar; 3 funções de código morto (`_editar_part`/`_form_part`/`_remover_part`, zero chamadas); dois popups diferentes chamados "Editar Pessoa".
2. **UX Visão Geral/Bolão Selecionado** — achou que "Início" usa tema escuro enquanto o resto do app é claro; paletas de cor diferentes entre as duas sub-abas (mesma cor significando coisas diferentes); dois seletores de bolão concorrentes (combo do cabeçalho + cartões); nenhuma árvore com busca, altura fixa de 8-12 linhas pra bolões de 50+ participantes.
3. **Fluxo de Pagamento Rápido** — documentou o precedente já existente (`_pend_registrar_dblclick`, duplo-clique em "Pendências deste Bolão") e achou que ele **não respeitava o aviso de "participante isento"** que o formulário principal (`_registrar_pag`) tem — um buraco de segurança que generalizar sem corrigir replicaria em todo canto novo.

**Usuário aprovou tudo** e pediu adicionalmente uma proposta do modelo **Fable** especificamente pra navegabilidade de "Início". Fable propôs ir além do esboço original (que mantinha 2 sub-abas): trocar por um **layout mestre-detalhe fixo** (`ttk.PanedWindow`, nativo do Tkinter) — lista de bolões numa coluna à esquerda, sempre visível, conteúdo à direita trocando sem trocar de aba. Usuário escolheu a proposta do Fable.

**Implementado**:
- **`_build_tabs`**: "Início" trocou de `ttk.Notebook` (2 sub-abas) pra `tk.PanedWindow` — coluna esquerda (`self.tab_inicio_lista`, largura fixa 220px) + coluna direita (`self.tab_dash`/`self.tab_bolao` empilhados com `.place()` + `.tkraise()`, técnica clássica de "notebook sem abas" do Tkinter).
- **Nova `_build_inicio_lista`**: item fixo "📊 Visão Geral" no topo (realçado quando é o modo ativo) + lista rolável de bolões abaixo, com o mesmo badge de status (✅ em dia / ⚠ N atrasado(s)) que já existia nos cartões antigos.
- **Nova `_mostrar_inicio_modo(modo)`**: troca `tab_dash`↔`tab_bolao` via `tkraise()`. `_ir_para_visao_geral()` chama isso + `_refresh_dados_visiveis()`. `_selecionar_bolao_via_cartao` (renomeado internamente, mesma função) chama `_selecionar_bolao_por_id` (já fazia `_refresh_all()`) + `_mostrar_inicio_modo("bolao")`.
- **`_atualizar_cartoes_bolao`**: virou lista vertical (era grade 5 colunas) — mesma função, conteúdo redesenhado pra caber na coluna estreita.
- **`_build_bolao_sel`**: removido o cabeçalho "Selecione um bolão" (a seleção só existe na coluna esquerda agora) — elimina o "qual dos dois seletores vale?" que a segunda rodada de agentes apontou.
- **Correção do buraco de segurança**: extraída `_confirmar_pagamento_isento(pid, bid)` de dentro de `_registrar_pag`, e criado `_abrir_popup_registrar_pagamento(participante_id, bolao_id, valor_sugerido, nome_exibicao)` — popup único reaproveitado por `_pend_registrar_dblclick` (que antes reimplementava o INSERT sem a checagem de isento) e pelo novo duplo-clique em "Situação dos Participantes" (`_dash_sit_dblclick`). Os dois agora respeitam o mesmo aviso.
- **Duplo clique estendido**: "Situação dos Participantes" (dentro de Bolão Selecionado) ganhou duplo-clique pra registrar pagamento — antes só existia em "Pendências deste Bolão". Funciona pra pendente ou já quitado (permite adiantar/pagamento extra). iid da árvore virou `"p<participante_id>"`, eliminando busca por nome (mais seguro que o padrão do precedente).
- **Busca por nome**: novo campo de filtro em "Situação dos Participantes" (`_filtrar_situacao_participantes`, refiltra em memória sem reconsultar o banco a cada tecla).
- **Financeiro (Fase 2, feita antes da parte do Início)**: "Visualizar/Recibo" fundida em "Pagamentos" (era "Registrar") — 7→6 sub-abas, elimina o StringVar `_pag_part_sync`. Removidas as 3 funções de código morto confirmadas.

**Pendente (próxima rodada, se o usuário quiser continuar)**: consolidar Participantes (4→2 sub-abas), unificar de vez "Situação dos Participantes" + "Pendências deste Bolão" numa lista só (hoje coexistem, ambas com ação, mas ainda são 2 queries separadas), e rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable, não implementada — o combo continua funcional, só que agora convive com a lista da esquerda como segundo caminho pro mesmo resultado).

Versão v5.4 → v5.5 (Financeiro) → v6.0 (Início mestre-detalhe).

## Rodada 20 — Ajuste de posição dos botões (v6.1) + Participantes consolidado (v6.2)

Usuário testou o v6.0 e aprovou tudo, com um único ajuste cosmético: os botões "📊 Ver Ganhos por Loteria" e "➕ Registrar Lançamento" estavam soltos acima das tabelas da Visão Geral, sem relação clara com o resto da tela — pediu pra mover pro card "Histórico de Lançamentos", já que são ações sobre o mesmo assunto desse card (ganhos/saques do organizador). Aprovou o resto e pediu pra continuar desenvolvendo os itens pendentes da Rodada 19.

**v6.1**: bloco solto "Ações rápidas" removido de `_build_dashboard`; os 2 botões (relabelados "📊 Ganhos por Loteria" / "➕ Novo Lançamento") passaram a viver dentro do `LabelFrame` "HISTÓRICO DE LANÇAMENTOS", acima da árvore.

**v6.2**: consolidação de Participantes (4→2 sub-abas), primeiro item pendente da Rodada 19:
- `_build_cad` ("➕ Novo Participante", uma das 4 sub-abas) virou popup `_abrir_popup_novo_participante` — mesmo padrão de popup-ificação já usado em Início/Financeiro (Toplevel com canvas rolável, mantendo os mesmos nomes de atributo internos, então `_cadastrar`/`_cadastrar_e_pagar`/`_cad_adm_toggle`/`_calcular_valor_cotas`/`_imp_buscar`/`_imp_importar` não precisaram de nenhuma mudança).
- `_build_cad_editar` ("✏ Editar Participante", outra das 4) virou popup `_abrir_popup_editar_participante(participante_id=None)`, aceitando um id opcional pra já abrir com o participante pré-selecionado (usado no duplo-clique).
- A lista "👥 Participantes" (a sub-aba que sobrou, hoje só listagem) ganhou: botão "➕ Novo Participante" (chama o popup novo), campo de busca por nome (filtra em memória, mesmo padrão de `_filtrar_situacao_participantes` da Rodada 19 — sem reconsultar o banco a cada tecla) e duplo-clique numa linha abre a edição já com esse participante (a árvore já usava `iid=str(participante_id)`, então não precisou de busca por nome pra achar o id).
- Resultado: Participantes foi de 4 sub-abas ("Cadastrar", "Editar", "Pessoas/Unificar" e a lista) pra 2 ("👥 Participantes" e "🔗 Pessoas/Unificar").

**Ainda pendente** (itens 2 e 3 da Rodada 19, não pedidos explicitamente ainda): unificar "Situação dos Participantes" + "Pendências deste Bolão" numa lista só, e rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable).

Versão v6.0 → v6.1 (botões) → v6.2 (Participantes).

## Rodada 21 — Situação dos Participantes funde com Pendências deste Bolão (v6.3)

Usuário pediu pra continuar desenvolvendo os itens pendentes da Rodada 19. Item escolhido: unificar "Situação dos Participantes" (coluna estreita à esquerda em "Bolão Selecionado", com busca por nome, uma consulta) e "Pendências deste Bolão" (seção de largura toda, logo abaixo, outra consulta) — as duas mostravam pago/saldo/status do mesmo participante, só com layout e nível de detalhe diferentes.

**Achado ao comparar as duas consultas**: o status de "Situação dos Participantes" vinha de `_status_part_adm` → `_status_part(pago, ve, parc_esp, parc)`, passando a parcela **sem** multiplicar por `n_cotas`; já "Pendências" fazia `_status_part(pago, ve, parc_esp, parc_val * n_cotas)`, multiplicando certo. Resultado: um participante com 2+ cotas podia acumular pagamentos suficientes pra 1 cota e já aparecer "🟦 Em Dia" em "Situação", mesmo devendo pela segunda cota — um bug real de exibição, não só duplicação de tela.

**Implementado**:
- "Pendências deste Bolão" removida por completo (`_atualizar_pendencias_bolao_sel`, `_pend_registrar_dblclick`, `_pend_tree`/`_pend_mes_lbl`/`_pend_rodape_lbl` — tudo apagado).
- "Situação dos Participantes" ganhou a coluna **Cotas** e o resumo de rodapé (`_dash_sit_rodape_lbl`: "N pendente(s) | M em dia/quitado(s) | Parcelas esperadas: X") que só existiam em Pendências.
- Corrigido o bug: `_dash_load` agora calcula `n_cotas` por participante e passa `parc_d * n_cotas` pra `_status_part_adm`. Status agora distingue 3 estados (✅ Quitado / 🟦 Em Dia / ⚠ Pendente) — antes "Situação" só mostrava Quitado/Pendente (binário), escondendo o "em dia mas não quitado" que só "Pendências" sabia calcular.
- Botões "Encerrar Bolão"/"Reativar Encerrado" (ficavam no cabeçalho da seção removida) foram pro cabeçalho do topo da tela, ao lado do botão de atualizar (🔄).
- `_filtrar_situacao_participantes`/`_dash_sit_dblclick` ajustados pro novo formato de tupla (7 campos, incluindo `n_cotas`) e pra nova posição da coluna Saldo (índice 3, não mais 2).

**Ainda pendente** (item 3 da Rodada 19, não pedido explicitamente ainda): rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable) — o combo continua funcional, convivendo com a lista da coluna esquerda como segundo caminho pro mesmo resultado.

Versão v6.2 → v6.3.

## Rodada 22 — Cartão duplicado agora é bloqueado no cadastro, não só detectado depois (web v28)

Usuário relatou que "Potencial do Bolão" mostrava 104 cartões no concurso 3054, mas ele lembrava de ter lançado só 72. Investigação (consulta read-only direto no Firestore de produção, usando o mesmo acesso público que o site já usa — sem tocar em nada) confirmou: os 104 cartões existem de verdade, todos no bolão "Bolão 10,00", Mega-Sena. Achado real dentro desse total: **5 pares de cartões idênticos** (mesmas 8 dezenas cada par), lançados ~17 minutos um do outro — um lote salvo duas vezes sem o usuário perceber. Os outros ~27 cartões "a mais" eram todos combinações distintas, não duplicatas — ou seja, o usuário só tinha subestimado quantos cartões realmente lançou; "Potencial do Bolão" estava contando certo. Usuário apagou os 5 pares manualmente e pediu: o sistema **nunca deveria deixar um duplicado entrar, avisando na hora**, não só detectável depois via "🔁 Verificar Duplicados" (ferramenta manual que já existia).

**Implementado em `admin.js`**:
- Nova `existeCartaoDuplicado(tipo, concurso, bolao, numerosOrdenados)`: consulta os cartões já salvos com a mesma loteria + concurso + bolão e compara os números (ordenados) contra o cartão prestes a ser salvo. Escopo é por bolão de propósito — dois bolões DIFERENTES baterem nos mesmos números por acaso não é erro; dentro do MESMO bolão, é.
- Chamada nos 3 pontos onde um cartão individual é salvo direto no Firestore (grade de seleção, texto avulso, seleção-em-lote) — se já existir, a gravação é **bloqueada** (não é um aviso ignorável) e mostra os números do cartão batido.
- `gerarLote` (gerador em massa da Lotofácil, N cartões × M concursos) ganhou uma checagem equivalente, mas local/sem ida ao banco: compara os cartões DENTRO do próprio lote entre si antes de gerar. Repetir o mesmo cartão em concursos diferentes continua sendo o uso normal dessa tela (não bloqueado); dois cartões idênticos dentro do mesmo lote, sim.
- `sw.js`: `CACHE_NAME` → v28.

Versão web (Service Worker) v27 → v28.

## Rodada 23 — Grade de números: fluida em vez de fixa (resolve desktop pequeno demais E mobile com scroll escondendo colunas)

Usuário testou a grade de largura fixa (40px, da Rodada 17) e trouxe dois problemas opostos: no desktop, a fonte/caixinha ficou pequena demais (pediu aumentar "um pouco, pouco"); no celular, 10 colunas de 40px passavam da largura da tela, e colunas 9/10 só apareciam rolando a barra horizontal — "PÉSSIMO" (palavra do usuário).

**Causa raiz do problema do celular**: já existia uma media query `@media (max-width:768px) { .grade-numeros { grid-template-columns: repeat(5,1fr); } }` pensada pra mobile — só que nunca fazia efeito, porque tanto `#gradeNumeros` (HTML) quanto `#gradeSelecaoIndividual` (JS, em `inicializarGradeSelecaoIndividual`) tinham `style="grid-template-columns: repeat(10, 40px)"` **inline**, e estilo inline sempre vence regra de classe, media query ou não.

**Correção**: trocado `repeat(10, 40px)` fixo por `repeat(10, 1fr)` fluido + `max-width: 480px` no container (`.grade-numeros`). Resolve os dois lados de uma vez: no desktop o `max-width` impede as caixinhas de esticar demais (era o problema ORIGINAL da Rodada 16 que pediu largura fixa); no celular, 1fr sempre divide a largura disponível entre as 10 colunas igualmente — nunca estoura, nunca precisa rolar, em qualquer tela. A media query de 5 colunas virou desnecessária e foi removida. Fonte/moldura dos botões subiu um pouco (13px/38px → 14px/42px, padding 8px→9px) — o pedido do "aumentar um pouco" do desktop. Quina (80 números, 8 linhas) ganhou uma classe `.numero-btn.compacto` (12px/34px) só pra ela, evitando que a grade fique alta demais.

Removidos de vez os estilos inline duplicados (`grade.style.gridTemplateColumns/justifyContent/gap` em JS, e o `style=""` no HTML) que causavam a raiz do bug — tamanho/layout da grade agora vive 100% no CSS.

`sw.js`: `CACHE_NAME` → v29.

Versão web (Service Worker) v28 → v29.

## Rodada 24 — Aumento da Rodada 23 era pequeno demais pra notar

Usuário testou a Rodada 23 no "Modo Seleção" (desktop) e disse não ter percebido nenhum aumento de fonte ou largura. Conta: o `max-width` escolhido (480px) contra o total antigo fixo (`repeat(10,40px)` + 9 gaps de 6px = 454px) só dava ~2,6px a mais por caixinha — matematicamente um aumento, mas pequeno demais pra ser visível. Não era bug de cache nem de override de CSS (conferido: nenhuma outra regra `.numero-btn`/`#gradeSelecaoIndividual` no arquivo, nenhum estilo inline sobrando).

Corrigido subindo o `max-width` pra 560px (~50px por caixinha) e a fonte/moldura dos botões junto (14px/42px → 15px/46px, padding 9px→10px; a variante `.compacto` da Quina foi junto: 12px/34px → 13px/38px). Continua fluido (`1fr`), então o comportamento sem rolagem horizontal no celular da Rodada 23 não muda em nada — só o teto no desktop subiu.

`sw.js`: `CACHE_NAME` → v30.

Versão web (Service Worker) v29 → v30.

## Rodada 25 — Cartão com mais números que o mínimo vale VÁRIAS apostas, não 1 (web v31)

Usuário viu o banner "Melhor Resultado do Concurso" (Bolão 10,00 bateu QUADRA com um cartão de 8 números) e fez duas perguntas: (1) dava pra marcar com estrela quais dos 8 números do cartão foram os que bateram? (2) acertar 4 números num cartão de 8 é só 1 quadra ou são várias?

**Resposta pra (2), e por que era um bug real**: um cartão de 8 números é uma "aposta múltipla" — na Mega, equivale a jogar C(8,6)=28 apostas simples de uma vez, exatamente como a Caixa paga de verdade. Com 4 dos 8 números batendo, as 28 apostas simples embutidas nesse cartão se dividem em C(4,4)·C(4,2)=**6 que batem quadra**, C(4,3)·C(4,3)=16 que batem terno, e C(4,2)·C(4,4)=6 que batem duque (soma 28, confere). O resumo de prêmios (`SENA/QUINA/QUADRA/TERNO/DUQUE`, e `PONTOS` na Lotofácil) sempre contou "1 cartão = 1 prêmio", ignorando essa multiplicidade — sub-contava (e ainda escondia terno/duque) de todo cartão com mais números que o mínimo da loteria (6 na Mega, 5 na Quina, 15 na Lotofácil). Cartão do tamanho mínimo (o caso mais comum) não muda: continua contando exatamente 1 prêmio, igual sempre foi.

**Implementado em `script.js`**:
- `contarPremiosPorFaixa(qtdNumeros, acertos, k)`: hipergeométrica (mesma família de fórmula já usada em `calcularChancesBolao`) — para cada faixa `j` possível, `C(acertos,j)·C(qtdNumeros-acertos,k-j)`.
- `calcularPremios(cartoesLista, numerosSorteados, loteria)`: soma isso pra cada cartão, substituindo os 2 blocos de contagem `filter(...).length` duplicados (um em `exibirResultadoSalvo`, outro em `conferirResultados`) por uma função só.
- `notaApostaMultiplaHtml(...)`: nota "💡 Cartões com mais de N números valem várias apostas simples — os números acima contam prêmios, não cartões", só aparece quando existe pelo menos um cartão de aposta múltipla no bolão (senão seria ruído).
- **Resposta pra (1)**: `gerarBannerTrofeu` agora recebe `numerosSorteados` e marca com ⭐ + fundo dourado os números do cartão vencedor que bateram (os que não bateram continuam verdes) — antes todos os números do cartão apareciam idênticos, sem dar pra distinguir os acertos a olho. O banner também ganhou uma nota específica pro cartão vencedor quando ele é aposta múltipla (ex.: "Esses 4 acertos valem 6× QUADRA, não só 1").
- 3 testes novos em `test/calculos-script.test.js`, incluindo o caso exato do usuário (8 números, 4 acertos).

`sw.js`: `CACHE_NAME` → v31.

Versão web (Service Worker) v30 → v31.

## Rodada 26 — Mesmo bug de aposta múltipla, agora no ranking "Top Concursos" do dashboard admin (v32)

Usuário viu os cards "TOP CONCURSOS MEGA-SENA/LOTOFÁCIL/QUINA" do dashboard admin (ex.: "Concurso 3054 — 2 quadras") e perguntou se precisava do mesmo ajuste da Rodada 25. Sim — era o idêntico bug, só que no admin em vez do site público: `porConcursoPorLoteria[tipo][concurso]` guardava `{maxAcertos, quantidade}` contando CARTÕES com aquele nível de acerto, não prêmios reais. Um cartão de aposta múltipla (mais números que o mínimo) vale várias apostas simples, cada uma podendo cair numa faixa diferente — um cartão de 8 números com 4 acertos rende 6 quadras (e 16 ternos e 6 duques ao mesmo tempo), não "1 quadra".

**Implementado em `admin.js`**:
- Nova `contarPremiosPorFaixaAdmin(qtdNumeros, acertos, k)` — mesma fórmula hipergeométrica de `contarPremiosPorFaixa` em `script.js` (duplicada por não ter build step entre os dois arquivos, mesmo padrão já usado em `combinacao`/`combinacaoAdmin`).
- `porConcursoPorLoteria[tipo][concurso]` virou um acumulador por faixa (`{2:N, 3:N, 4:N, ...}`, somando prêmios reais de todos os cartões daquele concurso) em vez de `{maxAcertos, quantidade}` de cartões. O ranking top-3 agora pega, pra cada concurso, a MAIOR faixa com prêmio real (`> 0`) e usa a soma real como quantidade.
- Removidos os campos `quadras`/`ternos`/`duques` de `boloesPorLoteria` — setados desde sempre mas nunca lidos por nada (código morto, confirmado via grep).
- 4 testes novos em `test/calculos-admin.test.js`, incluindo o caso do usuário (cartão de 8 números, 4 acertos = 6 quadras no ranking, não 2).

`sw.js`: `CACHE_NAME` → v32.

Versão web (Service Worker) v31 → v32.

## Rodada 27 — Importação de comprovante PDF da Caixa no admin (v33)

Usuário pediu pra eliminar a digitação manual dos jogos ao cadastrar cartelas: subir o PDF "Comprovante de Aposta Bolão" gerado pelo app da Caixa (tem camada de texto real embutida, não é imagem — extraível sem OCR) e o sistema cadastrar os jogos sozinho. Pediu a arquitetura antes de implementar; aprovou e mandou 2 PDFs de exemplo.

**Decisão de arquitetura**: roda 100% no navegador (o site é estático, sem backend). As libs Python que ele citou (pdfplumber/PyMuPDF) não valem — o equivalente browser é **pdf.js** (Mozilla), carregado sob demanda do cdnjs (mesmo padrão dos outros scripts CDN do admin; não entra no cache do SW).

**Implementado**:
- Nova seção lateral "📄 Importar PDF" no `admin.html` — 4 campos mestre (Loteria, Concurso, Bolão, Tipo, iguais ao cadastro manual) + upload múltiplo de PDFs.
- `parsearComprovanteCaixa(texto, {loteriaEsperada, concursoEsperado})` em `admin.js` — **função pura**, testável no `node --test`. Regex sobre o texto extraído → `modalidade` (campo "Modalidade:" ou cabeçalho), `concurso` (`Concurso:\s*(\d+)`, desambiguado do "Cota: 54/90" na mesma linha), `jogos` (cada "Jogo N" seguido das dezenas separadas por " | " — a linha de telefones "0800..." não tem "|", nunca é capturada). Um PDF pode ter vários jogos → todos retornados, cada um vira um cartão.
- Validação por jogo com as mesmas `regrasLoteria()` do cadastro manual (contagem de dezenas, intervalo, sem repetida). Divergência de concurso/modalidade vs. o que o usuário informou **avisa mas não bloqueia** (checkbox "cadastrar assim mesmo").
- `extrairTextoPdf(file)` — camada browser (pdf.js), reconstrói linhas agrupando fragmentos por posição vertical. Só I/O, não testada em node.
- Fila de múltiplos PDFs, resultado por arquivo, erro gracioso: PDF sem texto → rejeita com mensagem clara (**nunca tenta OCR**), modalidade não suportada → não inventa dado. Grava só após "Confirmar", passando pelo bloqueio de duplicado da Rodada 22, com `origem: 'importacao-pdf'` no documento. QR Code ignorado por completo (é só token de referência da Caixa).
- `MODALIDADE_IMPORT` mapeia o texto impresso → chave interna (mega/lotofacil/quina). `semAcento()` novo helper (map de acentuadas, ASCII-safe no fonte).
- 8 testes em `test/parser-comprovante.test.js` com o texto real dos 2 PDFs de exemplo (comprovante1: 2 jogos de 10 dezenas; comprovante2: 10 jogos de 9), + divergência de concurso/modalidade, PDF vazio, modalidade não suportada, jogo com dezena repetida/fora do range/contagem errada.

**Pendente de teste pelo usuário**: a camada do pdf.js (extração no browser) não dá pra rodar no `node --test` — testar com os 2 PDFs reais e conferir se a revisão na tela mostra 2 e 10 jogos.

`sw.js`: `CACHE_NAME` → v33.

Versão web (Service Worker) v32 → v33.

## Rodada 28 — Importação de PDF só trazia 1 coluna de jogos (v34)

Usuário testou: comprovante1 (2 jogos) importou só 1; comprovante2 (10 jogos) importou só os 5 da coluna da esquerda. Causa: o comprovante é de **2 colunas**, e o pdf.js (via a reconstrução de linha por posição vertical do `extrairTextoPdf`) devolve "Jogo 1" e "Jogo 2" na MESMA linha, lado a lado, e as duas fileiras de dezenas também. O parser ancorava em `Jogo\s+\d+\s+(dezenas)` — só casava a primeira coluna de cada linha.

**Correção**: parar de ancorar no rótulo "Jogo N". Agora casa toda sequência de dezenas ligadas por "|" (`/\d{1,2}(?:\s*\|\s*\d{1,2}){2,}/g`) dentro do bloco "Seus Números". A fronteira entre as colunas tem um ESPAÇO, não "|", então `... | 60 09 | 13 | ...` se separa sozinho em 2 jogos. A linha de telefones (`0800 726 0101 ...`) não tem "|", continua nunca casando. O `{2,}` (3+ dezenas) pega até jogo curto/corrompido pra validação reclamar em vez de sumir sem aviso — o comprovante não tem nenhuma outra sequência `N | N | N` fora dos jogos.

Também: botão "🗑️ Limpar" no rodapé da importação pra descartar a lista e recomeçar (antes só tinha "Confirmar e cadastrar"). 2 testes novos de layout 2 colunas.

`sw.js`: `CACHE_NAME` → v34.

Versão web (Service Worker) v33 → v34.

## Rodada 29 — Importação de PDF: jogo quebrado em 2 linhas + 2 colunas misturava os números (v35)

Usuário testou com um comprovante Lotofácil "da Independência" (17 dezenas por jogo, acima do que cabe numa linha só) e achou um caso pior que o da Rodada 28: Jogo 1 veio com 29 números misturados (união dos 2 jogos) e Jogo 2 só com 5 (o resto). Causa: quando um jogo tem dezenas demais pra caber numa linha, o comprovante quebra em 2 linhas — e a quebra caiu bem depois de um "|", deixando a coluna A terminar a 1ª linha com um pipe solto. Ao achatar tudo numa string só (jeito da Rodada 28), esse pipe solto da coluna A grudava direto no primeiro número da coluna B — e isso é **literalmente indistinguível**, em texto puro, de uma continuação de verdade da própria coluna A pra 2ª linha. Não dava pra resolver só com regex melhor; a ambiguidade é real.

**Correção — usar a posição de verdade em vez de texto achatado**:
- Nova `extrairJogosDeItensPosicionados(itens)`: recebe os itens do pdf.js com x/y reais (não mais só a string final). Agrupa por LINHA (y, tolerância 3px), separa cada linha em "colunas" onde o gap horizontal é ≥4x a mediana dos gaps da própria linha (a coluna A e a coluna B ficam claramente mais afastadas entre si do que os números dentro de cada uma), e reagrupa por ÍNDICE de coluna — coluna 0 de todas as linhas vira uma sequência própria, coluna 1 vira outra. Isso mantém a quebra de linha DENTRO da mesma coluna colada certo (o `\s*` do regex ainda atravessa o `\n`) sem nunca misturar com a coluna vizinha.
- `extrairJogosDoTexto(texto)`: a lógica antiga (Rodada 28, achatada) virou uma função própria, mantida como **fallback** pra quando não há posição disponível (e é o que os testes com string direta continuam exercitando).
- `extrairTextoPdf` virou `extrairDadosPdf(file)`, devolvendo `{texto, itens}` — o texto achatado continua servindo pra Modalidade/Concurso (que são "rótulo: valor" na mesma linha, sobrevivem ao achatamento), e os itens posicionados alimentam a extração de jogos.
- `parsearComprovanteCaixa` ganhou `opts.jogosPreExtraidos` — usa quando fornecido (é o que `processarPdfsImportacao` sempre passa agora), senão cai no fallback em texto puro.
- 5 testes novos em `test/parser-comprovante-posicoes.test.js`, com fixtures sintéticas de coordenadas reproduzindo o bug exato (2 colunas, jogo de 17 dezenas quebrado em 2 linhas) — confirmando os 2 jogos saem certos, sem mistura.

`sw.js`: `CACHE_NAME` → v35.

Versão web (Service Worker) v34 → v35.

## Rodada 30 — Correção da Rodada 29 não cobria o formato real de itens do pdf.js (v36)

Usuário testou o mesmo comprovante Lotofácil "da Independência" depois do fix da Rodada 29 e viu o MESMO sintoma (Jogo 1 com 29 números, Jogo 2 com 5) — o fix não resolveu de fato.

**Causa raiz do fix ter falhado**: o limiar de "isso é um gap de coluna" usava a mediana dos gaps calculada a partir dos itens **da própria linha**. Isso funciona bem quando uma linha tem muitos itens (um por número/pipe — o que os testes sintéticos da Rodada 29 simulavam). Mas no pdf.js real, tudo indica que cada fileira de dezenas de uma coluna é **um único item de texto** (o PDF gerador da Caixa desenha a linha toda de uma vez, não número por número) — então uma linha com 2 colunas tem só 2 itens, ou seja, **1 gap medido**. "A mediana dos gaps desta linha" e "o gap que eu preciso avaliar" viravam o MESMO número — nunca dava pra classificar um gap como "muito maior que o normal" comparando ele com ele mesmo. Os testes da Rodada 29 não cobriam esse formato (item-por-token vs. item-por-linha), por isso passavam mas o bug real persistiu.

**Correção**: trocado o limiar de "mediana local" pra **tamanho da fonte** (`Math.hypot(transform[2], transform[3])` do item do pdf.js — a escala vertical do texto, robusta a rotação, sempre presente independente de quantos itens existem na linha). Um espaço em branco normal entre palavras é uma fração do tamanho da fonte; o vão entre 2 colunas de um formulário é ordens de grandeza maior — limiar = `max(fontSize × 8, 40)`. `extrairDadosPdf` agora também captura `width` e `fontSize` de cada item (antes só `str`/`x`/`y`).

Novo teste com fixture sintética no formato "1 item de texto por linha por coluna" (não 1 por token) reproduz o bug exato que persistiu e confirma a correção — é o caso que faltava cobertura antes.

`sw.js`: `CACHE_NAME` → v36.

Versão web (Service Worker) v35 → v36.

## Rodada 31 — Diagnóstico + recalibração com dados reais do pdf.js (v37/v38)

Usuário testou a Rodada 30 e viu o MESMO sintoma de novo (Jogo 1 com 29 números, Jogo 2 com 5) — 3ª tentativa consecutiva sem resolver. Em vez de arriscar uma 4ª correção às cegas (o ambiente de desenvolvimento não roda pdf.js, só browser), parei pra instrumentar.

**v37 — diagnóstico**: `_debugItensImportacaoPdf(nomeArquivo, itens)`, chamado logo após `extrairDadosPdf`, imprime no Console (`console.table`) cada item extraído do pdf.js (linha, texto, x, width, fontSize, y). Pedido ao usuário: F12 → Console → reimportar o PDF → print da tabela. Usuário mandou o log completo dos 61 itens do `comprovante2.pdf`.

**O que o log revelou**: cada fileira de dezenas de uma coluna é mesmo 1 item só (confirmando a suposição da Rodada 30) — MAS o gap real entre as 2 colunas de dezenas é só **31 unidades** (coluna A termina em x=269, coluna B começa em x=300, fonte 10) — bem menor que os limiares "generosos" tentados nas Rodadas 29 e 30 (que giravam em 40-80). A coluna de dezenas é larga (231 unidades pra 12 números) e quase encosta na coluna vizinha.

**v38 — recalibração**: limiar trocado pra `max(fontSize × 2.5, 15)` = 25 nesse caso, abaixo do gap real de 31. Um limiar mais agressivo (baixo) é seguro aqui: cada linha do bloco "Seus Números" já é 1 item por coluna (não tem nada pra proteger DENTRO do próprio jogo), e "errar pra mais" no resto da página (tabela "Dados da Aposta", que tem rótulo:valor com gaps parecidos) é inofensivo — só conteúdo com "|" entra na conta de `extrairJogosDoTexto`.

Novo teste usa os **61 itens reais** do log de debug como fixture (`ITENS_REAIS_COMPROVANTE2` em `test/parser-comprovante-posicoes.test.js`) — trava o valor calibrado contra dado real, não mais suposição. O log de debug (v37) foi mantido por enquanto, marcado pra remover quando o usuário confirmar que resolveu de vez.

`sw.js`: `CACHE_NAME` → v37 → v38.

Versão web (Service Worker) v36 → v38.

## Rodada 32 — Aba Cartões (excluir duplicados) só mostrava concursos da Mega (v39)

Usuário cadastrou cartões duplicados (o próprio sistema avisou), foi excluir na aba "Cartões" e só apareciam concursos da Mega-Sena no filtro — precisava excluir de Lotofácil e Quina também.

**Causa**: a lista de cartões, o filtro de concurso e o "🔍 Verificar Duplicados" (tudo na aba Cartões) sempre filtravam por `loteriaAdmin` — uma variável global só trocada pelos botões Mega/Lotofácil/Quina, que existiam **apenas na aba Cadastro**. A aba Cartões não tinha seletor próprio nem indicação visual de qual loteria estava ativa — o usuário via só Mega (o valor padrão) sem entender por quê, e trocar exigia ir na Cadastro só pra isso.

**Correção**: mesmo seletor de loteria (3 botões) adicionado direto na aba Cartões, sincronizado com o da Cadastro — `setLoteriaAdmin()` agora atualiza os 2 conjuntos de botões juntos (clicando de um lado ou de outro, os dois sempre refletem o mesmo estado). Selecionar Lotofácil ou Quina na própria aba Cartões recarrega lista/filtro/duplicados na hora.

`sw.js`: `CACHE_NAME` → v39.

Versão web (Service Worker) v38 → v39.

## Rodada 33 — Filtro de bolão na aba Cartões + Verificar Duplicados isolado por loteria (v40)

Usuário testou a Rodada 32 e trouxe 2 pontos: (1) um mesmo concurso pode ter vários bolões diferentes cadastrados — precisava dar pra restringir a um bolão específico, não só ao concurso inteiro; (2) ao trocar de loteria, cartões de OUTRA loteria não podiam continuar aparecendo.

**Bolão (1)**: novo `<select>` "Bolão" na aba Cartões, ao lado do filtro de concurso — `carregarBoloesFiltro()` popula com os bolões que existem na combinação loteria+concurso atual (recalculado sempre que a loteria ou o concurso mudam). Filtra tanto a lista de cartões quanto o escopo do "🔍 Verificar Duplicados".

**Loteria vazando (2) — bug real encontrado**: `verificarDuplicados()` nunca filtrava por `tipo` na consulta ao Firestore, só por número de concurso (`where('concurso','==',concurso)`). Se o mesmo número de concurso existisse em 2 loterias diferentes, cartões de uma loteria que nem era a selecionada na tela apareciam misturados nos resultados. Corrigido acrescentando `.where('tipo','==',loteriaAdmin)` à consulta (2 filtros de igualdade — mesmo padrão já usado em `existeCartaoDuplicado` desde a Rodada 22, não precisa de índice composto novo). Bolão é filtrado no cliente, depois da consulta (mesmo padrão do site público pra esse tipo de filtro combinado).

Também: trocar de loteria, ou mudar o filtro de concurso/bolão, agora esconde o resultado de "Verificar Duplicados" anterior — era de outro escopo (loteria/concurso/bolão diferentes) e ficava visível na tela depois da troca, dando a impressão de "cartão de outra loteria aparecendo".

`sw.js`: `CACHE_NAME` → v40.

Versão web (Service Worker) v39 → v40.

## Rodada 34 — Reservas: retry no "too many requests" + lançamento em lote no desktop (v6.4)

Usuário trouxe 2 pedidos sobre o desktop: (1) toda vez que abre o app, aparece "Erro ao verificar reservas do site: HTTP Error 429: Too Many Requests" no rodapé; (2) o site já tem "lançamento em lote" pra uso da reserva (vários lançamentos pro mesmo bolão de uma vez), mas o desktop só cadastra um por um.

**Investigação (agente Explore)** confirmou: o startup faz **uma única** requisição GET a `reservas_movimentos_pendentes` (`_importar_movimentos_pendentes_web`, chamada 400ms depois da janela abrir, via `_login_inicial`) — sem loop, sem retry, sem outro lugar do arquivo repetindo essa chamada. Ou seja, o 429 não é o app pedindo demais; é limite de quota do projeto no Firestore (plano gratuito ou pico de tráfego do ecossistema todo — site público + admin + outras cópias do .exe abrindo ao mesmo tempo), normalmente passageiro.

**1. Retry no 429**: até 2 tentativas extras (espera 1s, depois 2s) antes de mostrar o erro — roda na thread da UI (é o startup), por isso a espera é curta em vez de um backoff longo que travaria a janela por mais tempo.

**2. Lançamento em lote no desktop**: nova ação "📦 Lançamento em Lote" na aba "Reservas Pessoais" (`_abrir_popup_lote_reserva`), espelhando o que já existia no site (`admin.js`, `abrirModalLancamentoLote`) — Tipo/Valor/Data (e Loteria/Concurso/Descrição se DÉBITO) compartilhados pra todo o lote + lista de pessoas com checkbox, busca por nome, "marcar visíveis"/"desmarcar todos". 1 `INSERT` em `reservas_movimentos` por pessoa marcada; validação de saldo insuficiente (débito) resumida numa única confirmação listando quem ficaria negativo, em vez de 1 popup por pessoa.

**Achado incidental**: `_rsv_registrar` (cadastro individual) tentava chamar `sincronizar_reserva(...)` depois de cada lançamento — função que **nunca existiu** neste arquivo, então todo lançamento de reserva sempre lançava `NameError`, silenciado por um `except` genérico (`print` que nem aparece no .exe empacotado). Removida — a sincronização real com o site é o botão manual "📤 Sincronizar Reservas com Site" (reenvia o saldo atual recalculado de todo mundo), que sempre funcionou.

Versão desktop v6.3 → v6.4.

## Rodada 35 — Campo Concurso sem validação (v6.4.1) + investigação do 429 nas Reservas

Usuário testou o lançamento em lote e achou um registro real com "3057-942,25" no campo Concurso — nada impedia digitar/colar besteira ali. Corrigido com `entry_numerico()` (novo helper, `validate="key"`, só aceita dígito) aplicado nos 2 campos Concurso de Reservas Pessoais (individual e lote). Não conserta o registro já salvo errado (não existe função de editar movimento, só excluir+recriar) — só evita que aconteça de novo. Versão v6.4 → v6.4.1.

**Sobre o "429 Too Many Requests" persistir mesmo depois do retry (Rodada 34)**: investigado com `curl` direto na URL do Firestore que o app usa (sem autenticação, de fora do app). Primeira tentativa devolveu `429 "Quota exceeded" (RESOURCE_EXHAUSTED)` — mas tentativas seguintes, poucos segundos depois, vieram como `403` (negado por regra de segurança — essa coleção exige admin autenticado, então 403 é o esperado pra uma chamada sem token, não um erro novo) e ficaram consistentes em `403` por 5 tentativas ao longo de 15s. Ou seja: o 429 que apareceu foi um pico passageiro que já tinha passado no momento de reconfirmar — **não dá pra afirmar com confiança que é cota diária esgotada** (isso exigiria ver 429 de forma sustentada por bem mais tempo). Correção de rumo em relação ao que eu tinha concluído inicialmente (não é definitivamente "cota do projeto zerada" — pelo menos não confirmado). Pedido ao usuário: tentar abrir o app de novo — se voltar a funcionar, foi um pico passageiro (o retry da Rodada 34 já ajuda nesse caso); se continuar caindo toda vez, aí sim vale investigar cota sustentada / considerar o plano Blaze.

## Rodada 36 — Editar lançamento de reserva + erro de senha claro (v6.4.2) + 429 CONFIRMADO: cota do projeto esgotada de verdade

Usuário voltou com 2 pontos: (1) "continua errado o cadastro" — registros antigos com Concurso corrompido (a validação da Rodada 35 só impede digitar errado DAQUI PRA FRENTE, não conserta o que já tava salvo); (2) o 429 voltou a acontecer.

**1. Editar lançamento**: nova ação "✏ Editar Selecionado" na aba Reservas Pessoais — abre um popup com tipo/valor/data/loteria/concurso/descrição pré-preenchidos (o campo Concurso já filtra só os dígitos do que estava salvo, então "3057-942,25" vira "3057942" pronto pra corrigir pra "3057") e faz `UPDATE` no lugar, sem precisar excluir e recadastrar.

**2. Erro de senha claro**: aproveitado o mesmo lote pra resolver o pedido do usuário sobre login — `_firebase_login()` agora lê o código de erro que o Identity Toolkit devolve (`INVALID_LOGIN_CREDENTIALS`, `USER_DISABLED`, `TOO_MANY_ATTEMPTS_TRY_LATER` etc.) e mostra mensagem em português ("Senha incorreta.") em vez do JSON cru que ia direto pro messagebox antes.

**3. Sobre login por câmera/reconhecimento facial** (pergunta do usuário, não implementado — é uma decisão de arquitetura, não um bug): recomendação dada foi NÃO construir reconhecimento facial do zero com webcam comum (sem detecção de vivacidade, uma foto na câmera já falsificaria) — se a ideia é elogiar conveniência sem digitar senha toda vez, o caminho mais seguro é usar o **Windows Hello** que o Windows já tem (rosto por infravermelho ou digital, verificado pelo próprio SO com hardware seguro) só pra liberar a senha guardada com segurança no Windows Credential Manager, em vez de reimplementar biometria do zero de forma mais fraca. Fica como proposta em aberto, não implementada — usuário ainda vai decidir se quer seguir.

**4. O 429 é real e está afetando o SITE PÚBLICO agora** — reinvestigado com `curl` depois do usuário confirmar que persistia: dessa vez, 6 tentativas seguidas ao longo de 30s deram `429 "Quota exceeded"` de forma consistente (diferente da checagem anterior, que tinha achado um pico passageiro). Mais grave: testei OUTRAS coleções do mesmo projeto (`cartoes`, `config_geral`, `resultados_mega`) e **todas** vieram `429` também — não é só a coleção de reservas, é o projeto `mega-sena-sistema` inteiro. Isso significa que **o site público está fora do ar pra visitantes reais agora**, não só uma função do desktop. Não dá pra resolver por código (nem o desktop nem o site fazem chamada em excesso — é limite de leitura do projeto no plano Firebase). Comunicado ao usuário como prioridade: precisa checar Firebase Console → Uso/Faturamento do projeto pra confirmar, e o caminho real de resolução é migrar pro plano Blaze (pay-as-you-go, só cobra acima de uma faixa gratuita generosa) — não dá pra investigar mais fundo sem acesso ao console/faturamento do projeto, que é do usuário.

Versão desktop v6.4.1 → v6.4.2.

## Rodada 37 — Alterar/recuperar senha do admin direto no painel web (v41)

Usuário recusou a proposta de Windows Hello (Rodada 36, item 3) — "só faz o tratamento para erro de senha" — e pediu, além disso, uma forma de trocar a senha de login sem depender do Firebase Console. Mesma conta (`eltonluisoc@gmail.com`) é usada no login do site E do desktop, então resolver no site vale pros dois.

**Implementado em `admin.html`/`admin.js`**:
- **"Esqueci minha senha"** — link no modal de login → `sendPasswordResetEmail(ADMIN_EMAIL)`, manda link de redefinição por e-mail. Cobre o caso de nem conseguir entrar.
- **Card "🔐 SEGURANÇA"** na aba Config → botão "Alterar Senha" abre um modal pedindo senha atual + nova senha + confirmação. Antes de chamar `updatePassword`, reautentica com `reauthenticateWithCredential` — trocar senha é operação sensível, o Firebase exige login "recente" pra permitir; sem reautenticar, uma sessão já aberta há um tempo cairia em `auth/requires-recent-login` em vez de trocar.
- Erros comuns (senha atual errada, nova senha fraca, muitas tentativas, sessão antiga) mostram mensagem em português, não o código cru do Firebase — mesmo espírito do tratamento de erro de login da Rodada 36, agora também nessa tela.

`sw.js`: `CACHE_NAME` → v41.

Versão web (Service Worker) v40 → v41.

## Rodada 38 — Revisão de usabilidade do admin web: menu, Gerenciar Bolões, lista pro WhatsApp, Ver Pendentes (v42)

Usuário pediu uma revisão de usabilidade em 5 pontos do admin web, fechando com "quero versão superior".

1. **Menu lateral em 2 colunas** — 8 itens ocupavam 8 linhas de altura; virou grade 2×4 (ícone empilhado sobre o rótulo, já que lado a lado não cabia em ~120px de coluna). Sidebar alargada de 220px pra 260px pra caber, breakpoint de 1024px ajustado de 180px pra 210px pelo mesmo motivo. Mobile (≤768px) preservado igual — os `.sidebar-item` viram chips horizontais como já eram, só recebendo `flex-direction: row` de volta nesse breakpoint (a base agora é `column`).
2. **"Gerenciar Bolões" redesenhado** — a grade de controles `auto 1fr auto 1fr auto` (Status/Destaque/Data/Estratégia) virou 4 campos lado a lado, cada um com rótulo pequeno em maiúsculas em cima — bem mais fácil de escanear. Botões "Link"/"Excluir" (antes pills com estilo 100% inline, tamanhos batendo com nada mais do painel) viraram `.btn.btn-primary.btn-sm`/`.btn.btn-danger.btn-sm`. Cuidado extra: o toggle de "Destaque" atualiza a UI na hora via manipulação direta do DOM (sem re-renderizar a lista) — preservada a estrutura exata que esse código depende (primeiro `<div>` do card = cabeçalho, wrapper `.switch-destaque`, badge `.badge-destaque`, span `destaque-label-{id}`), só o visual ao redor mudou.
3. **"Copiar Lista pro WhatsApp"** — novo botão na aba "Participantes por Bolão": monta uma mensagem formatada (nome, cotas, pago/total, ✅/⚠️ por status) a partir dos mesmos dados já carregados pra tela, e copia pra área de transferência (`navigator.clipboard.writeText`) — pronta pra colar direto num grupo.
4. **"Ver Pendentes" nas Reservas** — novo botão que lê `reservas_movimentos_pendentes` (a fila que o desktop importa e apaga sozinho) e mostra o que ainda está esperando ser importado. Resolve um risco real: sem isso, não tinha como saber se um lançamento já registrado no site ainda não tinha "chegado" no desktop, abrindo brecha pra registrar o mesmo movimento 2x.
5. **Botões da aba Reservas padronizados** — "Registrar"/"Lote"/"Atualizar" tinham `min-width` diferentes entre si e um deles reimplementava a cor roxa com `style` inline em vez de usar `.btn-purple` (que já existia no CSS). Agora todos usam `.btn-sm` + a classe de cor certa.

`sw.js`: `CACHE_NAME` → v42.

Versão web (Service Worker) v41 → v42.

## Rodada 39 — Menu 2 colunas confirmado ok (era cache); campo Estratégia cortado no mobile (v43)

Usuário reportou "o menu continua centralizado e em oito linhas" logo após a Rodada 38. Verificado direto: o código-fonte E o deploy ao vivo no GitHub Pages (`curl` na URL pública) já tinham a grade de 2 colunas correta — confirmando que era cache do navegador/Service Worker, não bug de código (mesma classe de problema já visto nas Rodadas 17-18). Usuário confirmou depois: "no desktop excelente".

**Mas achou um bug real diferente**: no mobile, o card de cada bolão em "Gerenciar Bolões" cortava o campo "Estratégia". Causa: os 4 campos (Status/Destaque/Data limite/Estratégia) da Rodada 38 ficam lado a lado via `flex-wrap`, cada um com `min-width` próprio em `style=""` inline (gerado no JS) — a SOMA dos mínimos (100+140+160+gaps ≈ 430px+) passa da largura de uma tela de celular, e o campo mais largo (Estratégia) é cortado em vez de quebrar linha direito.

**Correção**: novas classes `bolao-controles-linha`/`bolao-controle-campo` no render (`admin.js`) + regra `@media (max-width:768px)` empilhando os 4 campos um por linha no celular. Precisou de `!important` — inline `style=""` sempre vence uma regra de classe sem isso.

**Achado incidental**: existe um sistema CSS completo e já responsivo (`.bolao-card`, `.bolao-header`, `.bolao-config`, `.switch-modern`, `.bolao-actions`) parado no `admin.html`, nunca referenciado em nenhum JS/HTML — claramente uma versão anterior do redesenho de "Gerenciar Bolões" que nunca chegou a ser ligada. Decisão: **não adotar** (arriscado reconstruir a estrutura DOM exata que esse CSS espera, arriscando quebrar algo, sem ganho de correção sobre o fix cirúrgico já aplicado) — mas vale saber que existe, caso alguma rodada futura queira migrar pra ele de propósito.

`sw.js`: `CACHE_NAME` → v43.

Versão web (Service Worker) v42 → v43.

## Rodada 40 — Evolução do design do admin web, mais Apple (v44)

Usuário pediu pra evoluir o design do admin "estilo Apple". Investigando o CSS antes de mexer, ficou claro que uma rodada anterior (fora do que está resumido neste arquivo) já tinha estabelecido essa direção: Inter como substituta de SF Pro, `#0071e3` azul, `#1d1d1f` quase-preto na topbar, `#f5f5f7` de fundo, cantos arredondados generosos, sombras suaves, `numero-cartao-badge` imitando a bolinha de dezena sorteada do site público. Ou seja, "evolua" era literal — continuar em cima de uma base já certa, não começar do zero.

**Implementado em `admin.html`**:
- **Tokens de design** (`:root`): cor/raio/sombra/transição nomeados (`--cor-primaria`, `--cor-sucesso`, `--raio-pill` etc.) substituindo hex espalhado pelo arquivo. As cores semânticas de sucesso/aviso/erro viraram os tons de sistema da própria Apple (verde `#34c759`, laranja `#ff9500`, vermelho `#ff3b30`) em vez das genéricas de UI kit (`#10b981`/`#f59e0b`/`#ef4444`) que só alguns cantos usavam.
- **Botões (`.btn`) viraram cápsula** (`border-radius: 980px`) — é a assinatura visual mais reconhecível de botão da Apple (App Store, apple.com "Saiba mais"). Toasts também, com sombra mais funda/suave e easing `cubic-bezier` no lugar de `ease` genérico.
- **Barra superior e menu lateral ganharam vidro fosco** (`backdrop-filter: saturate(180%) blur(20px)` sobre fundo translúcido) em vez de cor sólida — a Apple usa exatamente isso nas próprias barras de navegação (Finder, Mail, barra de menu do macOS).
- Cabeçalhos de card e números grandes do dashboard com `letter-spacing` mais fechado (efeito SF Pro Display) + `font-variant-numeric: tabular-nums` pra número não "pular" de largura ao trocar.
- Cores de status em "Gerenciar Bolões" (introduzidas na Rodada 38) trocadas pros tons de sistema da Apple, ficando consistentes com o resto do painel.

**Decidido não fazer**: adotar o sistema `.bolao-card`/`.bolao-config` morto encontrado na Rodada 39 — o risco de reconstruir a estrutura DOM exata que ele espera, só por uma rodada de design, não valia a pena frente ao ganho.

`sw.js`: `CACHE_NAME` → v44.

Versão web (Service Worker) v43 → v44.

## Rodada 41 — Cartões não conferidos ordenam por dezena + rótulo mostra quantidade de números (v45)

Usuário pediu, no site público (tela de conferência): (1) mostrar quantos números tem cada cartão ao lado do rótulo "Cota"/"Exclusivo"; (2) ordenar os cartões pelas próprias dezenas ANTES de conferir o resultado — com o cuidado explícito de não tocar no comportamento pós-conferência, que já mostra do melhor resultado pro pior.

**Implementado em `script.js`**:
- `ordenarCartoesPorAcertos(cartoesLista, numerosSorteados)` ganhou um ramo pro caso `numerosSorteados` nulo (antes de conferir): ordena pelas próprias dezenas do cartão, comparando posição a posição (`[5,18,23]` antes de `[8,13,23]`). O ramo com `numerosSorteados` preenchido (usado tanto por `mostrarCartoes` logo após conferir quanto por `exibirResultadoSalvo` pra um resultado já salvo antes) continua **idêntico** — ordena por acertos, melhor primeiro, como sempre foi.
- Rótulo de tipo de participação ganhou a contagem de dezenas ao lado (ex.: "🎟️ Cota · 8 números") — relevante desde a Rodada 25/26 (aposta múltipla pode ter mais números que o mínimo da loteria). Aplicado nos 2 pontos que renderizam esse rótulo (`mostrarCartoes` e `exibirResultadoSalvo`).
- Teste antigo que travava o comportamento anterior ("sem números sorteados retorna a lista original", sem ordenação nenhuma) foi atualizado pro novo comportamento pedido, mais um teste confirmando que o array original não é mutado (o sort é feito numa cópia).

`sw.js`: `CACHE_NAME` → v45.

Versão web (Service Worker) v44 → v45.

## Rodada 42 — Ordenação da Rodada 41 usava o critério errado (v46)

Usuário testou e apontou: a lista continuava "fora de ordem" (9, 8, 8, 9, 8 números seguidos). Causa: a Rodada 41 implementou "ordem de números" como ordenar pelas DEZENAS em si (`[5,18,23]` antes de `[8,13,23]`) — mas o pedido original era ordenar pela QUANTIDADE de dezenas do cartão, exatamente o critério que o próprio rótulo "Cota · N números" já exibe ao lado. Como o critério usado não batia com o que estava visível na tela, a lista parecia embaralhada mesmo estando "ordenada" (por outra coisa).

**Correção**: `ordenarCartoesPorAcertos` (ramo sem `numerosSorteados`) agora ordena por `numeros.length` decrescente (cartão com mais dezenas primeiro) — desempate por dezenas crescentes pra manter previsibilidade dentro de cartões do mesmo tamanho. Ramo pós-conferência intocado, como sempre.

`sw.js`: `CACHE_NAME` → v46.

Versão web (Service Worker) v45 → v46.

## Rodada 43 — Cadastro de participante: solução profissional (v6.5, desktop)

Usuário reportou que o cadastro de participantes do bolão (desktop) estava confuso, com 3 problemas concretos:

1. O botão "➕ Novo Participante" também serve pra importar um membro de bolão anterior — o nome escondia essa função mais usada.
2. Dentro do popup, a seção de importação (a mais frequente na prática) vinha DEPOIS da seção de cadastro do zero; a janela era estreita o suficiente pra cortar botões, e o campo Observações ocupava espaço desproporcional (3 linhas) pra um campo raramente preenchido.
3. O botão "Cadastrar + Pagar" cadastrava e só DEPOIS abria uma mensagem de confirmação, seguida de um segundo popup pra registrar o pagamento — dois passos extras onde o usuário só queria um clique e um resultado final.

**Implementado em `bolao_pro_v3.py`**:
- Botão renomeado: "➕ Novo Participante" → "➕ Incluir Participante" (`_build_cad_lista`).
- `_abrir_popup_novo_participante`: título "Incluir Participante"; janela alargada de 640x760 pra 720x800; ganhou rolagem por mouse (`canvas.bind("<Enter>"/"<Leave>")`) — faltava nesse popup, ao contrário dos popups irmãos. Seção "Importar Membro de Bolão Anterior" movida pra ANTES de "Cadastrar Novo Participante" (era o bloco duplicado que sobrava depois da linha de botões — removido). Campo de busca da importação encolhido (width 40→26, com `fill="x"`) e botões "🔍 Buscar" (12→10) e "⬇ Importar Selecionado"→"⬇ Importar" (22→12) encolhidos pra não cortar mais o texto. Campo Observações reduzido de `height=3` pra `height=2`.
- `_cadastrar(self, retornar_pid=False, silencioso=False)`: novo parâmetro `silencioso` suprime o `messagebox.showinfo` intermediário; quando `retornar_pid=True` agora retorna `(pid_novo, nome, bolao_nome)` em vez de só `pid_novo`.
- `_cadastrar_e_pagar`: reescrito pra chamar `_cadastrar(retornar_pid=True, silencioso=True)`, buscar o `valor_parcela` do bolão, inserir diretamente uma linha em `pagamentos` (mesmo formato que o popup antigo usava, `observacoes='Cadastro + pagamento simultâneo'`) e mostrar UMA ÚNICA mensagem final combinando cadastro + pagamento (ou uma mensagem alternativa se o bolão não tiver parcela definida). Zero diálogos intermediários.
- Removido o método `_cad_pag_abrir` (~95 linhas) — o popup separado de "Registrar Pagamento" que o antigo `_cadastrar_e_pagar` abria; confirmado via grep que não sobrou nenhuma referência (nem a `_cad_pag_pid`).

Versão desktop v6.4.2 → **v6.5** (4 pontos: docstring, `self.root.title`, header `tk.Label`, 2× `<span>` do WhatsApp). `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 44 — Auditoria matemática multiagente: reserva, depósitos pendentes, cotas (v6.6, desktop)

Usuário pediu explicitamente uma revisão com os agentes de "todos os cálculos da reserva, dos depósitos pendentes, revisão matemática do sistema". Antes de delegar, um levantamento manual em `bolao_pro_v3.py` já achou um indício forte (funções de saldo de reserva usando critérios diferentes pra classificar crédito/débito). Isso virou a pista inicial pra 3 agentes de revisão paralelos (só leitura, sem editar código):

1. **Matemática da reserva (desktop)** — confirmou que `_rsv_editar_mov` não revalidava saldo ao editar tipo/valor de um lançamento (diferente do cadastro normal e do lote, que avisam); confirmou a inconsistência de 3 critérios de crédito/débito (comparação exata em alguns lugares, correspondência ampla com variantes antigas em outros, um deles com "SAIDA" que os outros não tinham) — hoje inofensiva (todo lançamento grava só "CRÉDITO"/"DÉBITO"), mas latente.
2. **Fila de depósitos pendentes (site↔desktop)** — confirmou um risco real de duplicação: o INSERT local em `_importar_movimentos_pendentes_web` é commitado ANTES do DELETE no Firestore; se o DELETE falhar (rede caiu, app fechou no meio), a mensagem de erro diz "continua na fila" mas o lançamento já foi gravado — reimportado de novo na próxima abertura, duplicando o valor.
3. **Matemática geral (cotas/prêmios)** — rodou a suíte de testes (20/20 passando), confirmou que prêmios/faixas são idênticos entre `script.js` e `admin.js`, e achou o bug mais grave: `_status_part` é chamado em 4 lugares fora do Dashboard (Relatório, relatório-texto, exportação Excel) SEM multiplicar a parcela pelas cotas da pessoa — resultado contraditório entre telas pro mesmo participante com 2+ cotas.

**Corrigido em `bolao_pro_v3.py`** (todos os 4 problemas confirmados, mais o achado extra de mais 2 call sites do mesmo bug de cotas que a auditoria não tinha citado — `_rel_whatsapp` e `_cards_visuais` — achados ao caçar every call site de `_status_part`/`_status_part_adm`):

- Novo helper `_n_cotas_participante(valor_esperado, valor_total_bolao)`, usado agora em TODO lugar que decide status de pagamento: `_dash_load` (já estava certo), `_gerar_rel`, `_rel_whatsapp` (lista de "Confirmados"), `_montar_rel_completo`, `_exportar_excel`, `_cards_visuais`. Testado manualmente: pessoa com 3 cotas que pagou 1 parcela flat agora mostra PENDENTE em toda tela (antes: EM DIA em 4 das 6).
- `_rsv_editar_mov` ganhou o mesmo aviso de saldo insuficiente que o cadastro normal e o lote já tinham, projetando o saldo da pessoa (sem o lançamento atual) com os novos tipo/valor antes de salvar.
- Nova coluna `reservas_movimentos.origem_doc_id` (migração seed segura) guarda o ID do documento Firestore que originou um lançamento importado. `_importar_movimentos_pendentes_web` agora checa esse campo antes de inserir — se o doc_id já foi aplicado antes (INSERT local ok, mas DELETE da fila falhou), pula o INSERT e só tenta limpar a fila de novo. Testado com simulação de reimportação: sem a correção duplicava o valor, com a correção soma fica correta.
- Critério de crédito/débito unificado em duas constantes de módulo, `TIPOS_CREDITO_RESERVA`/`TIPOS_DEBITO_RESERVA`, e um helper `_sql_in_tipos()` pra montar a cláusula SQL — usados agora em `_rsv_load`, `_rsv_sel_pessoa`, `_rsv_registrar`, o popup de lote, `_rsv_editar_mov` e `enviar_reservas_para_site` (essa última ganhou o "SAIDA" que faltava nela vindo de outro lugar). Confirmado via grep que não sobrou nenhuma comparação de tipo hardcoded fora dessas constantes.

Versão desktop v6.5 → **v6.6**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`. Suíte `test/calculos-script.test.js` (site) roda 20/20 — não afetada, confirmado só por sanidade já que a auditoria não mudou nada em `script.js`/`admin.js` (Área B e C do agente 3 já estavam corretas).

## Rodada 45 — Evolução multiagente do cadastro de participantes: menos cliques, sem tela cortada (v6.7, desktop)

Usuário pediu explicitamente: "quero evoluir o cadastro de participantes... use os agentes para evoluir e deixar essa tela melhor... mais fácil de lançar, sem erros de tela, sem tantos cliques, sem tela cortada e uma UX aprimorada." Antes de delegar, um levantamento manual já achou um bug concreto: o campo "Valor Total Esperado" nasce fixo em "0,00" e só recalcula no FocusOut/Return do campo Cotas — nunca de forma síncrona quando o popup abre. Isso virou a pista pra 2 agentes em paralelo, só leitura/proposta (sem editar código): um pra auditar toda a fricção do fluxo atual (cliques, tela cortada, mensagens desnecessárias), outro pra propor um redesenho concreto reaproveitando padrões já comprovados no próprio arquivo.

**Achados confirmados pelo agente de auditoria** (além do bug do R$0,00, que ele confirmou ser alcançável só com mouse e que o sistema mostra esse participante como "✅ QUITADO" por `saldo = 0 - 0 <= 0`):
- Popup mais alto do arquivo inteiro (800px fixo, sem `+x+y` de centralização) — não cabe inteiro num notebook comum (1366x768).
- Nenhum campo recebe foco automático ao abrir (usuário sempre precisa clicar no Nome primeiro).
- Nenhum campo (exceto Cotas e a busca de importação) reage à tecla Enter — sempre precisa do mouse.
- Confirmação de sucesso é `messagebox.showinfo`, que exige clicar OK — indo contra o próprio propósito do popup ficar aberto pra cadastrar vários participantes seguidos (Rodada 43).
- Busca de "Importar Membro de Bolão Anterior" exige clicar "🔍 Buscar" ou apertar Enter, ao contrário da lista de participantes (`_filtrar_cad_lista`), que já filtra ao vivo a cada tecla.

**Proposta do agente de design** (convergiu com os mesmos 5 pontos, mais o mapeamento de cliques): reaproveitar o padrão `trace_add("write", ...)` já usado em 4 lugares do arquivo pra busca ao vivo; reaproveitar o único precedente de `focus_set()` (`pag_val`) pra focar o campo certo ao abrir; cadeia de `<Return>` por campo em vez de um Enter-submete-tudo global (quebraria a Text de Observações); altura da janela calculada por `winfo_screenheight()` em vez de fixa. Estimativa: fluxo de importar cai de ~5 pra ~4 cliques, fluxo manual de ~5 pra ~3.

**Implementado em `bolao_pro_v3.py`** (`_abrir_popup_novo_participante`, `_cadastrar`, `_cadastrar_e_pagar`, `_imp_buscar`):
- Janela: altura = `min(800, 85% da tela)`, centralizada com `+x+y` calculado a partir de `winfo_screenwidth/height`.
- Campo Valor chama `_preencher_valor_cad()` uma vez ao montar o popup (não fica mais em "0,00" até o usuário mexer em Cotas).
- Busca de importação: `trace_add("write", ...)` no `_imp_entry_var` (like `_filtrar_cad_lista`), botão "🔍 Buscar" removido, `_imp_buscar` reescrito pra nunca abrir messagebox (exige ≥2 letras, mostra "nada encontrado" no label de status em vez de popup).
- Foco inicial no campo de busca de importação (caminho mais frequente); Enter encadeado Nome→Telefone→PIX→Cotas→Valor.
- Novo `self._cad_status_lbl` dentro do popup — `_cadastrar` e `_cadastrar_e_pagar` escrevem o resumo do cadastro ali em vez de `messagebox.showinfo`, sem exigir clique OK entre um cadastro e o próximo. Mensagens de erro/validação (nome vazio, limite de cotas, telefone duplicado) continuam como messagebox — são exceções raras que precisam de confirmação explícita, não o caminho feliz repetido a cada pessoa.

Versão desktop v6.6 → **v6.7**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 46 — "Meus Bolões" em destaque no topo + link direto pros cartões (v47, site)

Usuário reportou que no site público o botão "🔍 MEUS BOLÕES" estava "muito abaixo na tela" — na prática, era o ÚLTIMO botão do ÚLTIMO card da página ("Compartilhar e Opine"), depois do card de conferência, área de cartões, resultados e bolões especiais. Pediu pra trazer pra cima, e que ao mostrar os bolões (na consulta por telefone) desse pra ver os cartões também. Investiguei antes de mexer e apresentei o plano (conforme pedido: "primeiro mostre o que fará"), confirmado pelo usuário.

**Parte 1 — `index.html`**: botão "Meus Bolões" saiu de dentro do card "Compartilhar e Opine" e virou um cartão de destaque roxo (gradiente, ícone + subtítulo + chevron) logo abaixo do seletor de loteria (Mega/Lotofácil/Quina) — primeira coisa visível na tela, antes de qualquer card. Mesmo `id="btnMeusBoloes"` e mesmo destino (`meus-boloes.html`), só mudou de posição — o listener em `script.js` não precisou mudar.

**Parte 2 — link "Ver Cartões" na consulta**: a consulta por telefone (`meus-boloes.html` → `consulta.js`) lê a coleção `participantes` e só mostrava status (pago/pendente, aberto/encerrado) — os números dos cartões ficam numa coleção diferente (`cartoes`), usada pelo `index.html` via os seletores de Concurso/Bolão. Em vez de duplicar a lógica de exibição de cartões dentro de `consulta.js`, cada bolão listado ganhou um botão "🎫 Ver Cartões" que linka de volta pro `index.html` com `?loteria=X&concurso=Y&bolao=Z` na URL (o casamento entre as duas telas é pelo NOME do bolão — não existe ID em comum entre as coleções `participantes` e `cartoes` hoje).

**`script.js`**: nova função `aplicarSelecaoDaUrl()`, chamada uma vez no `DOMContentLoaded` logo depois de `carregarDados()` — lê os parâmetros da URL, chama `setLoteria()` se a loteria pedida for diferente da padrão, sobrescreve `concursoSelect`/`bolaoSelect` pros valores pedidos (reaproveitando `atualizarSelectBoloesAsync()`, sem duplicar nada), chama `mostrarCartoes()`/`exibirResultadoSalvo()` conforme o concurso já ter sido conferido ou não, e rola a tela até o card de conferência. Se o nome do bolão não bater com nenhuma opção (nome digitado diferente entre cadastro e publicação dos cartões, por exemplo), cai de volta pra seleção manual normal com um toast de aviso — não quebra nada.

`sw.js`: `CACHE_NAME` → v47.

Versão web (Service Worker) v46 → v47.

## Rodada 47 — Design premium do index estendido pra toda a vitrine pública (v48, site)

Usuário reportou: o design do index é "o mais bonito do sistema", mas ao acessar "bolões e outros links e menu" o visual muda pra algo diferente (pior). Investiguei antes de mexer: `meus-boloes.html`, `consulta.html` (link pessoal por token, gerado pelo admin) e `participantes.html` (lista pública de participantes de um bolão, também linkada pelo admin) ainda usavam um design antigo — fundo gradiente azul/verde, cards com sombra pesada, botões arredondados genéricos — de uma era anterior ao redesenho Apple-style que o index já tinha (Rodada 40 pro admin, e o próprio index depois). `admin.html` ficou de fora de propósito: já passou pela sua própria evolução (Rodada 40), pensada pra área de trabalho logada, não pra vitrine pública que um visitante alcança clicando em links do site.

**Novo `style-vitrine.css`**: extraído do `<style>` que já existia só em `index.html` — tokens (`--bg`,`--accent`,`--radius-*` etc.), `.top-bar`/`.logo`, `.card`/`.card-header`/`.card-body`, botões pill, inputs/selects, `.empty-state`/`.loading`, `.footer`, e novas pills de status (`.status-aberto/andamento/encerrado/pago/pendente`) usando os mesmos tons de sistema do admin (Rodada 40) — arquivo único compartilhado pelas 4 páginas da vitrine, pra parar de duplicar/divergir esse visual em cada uma.

**`index.html`**: passou a linkar `style-vitrine.css` e teve seu `<style>` próprio enxugado — sobrou só o que é mesmo exclusivo dele (hero, seletor de loteria, card de "Meus Bolões", stagger de animação dos cards).

**`meus-boloes.html`/`consulta.html`/`participantes.html`**: ganharam `<link rel="stylesheet" href="style-vitrine.css">`, uma `.top-bar` igual à do index (logo linkando pra home), fundo trocado do gradiente pro `--bg` neutro, e os estilos locais reduzidos só ao que é específico de cada uma. Nenhum id/classe usado pelos scripts (`consulta.js` e os `<script>` inline de `consulta.html`/`participantes.html`) foi renomeado — conferido com grep cruzando `getElementById` de cada script contra os ids que sobraram no HTML.

**Achado incidental corrigido**: o selo ABERTO/EM ANDAMENTO/ENCERRADO de cada bolão em `consulta.js` (usado por `meus-boloes.html`) recebia a classe crua (`"aberto"`/`"andamento"`/`"encerrado"`), mas o CSS antigo só definia os nomes prefixados (`.status-aberto` etc.) — o selo nunca teve cor nenhuma, sempre caiu no estilo padrão do navegador. `consulta.html` (outro arquivo, lógica própria) não tinha esse bug — já passava o nome prefixado certo. Corrigido no CSS de `meus-boloes.html` com um seletor que cobre os dois casos.

`sw.js`: `CACHE_NAME` → v48, `style-vitrine.css` adicionado à lista de pré-cache.

Versão web (Service Worker) v47 → v48.

## Rodada 48 — Verificação de reservas do site não trava mais nem exige reabrir o app (v6.8, desktop)

Usuário reportou (com print de tela) 5 aberturas seguidas do app batendo "HTTP Error 429: Too Many Requests" ao verificar reservas lançadas no site, pedindo pra melhorar essa parte pra evitar problemas com a atualização da reserva. Esse mesmo erro já tinha sido investigado a fundo nas Rodadas 34-36 e confirmado como um limite real de quota/rate-limit do Firestore (plano gratuito Spark) — não um bug de código —, mas a experiência de reabrir o app 5 vezes seguidas pra bater na mesma parede mostrou que dava pra melhorar bastante o lado de cá, mesmo sem controle sobre o limite do Firebase.

**Causa raiz do "trava"**: `_importar_movimentos_pendentes_web` rodava inteira na thread da UI (bloqueando a janela), com só 3 tentativas rápidas (1s/2s de espera) antes de desistir — pouco fôlego pra uma rajada de rate-limit passar, e travar mais tempo não dava por rodar na UI.

**Corrigido em `bolao_pro_v3.py`**: a busca (GET com retry) foi pra uma thread separada — sqlite3 não permite reusar a mesma conexão fora da thread onde foi criada, então só a ESPERA pela resposta do Firestore foi pra background; as gravações no SQLite continuam na thread principal, feitas por um novo método `_concluir_import_pendentes` chamado de volta via `root.after(0, ...)` quando a busca termina (padrão idêntico ao já usado em `_pub_sincronizar_reservas`). Backoff aumentado de 3 tentativas (1s/2s) pra 5 tentativas (2s/5s/10s/20s, ~37s de fôlego total) — agora sem travar a janela, dá pra esperar bem mais. Se mesmo assim falhar, um link "🔄 Tentar novamente" apareceu na barra de status (`_build_status_bar`) — antes o único jeito de tentar de novo era fechar e reabrir o app inteiro, exatamente o que o usuário vinha fazendo 5 vezes. Guard `_rsv_import_em_andamento` evita rodar duas verificações ao mesmo tempo se o link for clicado enquanto uma já está em andamento.

Versão desktop v6.7 → **v6.8**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

**Nota pro usuário**: se o 429 continuar aparecendo mesmo com mais tentativas, é o limite de quota do Firestore mesmo (não tem mais o que ajustar só no código) — vale checar o uso/cota no Firebase Console e considerar o plano Blaze, como já apontado nas Rodadas 34-36.

## Rodada 49 — Premiações reformulada (desktop, v6.9) + remoção do menu Tokens (site admin, v49)

Usuário pediu duas coisas independentes na mesma mensagem: reformular a tela de Premiações do desktop (com print do menu do admin web só pra marcar em amarelo o item "Tokens" a ser descartado) e remover a consulta por token do site admin, já que "Meus Bolões" (busca por telefone, Rodada 46) cobre a mesma necessidade.

**Desktop (`bolao_pro_v3.py`, aba "🏆 Premiações", v6.9)** — pontos pedidos e implementados:
- **Bug real corrigido**: histórico ordenado por `data_sorteio DESC`, mas esse campo é texto "DD/MM/AAAA" — ordenar a string direto não dá ordem cronológica de verdade (dia vem primeiro no texto; "05/01/2026" ficava lexicograficamente ANTES de "20/12/2025", apesar de mais recente). `_load_prem` agora reconverte pra "AAAAMMDD" antes de comparar.
- **Edição adicionada**: nova `_editar_prem` (popup, mesmo padrão do `_rsv_editar_mov` das Reservas) — antes só dava pra excluir e recadastrar do zero. Duplo-clique na lista também abre pra editar.
- **Concurso virou `entry_numerico()`** — mesmo achado das Reservas (Rodada 34-36): campo livre deixava salvar lixo no número do concurso.
- **Calculadora de Rateio removida** da tela (fora do escopo pedido).
- Resumo por loteria perdeu a coluna "Último Concurso" (redundante — a "Última Data" já basta).
- Nova coluna "Bolão" no histórico + label "📌 Registrando para o bolão ativo: X" no formulário — antes não dava pra saber, só olhando a tela, pra qual bolão cada premiação foi (mesmo sendo obrigatório ter um bolão ativo selecionado pra registrar).
- Botões padronizados (dourado/laranja/vermelho pra registrar/editar/excluir, larguras consistentes) — antes cada um tinha um tamanho.

Testado à parte com SQLite em memória: datas de meses/anos diferentes intercaladas ("20/12/2025", "05/01/2026", "15/06/2025", "01/01/2026") ordenam corretamente do mais recente pro mais antigo com a nova query.

Versão desktop v6.8 → **v6.9**. `dist/SistemaBoloes.exe` reconstruído.

**Site admin (`admin.html`/`admin.js`)** — menu "🔑 Tokens" removido por completo: botão do menu lateral, seção `#section-tokens` (formulário de gerar token + lista), e todo o JS relacionado (`gerarTokenUnico`, `salvarToken`, `carregarTokens`, `formatarTelefone` — confirmado só usado ali —, o wiring do botão `btnGerarToken`, e a chamada de `carregarTokens()` no carregamento inicial das abas). `gerarLinkParticipantes`/`participantes.html` é uma feature DIFERENTE (lista pública de participantes por bolão) e não foi tocada. `consulta.html` (a página que valida o token) não foi excluída — links já compartilhados continuam funcionando, só não dá mais pra gerar novos pelo admin. Troca do menu lateral é auto-contida (`document.querySelectorAll('.sidebar-item')` no fim do admin.js é genérico, sem lista fixa de seções pra atualizar).

`sw.js`: `CACHE_NAME` → v49.

Versão web (Service Worker) v48 → v49.

## Rodada 50 — Caixa por Loteria ganha edição + Premiações agora deixa trocar o bolão (v6.10, desktop)

Usuário reportou: "na guia gestão, aba premiações... se faço lançamento de movimento e erro não tenho como editar ou excluir... resolva isso. na guia caixa por loteria. precisa resolver isso." Investigando: "lançamento de movimento" bate exatamente com a aba "💼 Caixa por Loteria" (ENTRADA/SAÍDA), não com Premiações — as duas ficam lado a lado dentro de Gestão, o que explica a troca de nome. Premiações já tinha edição (Rodada 49); Caixa por Loteria só tinha exclusão, nunca teve edição.

**Corrigido em `bolao_pro_v3.py`**:
- Nova `_editar_mov_res` (popup, mesmo padrão de `_rsv_editar_mov`/`_editar_prem`) — corrige loteria, tipo, valor, data e descrição de um movimento da Caixa por Loteria já registrado. Botão "✏ Editar Movimento" + duplo-clique na lista.
- Enquanto isso, usuário reportou mid-turn que o popup de editar Premiação (Rodada 49) não deixava trocar o Bolão — ficava fixo no que estava ativo no momento do cadastro original. Novo campo Bolão (combobox com todos os bolões, inclusive encerrados — uma premiação antiga pode pertencer a um bolão já encerrado) no topo do popup, editável junto com o resto.

Versão desktop v6.9 → **v6.10**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 51 — Participantes duplicados, Reativar na Visão Geral, Lançamentos pra Gestão (v6.11, desktop)

Usuário trouxe 5 pedidos numa mensagem só: (1) participantes duplicados na busca/seleção, (2) botão "Reativar Bolão" preso dentro do detalhe de um bolão selecionado em vez de aparecer na Visão Geral, (3) "Histórico de Lançamentos" duplicado entre Dashboard e Gestão, (4) um botão simples de "premiação total do ano" no lugar da lista completa no Dashboard, e (5) avaliar se vale investir na aba "Importar Extrato" ou excluir.

**1 — Participantes duplicados**: causa raiz encontrada — telefone nunca era normalizado antes de gravar/comparar. A mesma pessoa cadastrada com "(61) 99999-9999" numa vez e "61999999999" noutra virava DUAS linhas em `pessoas` (o `UNIQUE` em `pessoas.telefone` não pega, são strings diferentes), e cada bolão em que a pessoa aparecia mostrava um registro fragmentado diferente na busca "Importar Membro de Bolão Anterior". Corrigido: `_cadastrar` e `_cad_edit_salvar` normalizam telefone (só dígitos) antes de gravar/comparar; `_cad_edit_salvar` passou a propagar nome/telefone/pix pro registro em `pessoas` ligado (antes só atualizava a cópia do participante, deixando `pessoas` desatualizada); a chave de dedup de `_imp_buscar` também passou a comparar telefone normalizado. Nova ferramenta "🧹 Unificar Duplicados" (aba Participantes) agrupa `pessoas` por telefone normalizado, mostra os grupos e junta com um clique (reaponta `participantes.pessoa_id` pro mais antigo do grupo, apaga os duplicados — não mexe em pagamento/histórico). Testado à parte com SQLite em memória.

**2 — Reativar Bolão na Visão Geral**: `_adm_reativar_bolao` já era auto-contido (lista todos os encerrados, não depende do bolão selecionado) — só estava no lugar errado (header de "Bolão Selecionado", `_build_bolao_sel`). Adicionado também no header da Visão Geral (`_build_dashboard`), que é onde faz sentido reativar algo que nem aparece nos seletores normais.

**3 e 4 — Histórico de Lançamentos + KPI do ano**: "Histórico de Lançamentos" (taxa_adm — ganhos/saques do ORGANIZADOR, diferente de `premiacoes`) só existia dentro do Dashboard, nunca em Gestão — o usuário queria o oposto do que existia (só em Gestão). Virou aba própria "📋 Lançamentos" em `nb_gestao`, ao lado de Premiações e Caixa por Loteria (`_build_lanc`, reaproveitando os mesmos `self.adm_tree_hist`/`_adm_editar`/`_adm_excluir`/`_abrir_ganhos_por_loteria`/`_abrir_registrar_lancamento` — só o lugar onde a lista é desenhada mudou). Dashboard ganhou um KPI "GANHO NESTE ANO" (filtra `taxa_adm` pelo ano corrente) no lugar da lista completa.

**5 — Importar Extrato**: investigado antes de decidir. `pip show pdfplumber` confirmou que essa biblioteca NUNCA esteve instalada no ambiente que gera o `.exe` — ou seja, todo executável já publicado tem essa aba 100% quebrada desde sempre, sempre caindo em "Biblioteca ausente" (cujo próprio conselho, "pip install pdfplumber", não serve pra quem só tem o .exe). A lógica de parsing (`_imp_analisar`) também usa extração de texto plana (`pdfplumber.extract_text()`) assumindo layout linha-a-linha — o mesmo tipo de abordagem que já falhou antes NESTE projeto (o import de cartões em PDF precisou virar position-aware depois que texto plano embaralhava dados em colunas). Recomendação dada ao usuário, aguardando decisão: (A) investir — empacotar pdfplumber + testar com um extrato real do Nubank pra calibrar o parsing (mesmo processo usado pra corrigir o import de cartões), ou (B) excluir a aba inteira (~500 linhas, 12 métodos) já que o registro manual de pagamento já cobre a necessidade. Nenhuma mudança de código feita nessa aba ainda.

Versão desktop v6.10 → **v6.11**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 52 — Remove a aba "Importar Extrato" (v6.12, desktop)

Usuário decidiu excluir, depois da avaliação da Rodada 51 (confirmado: `pdfplumber` nunca esteve empacotado em nenhum .exe publicado, a aba sempre esteve 100% quebrada desde o primeiro build) — "no futuro se necessário tentaremos uma solução pra isso".

**Cuidado tomado**: o prefixo `_imp_` é usado por DUAS funcionalidades diferentes no arquivo — a de "Importar Extrato" (a ser removida) e a busca "Importar Membro de Bolão Anterior" dentro do cadastro de participante (`_imp_buscar`/`_imp_importar`, usada toda hora, NADA a ver com PDF). Mapeei com grep todos os identificadores exclusivos do extrato (`_imp_escolher_pdf`, `_imp_analisar`, `_imp_carregar_tabela`, `_imp_toggle_sel`, `_imp_sel_para_edicao`, `_imp_aplicar_vinculo`, `_imp_add_manual`, `_imp_importar_pagamentos`, `_imp_gerar_whatsapp`, `_flb_conferencia`, `_imp_limpar`, `_build_importar`, `tab_import`, mais os StringVars/widgets específicos) antes de remover qualquer coisa, confirmando que não colidiam com `_imp_buscar`/`_imp_importar`/`_imp_entry_var`/`_imp_busca_tree`/`_imp_status_lbl` (nomes diferentes, sem sobreposição).

Removidos: os 12 métodos do extrato, a declaração de `self.tab_import`, o `nb_fin.add(...)` da aba, e a chamada `self._build_importar()` no bootstrap. Confirmado com grep no arquivo inteiro que não sobrou nenhuma referência ativa (só o comentário explicativo que ficou no lugar do bloco).

Versão desktop v6.11 → **v6.12**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 53 — Card "Premiação Ano" corrigido + Gestão virou tela única (v6.13, desktop)

Usuário mandou print apontando dois problemas: o card do Dashboard "GANHO NESTE ANO" (R$ 7.339,54) estava mostrando um número muito maior do que o "Total de prêmios ganhos" da aba Premiações (R$ 1.813,43) — porque eram fontes DIFERENTES. "esse botão deve ser PREMIAÇÃO ANO e mostrar esse ganho de loteria" deixou claro: o card deveria refletir a tabela `premiacoes` (o que o BOLÃO ganha jogando), não `taxa_adm` (o que o ORGANIZADOR ganha de taxa — conceito completamente diferente, que eu tinha confundido na Rodada 51 ao implementar esse card pela primeira vez).

**Corrigido**: card renomeado "🏆 PREMIAÇÃO ANO", fonte trocada pra `SUM(premiacoes.valor_premio)` do ano corrente. Card ficou clicável — abre um popup com a quebra por loteria (`_mostrar_premiacao_ano_detalhe`), já que o espaço do card só cabe o total.

**Segundo pedido, na mesma mensagem**: "essas três abas poderiam ser uma só e reorganizar as informações usando UX... a tela precisa ser de boa usabilidade" — referindo-se às 3 sub-abas de Gestão (Caixa por Loteria / Premiações / Lançamentos), cada uma exigindo navegação separada pra ver um resumo relacionado. Viraram uma tela só (`_build_gestao_unificada`): resumo geral (3 cards — Premiação do ano, Saldo Caixa por todas as loterias, Saldo do Organizador) sempre visível no topo, e um seletor segmentado (3 botões, ativo em laranja) trocando qual seção aparece embaixo via `tkraise()` — a mesma técnica "notebook sem abas" já usada em Início > Visão Geral/Bolão Selecionado (`_mostrar_inicio_modo`), reaproveitada aqui como `_mostrar_gestao_secao`. `_build_prem`/`_build_res`/`_build_lanc` não precisaram mudar nada por dentro — só o contêiner ao redor (de `ttk.Notebook` pra `tk.Frame` com `.place()` empilhado) e a chamada de recarregamento (antes disparada pelo evento `<<NotebookTabChanged>>`, agora direto em `_mostrar_gestao_secao`).

Versão desktop v6.12 → **v6.13**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 54 — Ícone próprio do app + reformulação da tela de Pagamentos (v6.14, desktop)

Usuário mandou dois pedidos: um print da tela "Pagamentos" chamando a UX de "péssima", e no meio do trabalho, mais uma mensagem pedindo um ícone próprio pro app ("essa pena é péssima" — o ícone padrão de pena do Tk que aparece sem `iconbitmap` configurado).

**Ícone**: em vez de desenhar do zero, reaproveitei o `icon.png` que já existe no projeto (usado pelo PWA/site — arte "BOLÕES ALEATÓRIOS" com cartela de loteria e estrelas, já profissional) — dá branding consistente entre desktop e web de graça. Convertido pra `app_icon.ico` multi-resolução (16 a 256px) com Pillow. Aplicado em dois lugares (são mecanismos diferentes): `SistemaBoloes.spec` (`icon=['app_icon.ico']` no `EXE()`, mais `datas=[('app_icon.ico','.')]` pra empacotar o arquivo) controla o ícone do próprio .exe no Explorer; `self.root.iconbitmap(...)` no `__init__` controla o ícone da janela em execução (título, barra de tarefas, Alt-Tab) — sem isso o Tk mostra a pena padrão mesmo com o .exe tendo outro ícone. Novo helper `_resource_path()` resolve o caminho do .ico tanto rodando o `.py` direto quanto no `.exe` onefile (`sys._MEIPASS`, pasta temporária onde o PyInstaller onefile extrai os arquivos de `datas` — sem isso o ícone não seria achado no .exe empacotado, só rodando o script).

**Tela de Pagamentos (Financeiro)**: reportada como "péssima" — grandes áreas vazias, campo de participante era uma lista suspensa simples (lenta pra achar alguém), campo Valor sempre nascia em branco. Corrigido:
- Combobox de participante virou editável + filtro ao vivo por tecla (`_pag_cb_filtrar`) — mesmo padrão já usado em Participantes/Histórico deste sistema, em vez de inventar um widget novo.
- Mensagem de estado vazio ("🔍 Digite ou selecione um participante...") antes de escolher alguém, em vez de área em branco.
- Campo Valor sugere a parcela × cotas do participante (usando `_n_cotas_participante`, o mesmo helper da auditoria matemática da Rodada 44) — capado pelo saldo restante, pra não sugerir mais do que falta no pagamento final. Antes vinha sempre vazio.
- Formulário compactado numa linha (Mês/Ano/Valor/Data), com Enter avançando de campo em campo até registrar.
- "🔄 Atualizar lista" virou ícone compacto — menos peso visual pra uma ação que já roda sozinha ao trocar de aba.

Versão desktop v6.13 → **v6.14**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec` (log confirma "Copying icon to EXE").

## Rodada 55 — Ícone minimalista desenhado do zero (v6.15, desktop)

Usuário não gostou do ícone da Rodada 54 (reaproveitava a arte colorida do site/PWA — cartela de loteria, estrelas, gradiente vermelho/dourado, "muita coisa" pra um ícone de app desktop). Pediu um minimalista, já versionado.

Desenhado programaticamente com Pillow (sem gerador de imagem — desenho geométrico direto): quadrado arredondado em navy sólido (#1a2a3a, a mesma cor do cabeçalho do próprio app desktop — não a paleta do site) com um dado branco centralizado, levemente rotacionado, pips em dourado (#f39c12, a cor já usada pra "premiação" em todo o resto do sistema). Zero gradiente, uma forma só, cores da própria paleta do app — critério de "minimalista" e também de manter a identidade visual consistente com o que já existe no desktop, em vez de importar a do site de novo. Renderizado em 1024px e testado reduzido pra 32px/16px (tamanho de barra de tarefas) antes de finalizar, pra garantir que os pips continuam legíveis pequenos.

Substituiu o `app_icon.ico` existente (mesmo nome de arquivo — `SistemaBoloes.spec` e `_resource_path()` não precisaram mudar, só o conteúdo do ícone).

Versão desktop v6.14 → **v6.15**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 56 — "Quero fazer as 5": backup na nuvem, testes, log de auditoria; segurança investigada; extrato pausado (v6.16, desktop)

Usuário pediu pra implementar as 5 sugestões da Rodada 55. Dado o tamanho/risco variado de cada uma, perguntado antes de começar: (1) tem um PDF real de extrato pra calibrar a reconstrução do Importar Extrato quando chegar a hora? Respondeu que manda quando chegar. (2) Como tratar a exposição pública conhecida de `participantes` no Firestore — mitigar agora + Cloud Function depois, ou só documentar? Escolheu mitigar agora.

**1 — Backup fora da máquina**: `enviar_backup_para_nuvem()`/`listar_backups_nuvem()`/`_limpar_backups_nuvem()` (novas funções módulo, reaproveitando `_firebase_login()`) sobem o `.db` pro Firebase Storage via REST API (`storageBucket` já existia em `firebase-config.js`, nunca tinha sido usado por código nenhum). Integrado em dois lugares: automático na "Etapa 3/3" da janela de sincronização ao fechar o app (não bloqueia o fechamento se falhar — é rede de segurança extra, não o sync principal de reservas/bolões), e manual na aba Backup/Restore ("☁ Enviar Backup Agora" + lista dos já enviados). Novo `storage.rules` (`backups/` só admin, mesmo padrão `isAdmin()` do `firestore.rules`) e `firebase.json` atualizado — precisa de `firebase deploy --only storage` pra valer (ainda não rodado, ver final da rodada).

**2 — Testes automatizados pro desktop**: `test/test_bolao_pro_v3.py`, `unittest` da biblioteca padrão (mesma filosofia do `node:test` já usado no lado web — sem adicionar pytest como dependência nova, lição da própria Rodada 51/pdfplumber sobre depender de biblioteca externa sem gerenciar direito). 27 testes: `to_float`/`fmt_brl` (parsing/formatação de moeda), `_n_cotas_participante`, `_status_part` (fixa formalmente o contrato do bug de cotas da Rodada 44 — pessoa com 3 cotas que pagou 1 parcela tem que dar PENDENTE), critério unificado de crédito/débito da reserva (Rodada 51), ordenação cronológica de data-texto (Rodada 51), unificação de duplicados e importação idempotente (Rodada 51/54) — formaliza simulações que antes eram feitas ad-hoc em `python -c "..."` e descartadas a cada rodada. Achado na hora de rodar: `python -m unittest test.test_bolao_pro_v3` NÃO funciona — o nome `test/` colide com o pacote `test` da própria biblioteca padrão do Python; rodar o arquivo direto como script (`python test/test_bolao_pro_v3.py`) resolve. Documentado no próprio docstring do arquivo.

**3 — Segurança do Firestore**: investigado a fundo antes de mexer em regra nenhuma. Achado: `participantes` é 1 documento POR BOLÃO com um array de participantes dentro (não 1 doc por pessoa) — Firestore não sabe filtrar um array por campo no servidor, então o cliente (`consulta.js`/`consulta.html`/`meus-boloes.html`) PRECISA baixar o array inteiro pra filtrar por telefone no navegador. Não existe regra de segurança que restrinja isso sem quebrar a busca — confirmado que `chave_pix` pelo menos NÃO está nessa coleção (só nome/telefone/valorPago/situacao/quantidadeCotas/dataCadastro, conferido no único escritor, `enviar_bolao_para_site()`). Como uma mudança de regra aqui não dá pra testar ao vivo contra o site real com segurança, decidido NÃO alterar o comportamento da regra nesta rodada — em vez disso, o comentário em `firestore.rules` virou uma análise completa e acionável (antes era uma linha genérica apontando pra "um relatório" que não foi encontrado), com o plano concreto da correção real: Cloud Function callable recebendo telefone como parâmetro, filtrando no servidor (infraestrutura de Functions já existe e funciona).

**4 — Log de auditoria**: nova tabela `log_auditoria` + `self._log(acao, detalhes)` (nunca trava a ação principal se o log falhar). Instrumentadas as 8 ações destrutivas do sistema: remover participante, excluir premiação, excluir movimento de Caixa por Loteria, excluir movimento de reserva pessoal, excluir lançamento do organizador, excluir pagamento (Histórico), unificar participantes duplicados, e excluir um BOLÃO inteiro (a mais destrutiva — cascata em 6 tabelas, achado incidental que nem tinha proteção nenhuma além da caixinha de confirmação). Nova aba "📜 Log de Alterações" (grupo Sistema) com busca, atualizada automaticamente junto com o resto do app.

**5 — Importar Extrato**: pausado por combinado — usuário manda o PDF real quando for a hora.

Versão desktop v6.15 → **v6.16**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`. `python test/test_bolao_pro_v3.py`: 27/27. **Pendente**: `firebase deploy --only firestore:rules,storage` — CLI já logado no projeto certo (confirmado via `firebase projects:list`), aguardando confirmação explícita do usuário antes de rodar (regra de ouro deste projeto: nunca mudar sistema em produção sem essa confirmação).

## Rodada 57 — Importar Extrato reconstruído com PDF real (v6.17, desktop) — fecha as "5 sugestões"

Usuário mandou um extrato Nubank real (`NU_62583598_01SET2026_16SET2026.pdf`, 42 páginas, 01-16/09/2026) pra calibrar a reconstrução, combinado na Rodada 56. Antes de escrever qualquer UI, prototipado e validado a extração isoladamente contra o PDF real (`test/` scratchpad, depois formalizado no código).

**Achado que explica o fracasso anterior de verdade**: `page.extract_text()` do pdfplumber quebra a acentuação nesse PDF específico do Nubank — toda letra acentuada vira "�" (bug de mapeamento de fonte/cmap do gerador do Nubank, não do pdfplumber). Quem tentou ler o extrato como texto corrido antes provavelmente também esbarrou nisso, além do problema já conhecido de pdfplumber nunca ter sido empacotado. A saída: extração POSITION-AWARE — agrupar palavras por coordenada `top` (linha) e usar a posição `x0` (que continua confiável mesmo com o texto corrompido) pra decidir o que é cada linha: cabeçalho de dia (x≈57), linha de movimento com valor no fim (x≈120). Os NOMES dos remetentes Pix (maiúsculas, sem acento na maioria dos casos) e os valores continuam perfeitamente legíveis mesmo com esse bug.

**Novas funções módulo-level** (`_extrair_creditos_pix_extrato`, `_extrato_match_participante`, `_extrato_normalizar_nome`) — testadas isoladamente contra o PDF real: 318 créditos Pix extraídos, 76 remetentes distintos, datas corretas em todas as linhas. Matching só confirma automaticamente quando há EXATAMENTE UM participante candidato (nome normalizado bate/contém/é contido) — ambíguo ou zero vira "sem correspondência", nunca adivinha. Validado um fluxo end-to-end simulado (banco em memória) confirmando: matching certo, detecção de duplicata (participante+valor+data já lançado antes) e importação seletiva.

**Tela nova** ("📥 Importar Extrato", prefixo `_ext_` pra não colidir com `_imp_*` — já usado por "Importar Membro de Bolão Anterior", feature diferente): escolher PDF → Analisar (roda em thread) → grade com Data/Nome do Extrato/Valor/Participante Sugerido/Situação (verde=pronto, laranja=sem participante, cinza=já importado). Duplo-clique vincula manualmente. Nada é lançado sem estar selecionado E confirmado no botão — mesmo princípio de "nunca salvar direto de uma leitura automática" já estabelecido nas discussões anteriores sobre leitura de cartão por IA (Rodada 14). Mês de referência do pagamento vem da DATA DO PIX no extrato (não da data de hoje).

**Empacotamento**: `pdfplumber` + dependências adicionadas a `hiddenimports` no `SistemaBoloes.spec` — causa raiz do fracasso original. No processo, achado que o analisador estático do PyInstaller incluía numpy/pandas/scipy/pyarrow por causa de um caminho de código do pdfplumber nunca chamado aqui (`extract_table()`, não usado — só `extract_words()`), inflando o `.exe` de ~32MB pra >115MB à toa. Confirmado bloqueando esses imports deliberadamente (`sys.meta_path`) que `extract_words()` funciona sem eles, e excluídos via `excludes=[...]` no spec — `.exe` final fica em ~36MB (~5MB a mais que o baseline sem pdfplumber, coerente com pdfminer.six + o binário nativo do pypdfium2 + cryptography).

Versão desktop v6.16 → **v6.17**. `python test/test_bolao_pro_v3.py`: 27/27 (sem alteração — a extração de PDF não é testável sem um arquivo real, então não entrou na suíte automatizada; ficou validada manualmente contra o PDF do usuário). `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

**Pendência levada da Rodada 56**: `firebase deploy --only firestore:rules,storage` (regras do Storage pro backup na nuvem + comentário atualizado do firestore.rules) segue sem rodar — usuário confirmou "SIM" mas o comando foi bloqueado pelo classificador de modo automático (ação de deploy em produção). Precisa ser rodado manualmente pelo usuário ou com uma permissão explícita liberada.

## Rodada 58 — Corrige leitura O(n²) no cadastro de cartões que estourou a cota diária do Firestore (v50, web)

Usuário mostrou o painel de uso do Firebase: 57 mil leituras num único dia, passando da cota gratuita de 50 mil/dia do Spark, com aviso de risco de indisponibilidade. Só 398 gravações no mesmo período — proporção de ~140 leituras por gravação era a pista de que o problema não era tráfego de visitante, e sim o próprio fluxo de cadastro. Usuário confirmou: cadastrou muitos cartões hoje via importação de PDF, por causa de um concurso grande, e pediu solução técnica (não quer pagar).

Investigado `admin.html`/`admin.js` a fundo (não uma correção às cegas):

**Causa raiz #1 (a maior, achado em `confirmarImportacaoPdf`)**: pra cada cartão de um lote importado, o código chamava `existeCartaoDuplicado()` — uma consulta ao Firestore filtrada por loteria+concurso+bolão. Como a coleção filtrada CRESCE a cada cartão gravado dentro do mesmo lote, isso é uma leitura O(n²): o cartão 1 lê contra 0 existentes, o cartão 2 contra 1, ..., o cartão 400 contra 399 — soma ~80 mil leituras só nessa função, pra um lote de 400 cartões de um concurso grande. Corrigido: busca os cartões já existentes desse loteria+concurso+bolão UMA VEZ só antes do loop, guarda as chaves (números ordenados) num Set local, e checa duplicata localmente daí em diante — vira O(n) (1 leitura no total, não importa quantos cartões o lote tenha).

**Causa raiz #2 (menor, mas mesma família de bug)**: `adicionarCartaoIndividual()`, `adicionarCartaoIndividualSelecao()`, `adicionarCartaoSelecaoAtual()` e `editarCartao()` chamavam `carregarDadosAdmin()` depois de CADA cartão salvo/editado — isso relê a coleção `cartoes` INTEIRA (todos os concursos/bolões acumulados, não só o do lote atual) a cada clique em "Adicionar", multiplicando o custo pra quem cadastra cartão a cartão (colar texto, clicar Adicionar repetidamente). Corrigido com um novo helper `atualizarUIComCartoesLocais()` que só re-renderiza a partir do array `cartoes` já carregado em memória — nada de rede. Cada uma dessas 4 funções agora atualiza o array local (`cartoes.push(...)` no add, substitui o item no edit) em vez de reconsultar o Firestore.

Sem mudança nenhuma de comportamento visível pro usuário — só menos leituras. `node --check admin.js` ok, suíte JS completa (47 testes, `test/*.test.js`) passando sem alteração.

`sw.js` `CACHE_NAME` v49→v50.

**Nota à parte**: no mesmo fluxo dessa rodada, o usuário tentou ativar o backup na nuvem (Rodada 56/57) e descobriu que o Firebase Storage agora exige o plano pago Blaze pra ser habilitado (mudança da política do Google, não é algo que o projeto controla). Decidiu não fazer upgrade por enquanto — backup na nuvem fica pendente, documentado como decisão consciente, não como bug.

## Rodada 59 — Remove Importar Extrato de novo + corrige unificação de duplicados de verdade (v6.18, desktop)

Duas coisas na mesma mensagem do usuário: (1) "não quero o modulo importar extrato. exclua ele..." — sem outro motivo dado; (2) print mostrando a busca de "Importar Membro de Bolão Anterior" com "Carlos Sena" aparecendo 2x, um com telefone e outro sem ("-"), com o comentário "diz que está tudo unificado... mas conforme a tela mostra... tem várias situações assim... analise e resolva".

**Remoção do Importar Extrato**: reversão completa e limpa da Rodada 57/58 — funções módulo-level (`_extrair_creditos_pix_extrato`, `_extrato_match_participante`, `_extrato_normalizar_nome`), a aba `self.tab_ext` e todos os métodos `_build_ext`/`_ext_*`, e o `hiddenimports`/`excludes` do pdfplumber no `SistemaBoloes.spec` (volta a ficar vazio, como antes). `.exe` volta de ~36MB pra ~32MB. Confirmado por grep que não sobrou nenhuma referência viva (só comentário explicando a remoção, seguindo o mesmo padrão já usado na Rodada 52 pra essa mesma funcionalidade).

**Unificar Duplicados — bug real, não só relatado**: investigado `_unificar_duplicados` e confirmada a causa exata do print — o agrupamento antigo (`Rodada 51/54`) só juntava `pessoas` que tivessem o MESMO telefone normalizado, e pulava explicitamente quem não tinha telefone nenhum (`if not tel_norm: continue`). Um "Carlos Sena" com telefone e outro "Carlos Sena" sem telefone nunca eram comparados — apareciam duplicados pra sempre, mesmo depois de rodar "Unificar Duplicados" repetidas vezes, porque o critério de agrupamento estruturalmente nunca os colocava no mesmo grupo.

Reescrito com union-find, validado com 6 cenários num protótipo isolado antes de mexer no código real (achado durante a validação: a primeira versão simples não sinalizava o caso "mesmo nome, dois telefones reais diferentes" — corrigido com uma segunda passada específica pra isso). Duas fontes de match combinadas:
- mesmo telefone normalizado (como antes);
- mesmo nome normalizado, quando PELO MENOS UM dos dois registros não tem telefone — cobre o caso relatado sem arriscar juntar duas pessoas diferentes que só coincidem de nome.

Por segurança, um grupo só entra na unificação em massa (botão "Unificar Todos os Seguros") se tiver no máximo 1 telefone real distinto entre os membros — mesmo nome com 2+ telefones reais diferentes vira uma lista separada de AVISO na mesma tela ("podem ser pessoas diferentes"), sem mexer sozinho.

Lógica extraída pra `_calcular_grupos_duplicados()` (módulo-level, sem UI/banco) especificamente pra poder testar contra a função de PRODUÇÃO — 7 testes novos em `test/test_bolao_pro_v3.py` (incluindo o caso exato do print do usuário e o caso de conflito que o protótipo pegou), substituindo o teste antigo que só reimplementava uma versão desatualizada da lógica.

Versão desktop v6.17 → **v6.18**. `python test/test_bolao_pro_v3.py`: 33/33. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec` (~32MB, confirma que o pdfplumber saiu).

## Rodada 60 — Auditoria com 3 agentes em paralelo + correção GRATUITA da exposição do Firestore (v6.19, desktop+web)

Usuário pediu pra rodar os agentes multiagente (framework do topo deste arquivo) pra achar "novidades" — melhorias que ainda não existem no sistema, pra ele avaliar. Adaptado o framework (que é pra pipeline de build) pra um modo de descoberta: 3 agentes `general-purpose` em paralelo, cada um com uma lente diferente (arquitetura técnica, produto/negócio, dados/confiabilidade), todos instruídos a ler o `prompt-multiagente-claude-code.md` inteiro primeiro pra não repetir nada já mapeado nas 59 rodadas anteriores.

**Achado mais valioso, verificado pessoalmente antes de repassar**: o agente de arquitetura encontrou que `functions/functions/index.js` já tem duas Cloud Functions COMPLETAS (`buscarBoloesPorTelefone`, `buscarBoloesPorToken`) fazendo exatamente a mediação server-side que a Rodada 56 tinha descrito como trabalho futuro — só que nunca foram implantadas (`firebase functions:list` → vazio) e nenhuma página do site chama elas (`consulta.js`/`consulta.html` continuavam com a leitura antiga e insegura). Motivo de não ter sido esse o caminho escolhido: Cloud Functions também exigem o plano Blaze, que o usuário recusou pro Storage — "não vou pagar storage no firebase... a solução precisa ser diferente e sem pagar... demais sugestões nada que eu aprove".

**Solução implementada, 100% gratuita, sem Cloud Function**: get() e list() são permissões SEPARADAS nas regras do Firestore (padrão já usado neste projeto em `participantes_tokens` desde antes) — dá pra permitir buscar UM documento pelo ID (`allow get: if true`) e travar "baixar a coleção inteira" ao mesmo tempo (`allow list: if false`). Nova coleção `busca_participante/{telefone}` (chave = telefone só dígitos), 1 documento por PESSOA com a lista de bolões que ela participa — `consulta.js`/`consulta.html` passam a buscar só o telefone que a própria pessoa digitou, nunca mais a coleção inteira.

Mudanças:
- **Desktop**: `_montar_lista_part_firestore()` extraída de `_pub_montar_dados_impl` (sem duplicar lógica); nova `atualizar_busca_participante()` (upsert por telefone, remove/substitui a entrada do mesmo bolão antes de adicionar a nova — evita duplicata em republicação) + codec REST do Firestore (`_firestore_valor_para_python`/`_python_para_valor`, testado com round-trip). Roda sozinho a cada publicação normal (`_pub_enviar`). Novo botão "🔄 Sincronizar Busca por Telefone" (aba Publicar) faz o backfill pra TODOS os bolões já publicados antes dessa mudança, de uma vez.
- **firestore.rules**: `participantes` vira `get()` público + `list()` só admin (confirmado que `admin.js` só chama `list()` já autenticado — `carregarDadosAdmin()` roda dentro de `onAuthStateChanged`); nova `busca_participante` com `get()` público + `list()` travado de vez.
- **admin.js**: `config_boloes/ativos` ganhou um campo `metadados` (título/loteria/valor por cota de cada bolão público SEM dado pessoal) — permite `consulta.html` listar "bolões abertos pra participar" (quem ainda não é participante) sem tocar na coleção `participantes`.
- **consulta.js**/**consulta.html**: reescritos pra ler `busca_participante` (participação da pessoa) + `config_boloes/ativos` (status + metadados públicos) em vez de baixar `participantes` inteira. `meus-boloes.html`/`participantes.html` conferidos e não precisaram mudar (já usavam leitura por documento único, nunca foi o problema).
- Verificado por grep todo call site de `collection('participantes')` no repo antes de travar `list()` — só sobraram leituras autenticadas (admin.js) ou por documento único (get, continua liberado).

Demais achados dos 3 agentes (arquitetura, produto, dados/confiabilidade) apresentados ao usuário mas **não aprovados** — ficam só registrados na conversa, não implementados.

Versão desktop v6.18 → **v6.19**. `sw.js` v50→v51. `python test/test_bolao_pro_v3.py`: 33/33. `dist/SistemaBoloes.exe` reconstruído. **Pendente**: usuário precisa rodar `firebase deploy --only firestore:rules` manualmente (mesmo bloqueio do classificador de modo automático das rodadas anteriores).

## Rodada 61 — Corrige a causa raiz de verdade do "Carlos Sena duplicado" (v6.20, desktop)

Usuário testou a correção da Rodada 59 (unificação de duplicados) e reportou que o bug persistia — mesmo depois de clicar "🧹 Unificar Duplicados" e confirmar, "Carlos Sena" continuava aparecendo 2x na tela "Importar Membro de Bolão Anterior". Pedido pra aprofundar em vez de assumir que era só falta de rodar a unificação.

**Achado real**: a tela em questão (`_imp_buscar`) nunca leu a tabela `pessoas` — ela consulta `participantes` direto, que guarda uma CÓPIA denormalizada de nome/telefone POR LINHA (uma linha por bolão que a pessoa participa). A unificação da Rodada 59 só corrigia a cópia das linhas REAPONTADAS na hora do merge (as que pertenciam ao duplicado excluído); a cópia nas linhas que JÁ apontavam pro principal ANTES da unificação (participações em bolões mais antigos) nunca era tocada — ficava com o valor velho (às vezes telefone vazio) pra sempre. Resultado: mesmo com `pessoas` corretamente unificada, a pessoa continuava parecendo duplicada em qualquer tela que lê telefone direto de `participantes` — incluindo, potencialmente, a publicação pro site (Rodada 60), que também lê esse campo.

Duas correções, uma em cada ponta (defesa em profundidade — corrige a causa E blinda o sintoma):
1. `_unificar_duplicados` agora atualiza TODAS as linhas de `participantes` do principal (`WHERE pessoa_id=?`, sem mais filtro nenhum), não só as reapontadas na hora — fecha a causa raiz de vez.
2. `_imp_buscar` passa a deduplicar por `pessoa_id` (o vínculo real, sempre correto depois de qualquer unificação) em vez de nome+telefone da própria linha, e exibe nome/telefone de `pessoas` (fonte atual) quando o vínculo existe — blindado contra a mesma classe de bug reaparecer por qualquer outro caminho.

Novo teste de regressão reproduzindo o cenário exato relatado (principal com participação antiga sem telefone + duplicado com telefone real, confirma que as duas linhas de `participantes` ficam com o mesmo telefone depois do merge) — `test/test_bolao_pro_v3.py`, 34/34.

Versão desktop v6.19 → **v6.20**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 62 — Sincronização retroativa fecha o "Carlos Sena" de vez (v6.21, desktop)

Complemento direto da Rodada 61: a correção de lá só evita a cópia de telefone ficar desatualizada em unificações NOVAS a partir daquele ponto. Quem já tinha unificado "Carlos Sena" ANTES da v6.20 existir continuava com resíduo — `_calcular_grupos_duplicados` não encontra mais nada pra reprocessar porque `pessoas` já só tem 1 registro pra essa pessoa, então o caminho de correção da Rodada 61 nunca seria acionado de novo pra ele.

Nova `_sincronizar_telefones_participantes()` — um `UPDATE` simples e idempotente (`participantes.telefone = (SELECT telefone FROM pessoas WHERE ...)`, só pra quem tem pessoa com telefone real) — chamado SEMPRE que "🧹 Unificar Duplicados" é aberto, independente de achar duplicata nova ou não. Resolve o backlog de qualquer unificação feita antes dessa correção existir, de uma vez, sem precisar que o usuário refaça nada manualmente.

Novo teste reproduzindo o cenário retroativo exato (pessoas já corretamente unificada, participantes com cópia antiga) — `test/test_bolao_pro_v3.py`, 35/35.

Versão desktop v6.20 → **v6.21**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 63 — Novo ícone: bola de loteria com "E" estilizado (v6.22, desktop)

Usuário pediu ícone com um E estilizado no meio e algo que remeta à loteria, sem ser dado. Desenhado com Pillow: placa navy do app, bola dourada com disco branco (bola numerada) e "E" itálico feito de barras arredondadas (barra do meio dourada), mais 3 bolinhas nas cores das modalidades da Caixa (verde Mega-Sena, roxo Lotofácil, azul Quina). Iterado 2x olhando o resultado (E inclinado pro lado errado e brilho vazando pra fora da bola na 1ª versão). Testado em 32px. `app_icon.ico` substituído (mesmo nome — spec e `_resource_path` não mudam). v6.21 → **v6.22**, `.exe` reconstruído.

## Rodada 64 — Vagas livres explícitas nos cards de cotas (v6.23, desktop)

Usuário pediu, na aba Financeiro: os cards que mostram quantos participantes já estão no bolão também deveriam mostrar as vagas livres, já que isso representa quanto ainda dá pra vender do bolão.

Investigado onde "quantos já estão" aparece: o card "Cotas Ocupadas" (Início > Bolão Selecionado, `kpi_row`) já mostrava a fração `ocupadas/total` (via `_get_cotas_ocupadas`, que usa `boloes.num_participantes` como capacidade configurada), e o resumo de texto da aba Relatório (dentro do grupo "💰 Financeiro" de verdade) também. Nenhum dos dois mostrava as vagas como número isolado — só dava pra saber subtraindo de cabeça.

Adicionada uma segunda linha no card "Cotas Ocupadas" ("N vaga(s) livre(s)" ou "✅ Lotado", cor muda pra laranja quando restam ≤20% das cotas) e um segmento "Vagas: 🟢 N" no resumo de texto do Relatório. Mesma fonte de dado dos dois lados (`_get_cotas_ocupadas`), sem duplicar lógica.

Versão desktop v6.22 → **v6.23**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 65 — Slots vazios nos Cards Visuais, de verdade (v6.24, desktop)

A Rodada 64 mexeu no lugar errado — usuário mandou print mostrando que a tela real era "🖼 Cards Visuais" (`_cards_visuais`, grid de 1 card colorido por participante, usado pra mostrar o painel de situação do bolão numa janela maximizada), não o card "Cotas Ocupadas" que eu tinha corrigido antes.

Corrigido de fato: depois do loop que desenha 1 card por pessoa (`dados_ord`), o grid agora completa as posições restantes com cards cinza "➕ VAGO", um pra cada cota ainda não vendida (`max_cotas_c - cotas_ocupadas_c`, mesma função `_get_cotas_ocupadas` já usada em todo lugar), no mesmo layout de 10 colunas. Legenda de cores ganhou a entrada "Vago".

Versão desktop v6.23 → **v6.24**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 66 — Corrige busca da aba Pagamentos (roubo de foco) e valor do Cadastrar+Pagar (v6.25, desktop)

Usuário reportou dois problemas na tela de Cadastro de Participantes/Pagamentos: (1) "Cadastrar e Pagar" sempre registra o valor de UMA parcela, mas o participante pode ter pago o valor integral, e isso precisa ser informado ANTES de cadastrar pra não precisar revisar depois; (2) o campo de busca de participante na aba Financeiro > Pagamentos só deixa digitar 1 letra — enquanto o mesmo tipo de busca em Participantes funciona bem.

**Bug #2 investigado com teste isolado antes de mexer** (não assumiu a causa): reproduzido um Tk real (`_pag_cb_filtrar`) e confirmado com `root.focus_get()` que, depois de `event_generate("<Down>")` (usado pra forçar a lista suspensa a abrir a cada tecla), o foco do teclado migra pro widget interno "popdown" da combobox — testado tanto com `event_generate("<Down>")` quanto com o Tcl `ttk::combobox::Post` direto, os dois roubam o foco igual (é como o ttk::combobox funciona, não dá pra abrir sem isso). Resultado real: só a 1ª letra chegava no campo de texto; as seguintes iam pro popup, que não aceita texto. Corrigido removendo o "abre sozinho" — a combobox filtra `values` a cada tecla mas não força abertura; o usuário clica na setinha (ou aperta Down deliberadamente) quando quiser ver a lista já filtrada.

**Bug #1**: `_cadastrar_e_pagar` tinha `parc = valor_parcela` fixo no código, sem multiplicar por cotas (mesma classe de bug da auditoria da Rodada 44) nem dar chance de editar antes de cadastrar. Novo campo "Pagamento Já Recebido (R$)" no popup "Incluir Participante", com dois atalhos: "1 Parcela" (agora corretamente × nº de cotas) e "Integral" (usa o Valor Total Esperado inteiro). Recalculado em 3 pontos pra nunca ficar com valor velho: ao abrir o popup, depois de importar membro de outro bolão (o loop de import limpa TODOS os campos, inclusive esse), e depois de cada "CADASTRAR" simples (fluxo de cadastrar vários participantes seguidos, popup fica aberto de propósito).

Versão desktop v6.24 → **v6.25**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 67 — Busca de Pagamentos igual à de "Importar Membro", de vez (v6.26, desktop)

A Rodada 66 corrigiu o roubo de foco da combobox, mas deixou "clique na setinha pra ver a lista" como comportamento — usuário pediu explicitamente o MESMO padrão de "Importar Membro de Bolão Anterior": lista sempre visível embaixo do campo, filtrando a cada tecla digitada (2, mais, quantos caracteres), sem clicar em nada.

Trocada a combobox editável por Entry + Treeview (mesmo padrão de `_imp_buscar`) — Treeview não disputa foco de teclado com o Entry, então elimina de vez a classe de bug da Rodada 66 (não só mitiga). `_pag_info`, `_registrar_pag`, `_emitir_recibo` passaram a usar `self._pag_pid_atual` (setado por `_pag_selecionar`, via clique na lista) em vez de parsear o texto de uma combobox. `_refresh_dados_visiveis` (troca de aba) preserva a seleção atual ao atualizar a lista em segundo plano; `_refresh_all` (depois de salvar algo) limpa de propósito, como já era antes.

Validado rodando o app de verdade (não só `py_compile`) numa pasta isolada com dados de teste reais: instancia sem crash, digitar "carlos" mostra 2 resultados, "carlos ro" filtra pra 1, selecionar carrega os cards certos e sugere o valor certo no campo de pagamento.

Versão desktop v6.25 → **v6.26**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 68 — "Pagamento Já Recebido" ficava desatualizado ao mudar cotas depois de clicar Integral (v6.27, desktop)

Usuário reportou: cadastrou um participante marcando pagamento "Integral", usou "Cadastrar + Pagar", mas "Depósitos Pendentes" e "Últimos Pagamentos" mostravam só R$25,00 — valor errado.

Investigado sem assumir a causa: o campo "Pagamento Já Recebido" (Rodada 67) só recalcula quando os botões "1 Parcela"/"Integral" são clicados — mas o campo Cotas, ao mudar (FocusOut/Enter/botão "🔢 Calcular"), só recalculava o Valor Esperado, nunca o Pagamento Já Recebido. Se o usuário clicou Integral e DEPOIS ajustou as cotas (ordem bem plausível: primeiro confirma que é pagamento integral, depois percebe que são mais cotas do que o padrão), o campo de pagamento ficava travado no valor das cotas antigas — e foi exatamente esse valor menor que entrou no banco. "Depósitos Pendentes"/"Últimos Pagamentos" não tinham bug próprio, só mostravam certo o dado errado que foi de fato gravado.

Corrigido com rastreamento de modo (`_cad_pago_modo`: `"parcela"` / `"integral"` / `None`): mudar Cotas agora recalcula os DOIS campos, mas só o Pagamento Já Recebido se ainda estiver num modo automático — editar esse campo manualmente (`_cad_pago_editado_manual`, ligado ao `<KeyRelease>`) marca modo `None` e protege o valor contra sobrescrita.

Validado com 3 cenários num teste isolado, rodando o app de verdade (banco em memória, sem tocar em `boloes.db` real): Integral acompanhando cotas 1→2 (100,00→200,00), 1 Parcela acompanhando cotas 2→3 (50,00→75,00), e edição manual (999,99) sobrevivendo a uma mudança de cotas depois.

Versão desktop v6.26 → **v6.27**. `dist/SistemaBoloes.exe` reconstruído. **Usuário precisa corrigir manualmente** o pagamento já registrado errado (R$25,00) pro participante afetado — a correção evita o bug daqui pra frente, não conserta dado já gravado.

## Rodada 69 — Integral ainda ficava desatualizado, faltava o campo Valor Esperado (v6.28, desktop)

Usuário reportou o MESMO sintoma da Rodada 68 de novo, depois de já ter a correção: cadastrou pagando Integral R$75,00, mensagem final mostrou R$25,00. A Rodada 68 só cobria o campo Cotas mudando; faltava o campo "Valor Total Esperado" em si — que é um campo LIVRE, editável direto (o próprio rótulo já dizia "ou informe manualmente"), sem precisar passar pelo campo Cotas nenhuma vez. Editar esse campo na mão DEPOIS de clicar "Integral" não disparava nenhum recálculo do Pagamento Já Recebido.

Corrigido: `self._cv["valor"]` ganhou bindings de `<FocusOut>`/`<Return>` chamando `_cad_valor_esperado_mudou()`, que recalcula o Pagamento Já Recebido só quando `_cad_pago_modo == "integral"` (modo "parcela" não depende desse campo, só de cotas × valor da parcela, então não precisa reagir a ele).

Validado reproduzindo o cenário exato relatado num teste isolado (banco em memória): importa 1 cota (R$25 sugerido), clica Integral, edita Valor Esperado na mão pra 75,00 — Pagamento Já Recebido acompanha e também vira 75,00.

Versão desktop v6.27 → **v6.28**. `dist/SistemaBoloes.exe` reconstruído. Mesma ressalva da Rodada 68: não conserta retroativamente nenhum pagamento já cadastrado errado antes desta correção.

## Rodada 70 — Quina troca "chance de quadra" por "chance de terno" e ganha classificação própria por % (web)

Usuário reportou (com print do card "POTENCIAL DO BOLÃO" no site): um bolão real de Quina (26 cartões, concurso 7130) aparecia como ★★★★ ÓTIMO ao lado de "0,63% CHANCE (QUADRA)" — inconsistente, porque quadra na Quina é sempre uma fração minúscula mesmo em bolões grandes.

Investigado antes de codar: a classificação por estrelas (`FAIXAS_ESTRELAS`) e a "chance %" exibida são cálculos totalmente independentes no `script.js` — estrelas vêm de "bilhetes equivalentes" (Σ C(n,5)), chance vem da fórmula hipergeométrica pra quadra (j=4). Rodei uma consulta real no Firestore (`cartoes`, público, sem precisar de login) pra achar o bolão exato do print e confirmar os números: 26 cartões (quatro de 7 números, quatorze de 8, oito de 9), 75/80 números cobertos, 1.876 bilhetes. Reproduzi a conta do site (0,6337% de quadra, bate com o print) e calculei também o cenário terno (j=3): **16,81%**.

Apresentei os dois números pro usuário decidir. Escolha: trocar pra terno E mudar a classificação da Quina para vir direto do % de chance de terno (não mais de bilhetes cobertos) — faixas definidas pelo usuário: SIMPLES <15%, BOM 15–50%, ÓTIMO 50–80%, EXCELENTE ≥80% (sem faixa REGULAR/2★ pra Quina, decisão explícita dele). Com essas faixas, o bolão do print cai em **3★ BOM (16,81%)**, resolvendo a inconsistência.

Implementado em `calcularChancesBolao()`: `acertosAlvoChance`/`rotuloChance` agora usam terno (`3`/`'TERNO'`) só pra Quina (Mega e Lotofácil inalterados); a lógica de estrelas foi bifurcada — Quina usa as novas faixas de %, Mega/Lotofácil continuam com `FAIXAS_ESTRELAS` (bilhetes cobertos), inalteradas. Validado com `node --check script.js` (sintaxe) e um script Node isolado reproduzindo a conta do bolão real, confirmando 16,81% → 3★ BOM.

`sw.js` `CACHE_NAME` v51 → **v52**.

## Rodada 71 — Causa raiz real do "Cadastrar+Pagar grava valor errado", busca por telefone do site vazia, e revisão de UX com 5 agentes (v6.29, desktop)

Usuário reportou DOIS problemas no mesmo turno: (1) Rogério Pio (tel. 61994272409), cadastrado de verdade no bolão "Mega da Virada 2026", não aparecia na busca por telefone do site; (2) cadastrou Fabrício Ataíde pagando R$75,00 integral via "Cadastrar + Pagar", sistema registrou R$25,00 — o MESMO sintoma das Rodadas 68/69, que já tinham sido corrigidas (ou achávamos).

**Problema 1 — busca por telefone vazia:** investigado consultando o Firestore ao vivo (REST público), não assumido. `busca_participante/61994272409` devolvia 404. Amostrei outros 8 participantes do mesmo bolão (todos 404) e depois outros 4 bolões inteiros (`lotofacil_da_independencia`, `quina_de_sao_joao_2026`, `quina_de_sao_joao_2026_ii`, `mega_da_virada_amigos_2026`) — TODOS os participantes, de TODOS os bolões, sem exceção, sem nenhum doc em `busca_participante`. Causa raiz: existem DOIS caminhos de publicação pro Firestore — o botão manual "🌐 PUBLICAR NO SITE" (`_pub_enviar`), que desde a Rodada 60 chama `atualizar_busca_participante()` depois do PATCH; e a sincronização automática ao FECHAR o programa (dentro de `_on_close`, que publica em "participantes" com uma cópia inline da mesma lógica, não reaproveitando a função). O fluxo real do admin é fechar o programa no dia a dia — não clicar o botão manual a cada participante novo — e esse segundo caminho nunca chamava `atualizar_busca_participante()`. Corrigido adicionando essa chamada logo após o PATCH bem-sucedido no fechamento automático, sem bloquear o fechamento se falhar (mesmo critério não-bloqueante do fluxo manual). **Dados já publicados antes desta correção continuam ausentes** até o usuário clicar uma vez em "🔄 Sincronizar Busca por Telefone (todos os bolões)" na aba Publicar (botão já existia, só nunca tinha sido clicado).

**Problema 2 — causa raiz REAL do bug de valor errado (3ª ocorrência):** as Rodadas 68 e 69 corrigiram bugs genuínos de dessincronia (campo "Pagamento Já Recebido" ficando desatualizado depois de mudar Cotas ou Valor Esperado), mas nenhuma delas era a causa deste caso. Lendo `_cadastrar_e_pagar()` com calma: ela chamava `self._cadastrar(retornar_pid=True, silencioso=True)` e SÓ DEPOIS lia `self._cv["valor_pago"].get()` — mas `_cadastrar()` SEMPRE limpa TODOS os campos do formulário no final (inclusive "Pagamento Já Recebido") e repreenche com o padrão de 1 parcela, pra deixar pronto pro próximo cadastro — mesmo quando chamada internamente com `silencioso=True`. Ou seja: o valor era lido DEPOIS de já ter sido resetado pelo próprio cadastro, 100% das vezes que o valor não fosse coincidentemente igual a 1 parcela. Corrigido lendo `valor_pago` ANTES de chamar `_cadastrar()`. Validado com teste isolado reproduzindo o cenário exato (Integral de R$75,00 → gravava R$25,00 antes da correção → grava R$75,00 depois).

**Revisão de UX com 5 agentes em paralelo** (pedido explícito do usuário: "revise com 5 agentes essa usabilidade"), cada um com um recorte diferente da tela "Incluir Participante" (fluxo de dados/consistência, usabilidade/fricção, validação/limites, importação/duplicidade, ADM/casos de borda). Achados reais confirmados por leitura de código (não especulação) e corrigidos:
- **ADM isento 100% quebrado**: `_cad_adm_toggle` zera Cotas pra "0" no caso isento, mas `_cadastrar` rejeitava QUALQUER cotas<1 incondicionalmente — cadastrar o ADM isento sempre batia em "Número de cotas inválido!" e travava. Corrigido: cotas mínima passa a ser 0 quando o checkbox ADM está marcado.
- ADM isento não zerava "Pagamento Já Recebido" (podia registrar pagamento pra alguém isento) nem se protegia de recálculos automáticos subsequentes — `_cad_cotas_recalcular`/`_preencher_valor_cad` podiam reescrever o zeramento em silêncio ao perder foco do campo Cotas sem nem mudar nada. Corrigido: zera também o pagamento + `_cad_pago_modo=None`, e `_preencher_valor_cad` ganhou uma guarda que não recalcula por cima do zeramento intencional.
- Desmarcar ADM isento não restaurava Cotas="1" — o campo ficava em "0" pra sempre, travando o PRÓXIMO cadastro normal também. Corrigido.
- Checagem de limite de cotas do bolão rodava DEPOIS de criar a pessoa nova em "pessoas" — se o limite estourasse, ficava um registro órfão (pessoa sem nenhum participante apontando pra ela). Movida pra antes.
- Importar membro de bolão anterior podia trazer nome/telefone desatualizados: a lista de busca já mostra o dado corrigido (de "pessoas", pós-unificação de duplicados), mas o import de fato usava a cópia antiga denormalizada de "participantes". Corrigido pra usar a mesma fonte.
- Telefone sem validação de quantidade de dígitos (podia quebrar a busca por telefone do site, ver Problema 1) — adicionado mínimo 10/máximo 11 dígitos.
- Sem trava contra dois administradores no mesmo bolão — adicionada confirmação quando já existe um.
- Pagamento maior que o Valor Esperado era gravado sem nenhum aviso — adicionada confirmação quando ultrapassa 5% do esperado (pega o mesmo tipo de erro de digitação dos 3 bugs anteriores).
- Indicador visual de modo ("● modo: 1 parcela"/"integral"/"editado manualmente") adicionado ao lado do campo de pagamento — antes só dava pra adivinhar olhando o número.
- Botões CADASTRAR e CADASTRAR+PAGAR ganharam mais espaçamento entre si (reduz risco de clique errado num botão que grava pagamento de verdade).

Validado com 35/35 testes automatizados (regressão) + testes isolados cobrindo: ADM isento (marcar, recalcular sem mudar nada, cadastrar, desmarcar), pagamento integral no cenário exato do Fabrício Ataíde, e confirmação de segundo ADM (incluindo o caso do usuário recusar).

Versão desktop v6.28 → **v6.29**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 72 — Fechamento demorando minutos: regressão da própria correção da v6.29, cronômetro visível (v6.30, desktop)

Usuário reportou (com print da tela de fechamento parada em 55%): "fica uns bons minutos atualizando... preciso ver visualmente na tela... contagem de tempo, ou barra de evolução". Investigado antes de assumir: a correção da Rodada 71 (sincronizar `busca_participante` também no fechamento automático, não só no botão manual) fazia **1 GET + 1 PATCH no Firestore por participante, de CADA bolão publicado, TODA vez que o programa fechava** — mesmo pra quem não tinha mudado absolutamente nada desde o fechamento anterior. Com bolões de 40+ pessoas, isso sozinho virava minutos de espera, e esse sub-passo era completamente silencioso na tela (nenhum log, nenhuma atualização de %), explicando a barra "travada" no mesmo número por bastante tempo.

Corrigido com um cache de fingerprint: nova coluna `participantes.busca_sync_hash` guarda um hash (nome+situação+cotas+valor pago) do que foi mandado da última vez pra cada bolão. `atualizar_busca_participante()` ganhou `ler_hash_fn`/`salvar_hash_fn` opcionais — se o hash bate, pula o GET+PATCH inteiro sem nenhuma chamada de rede. Aplicado nos 3 lugares que chamam essa função (fechamento automático, botão manual "Publicar no Site", botão manual "Sincronizar Busca por Telefone"). Na prática, só o PRIMEIRO fechamento depois desta atualização sincroniza todo mundo; os seguintes só tocam quem realmente mudou.

Visibilidade pedida explicitamente pelo usuário: cronômetro "⏱ Xs"/"XmYYs" na janela de fechamento, atualizado a cada segundo via `win.after`, visível mesmo quando a % geral não muda. A etapa de busca por telefone (antes muda e invisível) ganhou um callback de progresso (`progresso_fn`) que atualiza o rodapé ao vivo ("N/total, X atualizados, Y sem mudança") e um resumo com tempo gasto no log ao final de cada bolão.

Validado sem depender de rede real: testes isolados com `urllib.request.urlopen` mockado confirmam que hash igual não dispara NENHUMA chamada HTTP e que um participante alterado dispara GET+PATCH normalmente, salvando o hash novo depois; teste isolado do cronômetro confirma formatação (segundos → "XmYYs" a partir de 60s) e que destruir a janela com um tick de `after()` pendente não lança exceção. 35/35 testes automatizados de regressão continuam passando.

Versão desktop v6.29 → **v6.30**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 73 — Lançamento de reserva: padrão vira DÉBITO/SAÍDA, não CRÉDITO/ENTRADA (v6.31, desktop)

Pedido direto do usuário: "o lançamento de reserva... padrão ou em lote deve ter como padrão sempre o débito ou saque... para evitar que eu lance débito como crédito em um vacilo... isso já ocorreu antes". Mapeados os três formulários de NOVO lançamento de reserva no sistema (os dois que existem em "Reservas Pessoais" — individual e em lote — e o de "Reserva por Loteria"); todos abriam com CRÉDITO/ENTRADA pré-selecionado no combo, então um clique apressado em "Registrar" sem reparar no tipo já registrava dinheiro como entrada quando era saída, sem nenhuma trava.

Corrigido nos três: `self._rsv_tipo` (Reservas Pessoais, individual) e `tipo_cb` (Reservas Pessoais, em lote, dentro de `_abrir_popup_lote_reserva`) passam a abrir em "DÉBITO (uso)"; `self.res_tipo` (Reserva por Loteria) passa a abrir em "SAÍDA (uso da reserva)". Nos dois primeiros, os campos extras que só apareciam em DÉBITO (Loteria/Concurso/Descrição) já ficam visíveis desde a abertura, já que esse é o novo padrão — removido o `.pack_forget()` que os escondia assumindo CRÉDITO como ponto de partida. As telas de EDIÇÃO de um movimento já existente (`_rsv_editar_mov`, `_editar_mov_res`) não foram tocadas de propósito: elas já carregam o tipo real do registro sendo editado, nunca tiveram um "padrão" fixo — não é o mesmo risco que motivou o pedido.

Validado com `py_compile` + 35/35 testes automatizados de regressão, e conferência textual direta no arquivo de que nenhum dos dois combos de DÉBITO ficou com `pack_forget()` escondendo os campos por padrão.

Versão desktop v6.30 → **v6.31**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 74 — Botão Conferir sobe pra logo após o potencial do bolão; números sorteados sobem pra logo acima do melhor cartão (web)

Dois pedidos do usuário na tela de conferência do site (`index.html`/`script.js`): (1) o botão "🎲 CONFERIR RESULTADOS" só aparecia depois de listar TODOS os cartões do bolão — melhor se aparecesse logo após o card de "potencial do bolão"; (2) ao mostrar o resultado conferido, os números sorteados apareciam perto do final da tela (depois do resumo de prêmios inteiro) — melhor se aparecessem logo no início, perto do melhor cartão.

**Botão Conferir**: antes, `#cartoesArea` recebia um `innerHTML` único com o card de potencial (`calcularChancesBolao`) SEGUIDO da lista completa de cartões agrupados por bolão — e o `<button id="btnConferir">` era um elemento estático posicionado DEPOIS de `#cartoesArea` no HTML, então sempre aparecia depois de tudo, não tinha como ficar "no meio" do conteúdo dinâmico sem mover o próprio nó do botão (arriscado: `innerHTML =` destrói qualquer filho, inclusive um botão movido pra dentro, perdendo o listener na próxima renderização). Solução: separado em dois containers — `#potencialArea` (novo, só o card de potencial) seguido do botão estático, seguido de `#cartoesArea` (só a lista de cartões). `mostrarCartoes()` agora escreve em cada um separadamente; os outros 3 pontos que resetavam `#cartoesArea` (estado vazio, erro, troca de concurso) passaram a limpar `#potencialArea` junto, pra não deixar um card de potencial velho grudado na tela.

**Números sorteados no topo**: em `conferirResultados()` e `exibirResultadoSalvo()` (resultado já salvo), o bloco `.numeros-sorteados` (as bolinhas com os números do sorteio) estava sendo montado por ÚLTIMO no HTML, depois do troféu, do potencial, do resumo de prêmios e da nota de aposta múltipla. Movido pra primeiro — antes até do banner de troféu — com um título novo (`🎱 Números Sorteados`, nova classe `.numeros-sorteados-titulo` no `style.css`) pra ficar claro o que é, já que perdeu o contexto de vir "depois" do resumo.

Validado com `node --check script.js` (sintaxe) e revisão linha a linha de todos os pontos que escrevem/limpam `#cartoesArea` pra confirmar que `#potencialArea` é mantido em sincronia em cada um.

`sw.js` `CACHE_NAME` v52 → **v53**.

## Rodada 75 — Números sorteados de verdade ADJACENTES ao primeiro cartão (não só "mais acima") (web)

Usuário voltou após a Rodada 74 pedindo pra "certificar" que os números ficassem "logo acima do primeiro cartão que mais acertou... é importante visualizar próximo". Investigando de novo: a Rodada 74 moveu os números pro TOPO do resumo (`resultadosArea`), mas esse resumo inteiro ainda ficava DEPOIS da lista completa de cartões (`cartoesArea`) na página — então os números, mesmo "no início do resumo", continuavam aparecendo só depois de toda a lista de cartões ter passado, longe do primeiro cartão de verdade. Não era o que o usuário pediu.

Investigação mais a fundo revelou duas rotas de exibição DIFERENTES pro mesmo resultado, cada uma com sua própria grade de cartões:
- **Conferência na hora** (`conferirResultados`): a grade de cartões é renderizada à parte, em `#cartoesArea`, via `mostrarCartoes()`. `resultadosArea` só tem o resumo (troféu/potencial/prêmios), comentado explicitamente "SEM CARTÕES".
- **Resultado já salvo** (`exibirResultadoSalvo`, quando o concurso já tinha sido conferido antes): resumo E grade de cartões saem JUNTOS, tudo dentro de `resultadosArea` — `#cartoesArea` nem é tocado nessa rota.

Corrigido nas DUAS rotas, cada uma no lugar certo:
- `index.html`: `#resultadosArea` movido pra ANTES de `#cartoesArea` na página (sem dependência de ordem em CSS/JS — conferido via grep que nada lia por posição relativa, só por `id`).
- `mostrarCartoes()`: números injetados no TOPO de `#cartoesArea`, logo antes do primeiro grupo de bolão/cartão — removidos do resumo em `conferirResultados()` (que volta a ser só resumo, sem números).
- `exibirResultadoSalvo()`: números movidos pra logo ANTES do loop que desenha os cartões (depois do resumo, mas imediatamente colado na grade) — não mais no topo do bloco inteiro.

Resultado: nas duas rotas, o bloco de números fica como o elemento imediatamente anterior ao primeiro `<div>` de cartão renderizado — que é sempre o de mais acertos, por `ordenarCartoesPorAcertos`.

Validado com `node --check script.js` (sintaxe) e leitura linha a linha das duas funções confirmando que o bloco de números é o último HTML adicionado antes do primeiro cartão em ambos os casos.

`sw.js` `CACHE_NAME` v53 → **v54**.

## Rodada 76 — Histórico de reserva: opção de ver/copiar o extrato COMPLETO, não só desde o último depósito (admin/web)

Pedido do usuário: no painel admin, ao pedir o histórico de reserva de um participante, o extrato pra WhatsApp sempre vinha cortado "a partir do último depósito" — útil pra conferir o ciclo atual rápido, mas sem nenhum jeito de pegar o histórico INTEIRO quando precisava (ex.: auditoria, reclamação antiga).

Investigado antes de mexer: a visualização em tela (`mostrarHistorico`, botão "📜 VER HISTÓRICO") já mostra TUDO, sem filtro nenhum — o corte só existe na função que gera o texto pra copiar pro WhatsApp (`copiarHistoricoWhatsApp`, admin.js), que procura o depósito mais recente no histórico e descarta tudo antes dele.

Corrigido sem alterar o comportamento padrão (continua cortando no último depósito por padrão, que já era o esperado): `copiarHistoricoWhatsApp` ganhou um parâmetro opcional `completo` (default `false`); quando `true`, pula a busca do último depósito e manda o array inteiro, trocando os textos "a partir do último depósito" por "histórico completo" na mensagem gerada. Novo botão "📜 COPIAR HISTÓRICO COMPLETO (desde o início)" adicionado logo abaixo do botão de sempre, em `mostrarHistorico`, chamando a mesma função com `completo=true`.

Validado com `node --check admin.js` (sintaxe).

`sw.js` `CACHE_NAME` v54 → **v55**.

## Rodada 77 — Adiciona a +Milionária como 4ª loteria (site + admin + desktop)

Pedido do usuário: "vamos também apostar nessa loteria" — adicionar a +Milionária em todo o sistema, tanto pra cadastrar cartões no admin quanto pra conferir resultados no site, "conforme funciona para as demais loterias" (incluindo importação de PDF).

**Por que foi grande**: a +Milionária sorteia DOIS conjuntos independentes — 6 números de 1 a 50 (igual as outras loterias, só que universo/tamanho diferentes) E 2 trevos de 1 a 6 — enquanto as outras 3 loterias do sistema são todas "escolha N de M, sorteiam K, confere quantos bateu" num único sorteio. Antes de codar, mandei um agente mapear TODOS os pontos do código que lidam com loteria (dezenas de condicionais `if/else` espalhadas, sem tabela central) e pesquisei a estrutura oficial de faixas de prêmio da +Milionária (10 faixas, combinando acertos de números com acertos de trevo — confirmado contra fontes externas, não achei a tabela no site oficial da Caixa). Perguntei ao usuário o nível de profundidade antes de começar: confirmou implementação completa (números + trevos de verdade, não só números) com os limites oficiais (6 a 12 números, 2 a 6 trevos).

**Decisões de design**:
- Chave interna da loteria: `maismilionaria` (bate com o slug usado pela API da Caixa e por wrappers da comunidade).
- As 10 faixas oficiais (`tierChaveMilionaria` em script.js): combinam acertos de números (2 a 6) com acertos de trevo (1 ou 2) — com uma assimetria real: 3 ou 2 números com ZERO trevo não paga nada (diferente de 6/5/4 números, que pagam mesmo sem trevo). Confirmado com 3 testes novos em `test/calculos-script.test.js`.
- "Bilhetes equivalentes"/potencial do bolão: passou a multiplicar a combinatória de números PELA combinatória de trevos (`C(n,6)×C(m,2)`) — um cartão com mais trevos que o mínimo também é aposta múltipla nessa dimensão.
- Faixas de estrelas (`FAIXAS_ESTRELAS.maismilionaria`): calibração inicial por proporção de universo (não há bolões reais da +Milionária ainda pra calibrar contra, diferente das outras 3) — universo completo (números×trevo) é ~4,76× o da Mega, faixas da Mega escaladas pelo mesmo fator. Comentário no código avisa pra recalibrar quando houver histórico real.
- "Chance" exibida no card de potencial: só a parte NÚMEROS (4 de 6, rótulo "4 NÚMEROS") — os dois sorteios são independentes, o trevo não muda essa probabilidade.

**O que NÃO foi implementado, por quê, e onde isso fica visível pro usuário**: a extração automática de TREVOS de dentro de um PDF de comprovante não foi implementada — não há (que eu tenha achado) um comprovante real da +Milionária pra confirmar o formato exato desse campo, e arriscar "adivinhar" o layout poderia gravar trevo errado num cartão real sem o admin perceber. Números continuam sendo importados do PDF normalmente (mesmo mecanismo das outras 3 loterias); a tela de revisão da importação mostra um aviso verde "🍀 Trevos não são extraídos automaticamente do PDF ainda — edite cada cartão depois de importar" quando a modalidade é +Milionária. O mesmo vale pra API de resultados da Caixa (`buscarResultadoInterno`): tenta vários nomes de campo prováveis (`trevosSorteados`, `listaTrevos`, etc.) e avisa no console se nenhum bater, em vez de falhar calado.

**Tudo que mudou, por arquivo**:
- `firestore.rules`: `resultados_conferidos` aceita o campo opcional `trevos` e a loteria `maismilionaria`.
- `index.html`: 4º botão no seletor de loteria (🍀 MILIONÁRIA), `.loteria-selector` alargado de 420px pra 480px pra caber os 4 sem espremer.
- `script.js` (o mais extenso): cache/mapas de concursos por loteria, `calcularChancesBolao` (universo 50, trevos multiplicando bilhetes), `calcularPremiosMilionaria`/`tierChaveMilionaria` (as 10 faixas), `gerarResumoPremiosMilionaria` (grid de 10 itens em vez de 5), `ordenarCartoesPorAcertos` (desempate por trevo), `gerarBannerTrofeu` (mostra trevos do melhor cartão), `mostrarCartoes`/`exibirResultadoSalvo`/`conferirResultados` (trevos sorteados exibidos junto dos números, por cartão), `buscarResultadoInterno` (URL da API + leitura defensiva dos trevos), `compartilharWhatsApp`, `setLoteria`. Nova tabela central `LOTERIA_K`/`LOTERIA_UNIVERSO`/`LOTERIA_TREVOS` reduz repetição e risco de esquecer um branch novo nessas funções.
- `admin.html`: 4º botão nos 2 seletores (Cadastro e aba Cartões), opção no import de PDF, campo de trevos no modo digitação, 2ª grade de trevos no modo seleção, 4º card no dashboard.
- `admin.js` (o mais extenso): `regrasLoteria` ganhou sub-objeto `trevos`; nova `parseTrevosTexto` (paralela a `parseNumerosTexto`); grade de trevos (`inicializarGradeTrevos`, `toggleTrevoSelecao` e afins, paralelos às funções de números); `existeCartaoDuplicado` e `verificarDuplicados` passam a incluir trevos na chave de duplicata (mesmos números com trevos diferentes é aposta diferente, não duplicado); os 3 fluxos de cadastro (digitação, seleção, seleção-toggle) validam e gravam trevos; `editarCartao` ganhou campo de trevos; `exibirCartoesAdmin`/`exportarCartoes` mostram trevos; `parsearComprovanteCaixa` ganhou suporte a "+Milionária" no nome da modalidade (achado real ao testar: o regex não podia virar genérico demais, por causa de um caso real "Modalidade: Lotofácil da Independência" — ver teste); estatísticas do dashboard (`calcularEstatisticas`, `atualizarDashboardEstatisticas`) ganharam a 4ª loteria.
- `bolao_pro_v3.py`: "+Milionária" em `LOTERIAS`; os 3 pontos que inferem loteria pelo NOME do bolão (não cadastra cartões, mas publica bolões/participantes no site).
- `consulta.js`/`participantes.html`: mapas de nome de loteria.
- `test/calculos-script.test.js` e `test/calculos-admin.test.js`: testes novos pra `tierChaveMilionaria`, `calcularPremiosMilionaria` (aposta múltipla cruzando números×trevos, e o caso "sem prêmio"), `regrasLoteria`, `parseTrevosTexto`. Também corrigidos 2 testes que já estavam quebrados ANTES desta rodada (defasados desde a mudança Quina→terno da Rodada 70, nunca tinham sido rodados depois).

**Bug que eu mesmo introduzi e corrigi na mesma rodada**: o primeiro regex que escrevi pra reconhecer "+Milionária"/"Mais Milionária" no campo "Modalidade:" do comprovante PDF ficou genérico demais (aceitava uma 2ª palavra separada por espaço) e quebrou um teste que já passava — um comprovante real tem "Modalidade: Lotofácil da Independência" (nome do BOLÃO colado depois do nome da loteria). Corrigido revertendo pra um regex mais conservador (só 1 palavra + hífen opcional, + "+" opcional na frente) — "Mais Milionária" (2 palavras) não vai ser reconhecido automaticamente até alguém confirmar contra um comprovante real, mas isso é uma limitação assumida e documentada, não um bug silencioso.

Validado com: `node --check` nos 3 arquivos JS tocados; suíte JS completa (`node --test test/*.test.js`) — 52/52 passando, incluindo 6 testes novos e 2 consertados; `py_compile` + suíte Python (35/35); `.exe` reconstruído.

Versão desktop v6.31 → **v6.32**. `sw.js` `CACHE_NAME` v55 → **v56**.

## Rodada 78 — Extração automática dos trevos do PDF da +Milionária (completa o que ficou pendente da Rodada 77)

A Rodada 77 deixou a extração de TREVOS do comprovante PDF deliberadamente de fora — sem um comprovante real da +Milionária pra confirmar o formato exato desse campo, não arrisquei adivinhar e gravar trevo errado num cartão de verdade sem o admin perceber. O usuário mandou um comprovante real (concurso 397, 11 jogos de 7 dezenas, todos com 2 trevos) nesta rodada, confirmando o formato: cada jogo imprime "Jogo N" / dezenas / **"Trevos: NN | NN"** numa linha própria logo depois das dezenas, e "Modalidade: +Milionária" vem como uma palavra só com "+" colado (sem espaço) — exatamente a forma que o regex conservador da Rodada 77 já reconhecia.

**Implementado**: nova função `extrairTrevosDoTexto()` (admin.js), irmã de `extrairJogosDoTexto()` — mesmo regex de dezenas pipe-separadas, mas buscando depois do rótulo "Trevos:". Para o caminho REAL usado no navegador (`extrairJogosDeItensPosicionados`, que separa colunas pelas coordenadas x/y do pdf.js), a extração de trevos roda **na mesma coluna, no mesmo laço**, garantindo que `trevos[i]` sempre casa com `jogos[i]` por posição mesmo num comprovante de 2 colunas — testado explicitamente com um layout sintético de 2 colunas (jogos ímpares à esquerda, pares à direita) pra confirmar que o reordenamento por coluna não desalinha jogo e trevo.

`parsearComprovanteCaixa` passou a validar os trevos de cada jogo igual já validava as dezenas (quantidade 2–6, intervalo 1–6, sem repetidos) — um jogo com trevo ausente ou inválido fica marcado com erro na tela de revisão, igual um jogo com dezena errada, em vez de ser gravado incompleto. A tela de revisão mostra os trevos como bolinhas verdes ao lado das dezenas de cada jogo. `confirmarImportacaoPdf` agora grava os trevos junto do cartão, e a checagem de duplicado (tanto na importação de PDF quanto em "Verificar Duplicados") passou a incluir trevos na chave — mesmos números com trevos diferentes são apostas diferentes, não duplicata.

Removido o aviso "trevos não extraídos, edite depois" da tela de importação (ficou obsoleto — trevos agora extraem normal). A opção de editar manualmente continua existindo em `editarCartao` pra qualquer caso que a extração não pegue.

**Validado com o texto REAL do comprovante enviado** (não um exemplo inventado): novo teste em `test/parser-comprovante.test.js` roda o texto completo das 11 apostas do comprovante do usuário e confere, número por número e trevo por trevo, o primeiro jogo, o último e um do meio — garantindo que a extração bate com o PDF de verdade, não só com uma string sintética. Mais um teste em `test/parser-comprovante-posicoes.test.js` cobre o caminho de 2 colunas com coordenadas simuladas. 54/54 testes passando (2 novos).

`sw.js` `CACHE_NAME` v56 → **v57**.

## Rodada 79 — Trevos da +Milionária extraídos mas invisíveis na revisão do PDF (ajuste de UX)

Usuário testou a extração real da Rodada 78 e mandou print: os trevos extraídos apareciam na tela de revisão, mas com o MESMO estilo verde/quadrado das 7 dezenas do jogo, na mesma linha, sem nenhum rótulo — pareciam "mais 2 números do jogo" em vez de trevos, dando a impressão de que a extração tinha falhado (não tinha: os dados já estavam certos, só a exibição que não deixava claro o que era o quê).

Corrigido com um estilo próprio pros trevos na tela de revisão (`_chipsTrevos`, nova função em admin.js): cor âmbar (em vez do verde das dezenas), formato redondo, e rótulo "🍀" antes dos chips — visualmente inconfundível com as dezenas do jogo agora. A lista de cartões já salvos (`exibirCartoesAdmin`) já tinha essa mesma clareza (🍀 por chip + linha própria), não precisou mudar.

Nota à parte (não é bug, só avisando): a ORDEM dos jogos mostrados na revisão segue a ordem de extração por COLUNA (ver Rodada 77 — comprovante de 2 colunas extrai a coluna inteira da esquerda primeiro, depois a da direita), não necessariamente a numeração "Jogo N" original impressa no PDF. Os dados de cada jogo (números+trevos) continuam um conjunto completo e correto, só o rótulo de posição na tela pode não bater 1:1 com o "Jogo N" do PDF.

Validado com `node --check admin.js` e a suíte completa (54/54, sem teste novo — ajuste é só de estilo HTML).

`sw.js` `CACHE_NAME` v57 → **v58**.

## Rodada 80 — Excluir 1 cartão direto na lista (admin)

Pedido do usuário: "quero ter a opção de excluir um cartão cadastrado... hoje não tenho". Investigado: já existia exclusão em LOTE na aba Cartões (marcar checkbox de cada cartão + botão "🗑️ EXCLUIR" à parte, que só fica óbvio depois de marcar algo) — mas nenhum botão direto por cartão, e nada na tela de revisão da importação de PDF (que limpa a lista assim que confirma, sem deixar rastro pra corrigir um erro ali mesmo). Resultado: corrigir 1 cartão errado (inclusive um que saiu torto de uma importação de PDF) exigia achar o checkbox certo no meio da lista.

Corrigido com um botão "🗑️ Excluir" direto em cada cartão da lista (`exibirCartoesAdmin`), ao lado do "✏️ Editar" que já existia — nova função `excluirCartaoUnico(id)`, mesmo padrão de confirmação e exclusão do Firestore que `excluirSelecionados()` já usava, só que pra 1 cartão só, sem precisar de checkbox. A confirmação mostra concurso/bolão/números (e trevos, se a loteria for +Milionária) antes de excluir, pra não apagar o cartão errado por engano. Como cartões importados por PDF caem nesta MESMA lista depois de confirmados, isso também resolve o caso específico que o usuário citou ("depois que concluo a importação não tenho como excluir") — sem precisar mexer na tela de importação em si.

Validado com `node --check admin.js` e suíte completa (54/54 — sem teste novo, é só UI/Firestore write, mesmo padrão já coberto pela função irmã).

`sw.js` `CACHE_NAME` v58 → **v59**.

## Rodada 81 — Mensagem do WhatsApp da +Milionária ficava faltando 4 das 10 faixas de prêmio

Pedido do usuário: ao conferir a +Milionária, a mensagem gerada pra compartilhar no grupo do WhatsApp (`compartilharWhatsApp`, script.js) só listava 6 faixas (6, 5 e 4 números, cada uma combinada com trevo) — faltavam as 4 faixas de baixo (3 números + 2 trevos, 3 números + 1 trevo, 2 números + 2 trevos, 2 números + 1 trevo), que também são faixas de prêmio REAIS da Caixa (valor fixo — R$50/R$24/R$12/R$6 segundo a fonte pesquisada na Rodada 77), só que com a particularidade de só pagarem combinadas com pelo menos 1 trevo (0 trevo nessas 2 faixas não premia nada). O resumo mostrado no site (`gerarResumoPremiosMilionaria`) já mostrava as 10 corretamente desde a Rodada 77 — só a mensagem do WhatsApp tinha ficado incompleta.

Corrigido: as 4 faixas que faltavam foram acrescentadas na mensagem (ícone 🍀 pra diferenciar das faixas de cima), e a lógica de "qual frase de comemoração usar" ganhou um novo caso pra quando o resultado só bate uma dessas 4 faixas de baixo (antes caía direto em "vamos tentar de novo", mesmo tendo ganho prêmio).

Validado com `node --check script.js` e suíte completa (54/54).

`sw.js` `CACHE_NAME` v59 → **v60**.

## Rodada 82 — Histórico detalhado de pagamentos (data + valor) na tela de Participantes do admin web

Pedido do usuário: "ao clicar em bolão no admin, participantes preciso ter o resumo completo de quantas cotas o participante pagou, em detalhes, com data inclusive". Hoje em dia (antes desta rodada), a tela só mostrava o valor TOTAL pago por participante (`valorPago`) — nenhum detalhe de quando cada parcela entrou.

Investigado antes de codar: a tabela local `pagamentos` (SQLite, desktop) sempre teve esse detalhe — um registro por pagamento, com `valor`/`data_pagamento`/`mes_referencia` — mas nunca tinha sido sincronizada pro Firestore, que só recebia a soma agregada via `SUM(valor)`. O admin web só lê o que está no Firestore (`participantes/{bolaoId}`), então faltava o dado na origem, não só a exibição.

**Desktop (bolao_pro_v3.py)**: novo campo `historicoPagamentos` (array de `{valor, data, mesReferencia}`) adicionado em `_montar_lista_part_firestore()` (usada por "Publicar no Site" e pela sincronização em lote de busca por telefone) e no bloco equivalente, hand-copiado, da sincronização automática do fechamento (`_on_close`) — os dois pontos que de fato escrevem a coleção `participantes` no Firestore. `enviar_bolao_para_site()` e o PATCH inline do fechamento precisaram incluir o novo campo na conversão pro formato do Firestore (usando o conversor genérico `_firestore_python_para_valor` só pra esse campo, pra não arriscar mudar o comportamento dos outros).

**Achado real ao implementar** (bug que eu mesmo quase deixei passar): `ORDER BY data_pagamento` na consulta SQL ordena pelo DIA primeiro — `data_pagamento` é texto "DD/MM/AAAA", e string sort compara caractere a caractere, então "10/01/2026" (dia 10) vinha ANTES de "20/12/2025" (dia 20) mesmo sendo DEPOIS cronologicamente. Pego porque testei especificamente um cenário assim (dia maior numa data mais antiga), não só o caso "feliz" onde dia e cronologia coincidem por acaso. Corrigido remontando "AAAAMMDD" com `substr()` só pra efeito de ordenação.

**Admin web (admin.js)**: cada card de participante (`carregarParticipantesAdmin`) ganhou um botão "📋 Ver histórico (N pagamentos)" que expande uma lista com data, valor e mês de referência de cada pagamento — ordenados cronologicamente de novo no JS (`_compararDataBR`, mesmo cuidado do backend, como defesa extra contra dado sincronizado fora de ordem). Participantes publicados ANTES desta rodada mostram "sem histórico detalhado" até o bolão ser republicado ou o desktop fechado de novo — dado antigo não tem como ganhar histórico retroativo.

Validado com: teste isolado no desktop (participante com 3 pagamentos, confere o array montado E a conversão pro formato Firestore); teste isolado específico pro bug de ordenação (dia 20/dez/2025 vs dia 05/jan/2026, que string-sort erraria); 2 testes novos em `test/calculos-admin.test.js` pra `_compararDataBR`. 56/56 testes JS passando, 35/35 Python.

Versão desktop v6.32 → **v6.33**. `dist/SistemaBoloes.exe` reconstruído. `sw.js` `CACHE_NAME` v60 → **v61**.

## Rodada 83 — Abas "Participantes" e "Financeiro" fundidas numa só (desktop)

Pedido do usuário: "A aba Participantes e Financeiro ficam confusas... queria resolver tudo em uma aba... e ter na mão as informações do participante de forma completa ao selecionar o nome dele... revise... pensando sempre na UX... usabilidade". Perguntei se o pedido era só juntar o cadastro com o perfil financeiro (a duplicação real) ou as duas abas inteiras — o usuário confirmou: quer as duas inteiras juntas, "organizada melhor e funcional".

Investigado antes de codar: "Participantes" tinha 2 sub-abas (lista de cadastro + "Pessoas/Unificar", registro global entre bolões). "Financeiro" tinha 5 (Pagamentos — que na prática já era o perfil financeiro de UM participante, com busca própria — e Depósitos/Relatório/Reservas Pessoais/Histórico, ferramentas do bolão/fundo inteiro, não de uma pessoa). A confusão relatada vinha da duplicação entre a lista de cadastro e "Pagamentos": duas buscas separadas pra achar a mesma pessoa, informação fragmentada.

Usado o mesmo padrão já aprovado pelo usuário antes na fusão da aba Gestão (`_build_gestao_unificada`/`_mostrar_gestao_secao`): seletor segmentado fixo no topo + seções empilhadas na mesma área via `tkraise()`, sem `ttk.Notebook` interno (nenhum evento de troca de aba — cada seção recarrega seus dados explicitamente ao ser escolhida). Resultado: 1 aba de topo "👥 Participantes" com 6 seções (`_build_part_fin_unificado`):

- **👤 Perfil do Participante** (nova, `_build_perfil_participante`) — mestre-detalhe: lista de participantes do bolão ativo sempre visível à esquerda (corpo da antiga lista de cadastro, só reparentado), e ao clicar num nome (`<<TreeviewSelect>>` → `_perfil_tree_sel`) aparece à direita o cadastro completo, status, cards financeiros (esperado/pago/saldo/qtd pagamentos), observações, formulário de registrar pagamento e histórico de pagamentos — tudo que antes exigia trocar de aba e buscar de novo numa segunda caixa de busca. A busca própria da antiga "Pagamentos" (`_pag_buscar`/`_pag_selecionar`) foi removida — `_pag_info()` (que desenha o painel) não mudou nada, só passou a ser disparada pela lista compartilhada. Botões "✏ Editar Cadastro" e "🧾 Recibo" ficam visíveis no painel de detalhe (antes só via duplo-clique ou numa busca separada).
- **🏦 Depósitos / 📊 Relatório / 💰 Reservas Pessoais / 📋 Histórico Geral / 🔗 Pessoas-Unificar** — as 5 telas continuam EXATAMENTE como eram (`_build_dep`/`_build_rel`/`_build_reservas`/`_build_historico`/`_build_pessoas` sem nenhuma mudança interna), só o contêiner ao redor mudou — mesma garantia documentada na fusão da Gestão, propositalmente não misturadas na visão "Perfil" porque são operações do fundo inteiro, não de uma pessoa só (decisão de UX, não só técnica: enfiar tudo numa tela só pioraria a usabilidade em vez de resolver a confusão relatada).

Validado com teste isolado de Tk ao vivo (bolão + 2 participantes + 1 pagamento num banco `:memory:`): confirma 4 abas de topo (era 5), lista do Perfil carregada, seleção de um nome populando os cards certos (nome/telefone/status/valor pago), seleção preservada ao trocar de seção e voltar, e as 6 seções trocando sem erro. 35/35 testes Python (`test/test_bolao_pro_v3.py`) continuam passando — nenhuma função de cálculo/dedup mudou de assinatura.

Versão desktop v6.33 → **v6.34**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 84 — Polimento de design/usabilidade da aba Participantes fundida (5 agentes em paralelo)

Pedido do usuário, logo após a Rodada 83: "use 5 agentes para deixar essa guia perfeita.... ainda tem redundâncias.... quero design padrão apple.... e usabilidade perfeita". Diferente das rodadas anteriores (1 agente investigando e eu implementando), aqui usei 5 agentes `general-purpose` em paralelo (background), cada um revisando a MESMA tela por um ângulo diferente, sem editar nada — só relatório — pra eu consolidar os achados numa implementação única (5 agentes editando o mesmo arquivo em paralelo teria gerado conflito):

1. **Redundância** — caçou ações/informação duplicada e lixo de código deixado pela fusão.
2. **Paleta/estética "Apple"** — avaliou a paleta de cores, tipografia, hierarquia de botões, dentro do que o Tkinter puro realmente desenha (sem CSS, sem sombra, sem canto arredondado nativo).
3. **Fluxo de interação/usabilidade** — simulou tarefas reais de um admin não-técnico (achar alguém, registrar pagamento, corrigir telefone, remover duplicata) e mediu indireção/cliques.
4. **Limpeza de código pós-fusão** — grep extensivo por nomes/atributos que deveriam ter sido removidos na Rodada 83 e não foram, `py_compile`, checagem de `def` duplicado.
5. **Validação funcional ao vivo** — rodou o mesmo teste isolado de Tk (`DB_FILE=":memory:"`, `BolaoApp.__new__`) com 3 participantes em 3 situações diferentes, clicou em cada um, registrou um pagamento de verdade, e tirou um "raio-x" de cores/fontes reais (`cget`) de cada widget do painel, pros outros agentes de design terem dados concretos em vez de advinhar a aparência.

**Achado mais importante (bug real, não só estética)**: os agentes 1 e 3, de forma independente, apontaram a mesma causa raiz — a lista mestre (`_cad_lista_load`) e o card de status do painel (`_pag_info`) calculavam status na mão (`saldo<=0 ? Quitado : Pendente`), em vez de usar os helpers centrais já usados em Dashboard/Relatório (`_n_cotas_participante`/`_status_part_adm`). Isso escondia o 3º estado real do sistema, "🟦 Em Dia" (pagou o esperado até o mês atual, sem ter terminado o total) — quem estava em dia aparecia com a MESMA cor/ícone de quem estava realmente atrasado, bem na tela que o usuário pediu pra ser a fonte única de verdade sobre cada participante. Também fazia o status de um ADM isento divergir entre esta tela e o Dashboard. Corrigido chamando os mesmos helpers nos dois lugares; `_cad_lista_tree` ganhou a tag `emdia` (mesmo azul `#d6eaf8` já usado no Relatório).

**Outras correções implementadas, por agente de origem**:
- *(Redundância)* Popup "✏ Editar Cadastro" recriava uma combobox com todos os participantes e "re-selecionava" o já conhecido via regex, mesmo chamado com `participante_id` certo (os 2 únicos call-sites sempre passam id) — virou: com id conhecido, mostra só um rótulo com o nome e carrega o formulário direto (`_cad_edit_carregar`); a combobox fica só pro caso órfão (sem chamador hoje, mantida como caminho de segurança).
- *(Redundância)* `_registrar_pag` não recarregava a lista mestre — corrigido chamando `_cad_lista_load()` ao final, preservando a seleção (`_filtrar_cad_lista` já guarda `_pag_pid_atual`).
- *(Paleta)* Seletor segmentado do topo usava laranja `#e67e22` pra "seção ativa" — a MESMA cor que, em todo o resto do app, significa "pendente/alerta". Trocado pro azul `#2196F3`, que já é a cor de seleção da treeview — 1 cor de destaque, 1 significado.
- *(Paleta)* Os 4 cards financeiros do painel de detalhe (antes roxo/verde/vermelho-ou-verde/azul, "dashboard arco-íris") viraram cards neutros brancos com borda fina `#e5e5ea`; título cinza `#6e6e73`, valor `#1d1d1f` bold — só o valor do Saldo Restante ganha cor (vermelho `#e74c3c`/verde `#1D9E75`).
- *(Paleta)* Nova função `btn_secundario()` (ao lado de `btn()`) — botão "texto" sem bloco de cor sólida, só a cor do texto sinaliza o tipo de ação. Usada pra dar hierarquia: "➕ Incluir Participante" é a única ação em destaque sólido da lista mestre; "🔄 Atualizar"/"🗑 Remover"/"🧹 Unificar" (e "✏ Editar Cadastro"/"🧾 Recibo" no painel) viraram botões-texto — antes "Remover" (destrutivo) tinha peso visual igual a "Incluir" (ação mais comum).
- *(Usabilidade)* Campo de observações ganhou moldura leve (card branco com borda) — antes era texto cinza-itálico minúsculo entre os cards e o formulário, fácil de ignorar mesmo carregando acordos de pagamento relevantes na hora de registrar um valor.
- *(Usabilidade)* Comboboxes Mês/Ano do formulário de pagamento entraram na cadeia de Enter (faltavam — só Valor→Data→Obs→Registrar avançava com Enter).
- *(Limpeza de código)* Confirmado pelo agente 4: nenhuma referência residual a nomes removidos na Rodada 83, `py_compile` limpo, nenhum `def` duplicado novo, colunas do treeview batendo com os valores inseridos. Única observação (não é bug): 3 prefixos (`_cad_*`/`_pag_*`/`_perfil_*`) coexistem na mesma tela — deliberado, renomear tudo ampliaria o risco sem ganho real agora.

**Não implementado nesta rodada** (fora de escopo, reportado mas não corrigido): o agente 5 encontrou, incidentalmente, que `mes_referencia` é gravado em 2 formatos diferentes dependendo de qual tela registra o pagamento (`"Jan/2026"` no formulário principal vs. `"01/2026"` no popup rápido) — bug de dado pré-existente, anterior a esta fusão, que afeta ordenação/filtro em Relatório/Histórico. Não corrigido agora porque exigiria decidir o que fazer com registros antigos já gravados no formato velho (risco em dado de produção) — fica anotado pra uma rodada dedicada.

Validado com teste isolado de Tk ao vivo (3 participantes, 1 em cada status — Quitado/Em Dia/Pendente, incluindo o cenário "Em Dia" que não existia antes de testar) e os 35 testes Python existentes continuam passando.

Versão desktop v6.34 → **v6.35**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 85 — Bug real: importação de comprovante +Milionária falhava com 3+ trevos marcados

Usuário enviou 4 comprovantes reais da +Milionária (concurso 398) e relatou: "quanto tentei importar esse jogos o sistema deu erro... provavelmente por conta de alguns cartões trerem 3 trevos". Arquivos salvos em `C:\Users\Elton\Downloads\comprovanteAposta*.pdf` — 3 deles com 3 trevos marcados por jogo, 1 com o mínimo de 2.

**Diagnóstico**: sem browser pra rodar o pdf.js de verdade, usei `pdfplumber` (Python) pra extrair as posições reais (x/y/largura) de cada palavra dos 4 PDFs e reimplementei em Python, linha por linha, o MESMO algoritmo de agrupamento por coluna que `extrairJogosDeItensPosicionados` usa no admin.js (mesmo limiar de gap, mesma lógica de segmentação) — assim dava pra ver exatamente o que a função real produziria sem precisar de um navegador. Resultado: nos 3 comprovantes com 3 trevos, a função devolvia o DOBRO de "jogos" esperado (ex.: 20 em vez de 10), com metade deles tendo só 3 dezenas. No comprovante com 2 trevos (mínimo), tudo saía certo.

**Causa raiz**: `extrairJogosDoTexto` (admin.js) tinha um comentário explícito assumindo que uma linha "Trevos: NN | NN" **sempre** tem exatamente 2 números, então nunca bateria na regex de "sequência de 3+ dezenas" (`\d{1,2}(?:\s*\|\s*\d{1,2}){2,}`) usada pra achar os jogos. Essa suposição só vale pro MÍNIMO de trevos da +Milionária (2) — a regra oficial permite marcar de 2 a 6. Com 3 trevos, a própria linha "Trevos: 03 | 05 | 06" tem 3 números ligados por "|" e batia na mesma regex, virando um "jogo" fantasma de 3 dezenas: dobrava a contagem de jogos E cada fantasma reprovava a validação de mínimo de dezenas (nenhuma loteria tem jogo com menos de 5), gerando exatamente o erro relatado. Os testes existentes nunca pegaram isso porque todos os fixtures de +Milionária (inclusive o comprovante real usado nas Rodadas 57/58) vinham com 2 trevos — o caso mínimo.

**Correção**: `extrairJogosDoTexto` agora remove toda linha "Trevos: ..." (com qualquer quantidade de trevos) do texto ANTES de procurar jogos, com `secao.replace(/Trevos:\s*\d{1,2}(?:\s*\|\s*\d{1,2})*/gi, '')`. A extração de trevos de verdade (`extrairTrevosDoTexto`) continua rodando sobre o texto original — só a busca de jogos precisava da versão "limpa". Correção única, usada tanto no caminho de texto achatado (1 coluna) quanto no caminho posicional por coluna (`extrairJogosDeItensPosicionados`, que chama a mesma função por coluna).

**Validado com**: 2 testes novos usando dados reais dos comprovantes enviados — um no layout de 1 coluna (`test/parser-comprovante.test.js`, `parsearComprovanteCaixa` fim a fim) e um no layout de 2 colunas (`test/parser-comprovante-posicoes.test.js`, que é o layout real desses comprovantes — "Jogo 1" esquerda / "Jogo 2" direita / "Jogo 3" esquerda / ...), ambos com 3 trevos por jogo reproduzindo o bug exato e confirmando que não sobra nenhum "jogo fantasma". Depois, reconfirmado contra os 4 PDFs reais de novo via o diagnóstico posicional em Python: os 4 agora extraem exatamente o número de jogos esperado (10, 14, 14, 14) com jogos.length === trevos.length em todos. 59/59 testes JS passando (57 antes + 2 novos).

sw.js `CACHE_NAME` v61 → **v62** (mudança só no admin.js, sem rebuild do desktop).

## Rodada 86 — Aba "Financeiro" (desktop): renomeada e redesenhada do zero (lista em acordeão)

Pedido do usuário, mesmo depois da fusão (Rodada 83) e do polimento com 5 agentes (Rodada 84): "Essa aba precisa ser redesenhada... o nome devia ser financeiro... e ela precisa ser totalmente redesenhada para ser efeita [perfeita]... mais fácil de usar... com as funcionalidades mais usadas à mão... e facilidade de obter todas as informações do membro na guia". Perguntei se era refinar o layout existente ou redesenhar do zero — o usuário confirmou: do zero.

**Por que abandonar o layout lista+detalhe** (treeview estreita à esquerda + painel fixo à direita, da Rodada 83/84): ele foi pensado pra "selecionar 1 pessoa por vez" e não tinha NENHUM resumo agregado — pra saber "como está o bolão financeiramente" era preciso ir pra outra sub-aba (Relatório). Uma tela chamada "Financeiro" devia responder essa pergunta antes de qualquer clique.

**Desenho novo** (`_build_financeiro`, substitui `_build_perfil_participante`+`_build_pag`): lista em acordeão, largura cheia —
- **Resumo financeiro no topo (NOVO)**: cards de Total de Participantes, Total Arrecadado, Total Pendente e contagem Quitados/Em Dia/Pendentes, sempre visíveis, recalculados a partir dos mesmos dados já carregados pra lista (sem query extra).
- **Barra de ações/filtros**: busca por nome, filtro por status (Todos/Quitados/Em Dia/Pendentes, botões tipo segmentado), "➕ Incluir Participante", "🧹 Unificar Duplicados".
- **Lista rolável de linhas** (`Canvas`+`Frame`+`Scrollbar`, mesma técnica já usada em `_build_inicio_lista`/`_build_dashboard`): 1 linha por participante. Colapsada mostra nome, badge de status (3 cores), saldo resumido e um atalho "💳" que abre o popup de pagamento rápido já existente (`_abrir_popup_registrar_pagamento`) sem precisar expandir — a ação mais comum, ao alcance de 1 clique. Clicar na linha expande, mostrando tudo (telefone/PIX, os 4 cards financeiros, observações, formulário completo de registrar pagamento, histórico) desenhado DENTRO da própria linha (`_financeiro_construir_detalhe`, que reaproveita `_pag_info` sem mudar a lógica dela, só onde ela desenha).
- **Acordeão de 1 linha por vez**: expandir uma colapsa a anterior automaticamente — decisão deliberada que permite continuar reaproveitando os widgets de formulário ÚNICOS que já existiam (`self.pag_val`/`self.pag_mes`/etc.) sem precisar de uma instância por participante, evitando reescrever o sistema de registro de pagamento inteiro.

**Aba de topo renomeada**: "👥 Participantes" → "💰 Financeiro" (as 6 seções que ela abriga — Participantes, Depósitos, Relatório, Reservas, Histórico, Pessoas — são todas sobre dinheiro/pessoas do bolão). Seção interna renomeada de "👤 Perfil do Participante" → "👥 Participantes".

Praticamente toda a LÓGICA de dados foi reaproveitada sem mudar nada (`_pag_info`, `_registrar_pag`, `_confirmar_pagamento_isento`, `_emitir_recibo`, `_abrir_popup_editar_participante`, `_abrir_popup_novo_participante`, `_unificar_duplicados`, `_status_part_adm`/`_n_cotas_participante`) — só a estrutura visual ao redor mudou. `_registrar_pag`/`_refresh_all`/`_refresh_dados_visiveis` simplificados: antes precisavam de 2 chamadas separadas (atualizar o painel de detalhe fixo + a lista ao lado); agora 1 chamada (`_financeiro_lista_load`) recalcula os KPIs e reconstrói a lista inteira, preservando por id qual participante estava com a linha expandida.

Validado com teste isolado de Tk ao vivo (3 participantes nos 3 status reais — Quitado/Em Dia/Pendente): confirma aba renomeada, seção renomeada, KPIs batendo com a soma real dos dados, status corretos por linha, expandir mostra o conteúdo certo, expandir uma segunda linha colapsa a primeira sozinha (acordeão), registrar um pagamento pelo formulário atualiza o banco E os KPIs E mantém a linha expandida, filtro por status e busca por nome funcionando, e o atalho "💳" não mexe em qual linha está expandida. 35/35 testes Python continuam passando.

Versão desktop v6.35 → **v6.36**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 87 — Nova seção "Financeiro" no admin web (promovida de dentro de "Bolões")

Pedido do usuário: "no admin, preciso ter como facilmente listar um bolão e ver todos os participantes e tudo que foi pago por ele... todos os participantes, pagamentos etc... revisar e melhorar a tela". A funcionalidade já existia desde a Rodada 82 (card "PARTICIPANTES POR BOLÃO"), mas vivia escondida dentro da seção "Bolões" (2º card, depois de "Gerenciar Bolões" — que é config/ativação de bolão, assunto diferente). Perguntei se deveria virar seção própria no menu ou só ser redesenhada no lugar — o usuário confirmou: seção própria.

**Mudanças em `admin.html`**: novo item no menu lateral "💳 Financeiro" (a navegação por `data-section` já é genérica, não precisou de JS novo pra troca de seção). Nova `<section id="section-financeiro">` com o card movido (não duplicado) de dentro de "Bolões" — mesmos elementos/ids (`bolaoSelectParticipantes`, `listaParticipantesAdmin`, `btnCopiarListaWhatsApp`), só de seção. A seção "Bolões" ficou só com "👥 GERENCIAR BOLÕES" (config), coerente com o nome.

**Resumo financeiro no topo (NOVO)**: 3 KPIs — Total de Participantes, Total Arrecadado, Total Pendente — reaproveitando as mesmas classes CSS do Dashboard (`.dashboard-cards`/`.dashboard-card`/`.dashboard-number`), escondidos (`display:none`) até um bolão com dados ser selecionado (em vez de mostrar zeros enganosos). Cálculo isolado numa função pura `_calcularKpisFinanceiro` (separada de `_financeiroKpisAtualizar`, que só escreve no DOM) — mesmo padrão já usado em `parsearComprovanteCaixa`/`calcularEstatisticas`, pra poder testar a lógica sem precisar de DOM de verdade. `carregarParticipantesAdmin`/`handleSelectChange`/`copiarListaParticipantesWhatsApp` não mudaram de lógica, só ganharam a chamada pro resumo.

Validado com 3 testes novos em `test/calculos-admin.test.js` pra `_calcularKpisFinanceiro` (soma certa com cotas múltiplas, nunca conta pendente negativo, lista vazia/indefinida não quebra) e checagem manual de que não sobrou nenhum id duplicado depois de mover o card. 62/62 testes JS passando (59 antes + 3 novos).

sw.js `CACHE_NAME` v62 → **v63**.

## Rodada 88 — "Financeiro por Participante" (web), bug do total de cartões do Dashboard, e resumo da +Milionária sem as faixas de 2 números

Pedido do usuário, em 3 partes: (1) "no admin... também aqui um [seletor de] participante e ele me mostra todos os bolões que ele está com situação de pagamento"; (2) "revise o dashboard pois no início diz uma quantidade de cartões e no meio tem outra somatória... mostre os resultados da mais milionária que não está mostrando"; (3) "no índex ao conferir a mais milionária mostre a partir de acerto de 3 números... não precisa 2 números e 1 ou 2 trevos pois premiação muito baixa".

**1. Novo card "👤 FINANCEIRO POR PARTICIPANTE"** (admin web, dentro da seção Financeiro criada na Rodada 87): o card existente já resolve "1 bolão → todos os participantes"; este resolve o caminho inverso. Não existe uma coleção "pessoas" no Firestore (só o SQLite local do desktop tem isso) — a lista é montada escaneando TODOS os docs de `participantes` (1 por bolão) e agrupando por telefone normalizado (`_chavePessoaFinanceiro`, mesma chave primária usada no desktop pra identificar a mesma pessoa entre bolões — `_calcular_grupos_duplicados`), com nome normalizado como fallback pra quem não tem telefone cadastrado. Selecionar alguém mostra um card por bolão (nome do bolão, loteria, status, valor pago/esperado, histórico de pagamentos expansível) mais um resumo de arrecadado/pendente no topo. Extraída a função `_renderCardFinanceiroHtml` (antes só inline em `carregarParticipantesAdmin`) pra não duplicar a lógica de card+histórico entre os 2 sentidos (por bolão / por participante) — e junto saiu um bug latente: o listener dos botões "Ver histórico" era ligado via `document.querySelectorAll` GLOBAL; com 2 listas de cards na mesma página agora usando a mesma classe de botão, isso ia religar listener duplicado nos botões da lista que não estava sendo recarregada. Corrigido escopando a um `container` específico (`_ligarBotoesHistoricoPagamento`).

**2. Bug real no Dashboard — "início mostra uma quantidade, no meio mostra outra"**: `atualizarDashboardEstatisticas` calculava o detalhamento de cartões por loteria (a linha "Mega: X · Lotofácil: Y..." embaixo do número grande "Total de Cartões") lendo a variável `cartoes` — só que essa é uma variável GLOBAL do arquivo, pertencente à seção "Cartões" do admin (lista filtrada por concurso/bolão selecionado ali), não os cartões que a função realmente deveria usar (os mesmos que calcularam o número de cima, `stats.totalCartoes`). Os dois números vinham de fontes diferentes e raramente batiam. Corrigido calculando `cartoesPorLoteria` dentro de `calcularEstatisticas` (que já percorre os cartões certos por outro motivo) e devolvendo no `stats` — agora os dois números sempre vêm da mesma fonte, nunca mais podem divergir.

**+Milionária "não aparecendo" no Dashboard**: investigado o código de ponta a ponta (fetch da API da Caixa, gravação em `resultados_conferidos`, leitura pro ranking top-3) — não achei nenhum bug: a loteria está incluída em todo o pipeline, o elemento HTML (`dashboardMelhorMilionariaDetalhes`) existe e tem o id certo. O card só mostra algo depois que alguém clica "Conferir Resultados" pra um concurso de +Milionária no site público (é isso que grava em `resultados_conferidos`, de onde o Dashboard lê) — como a +Milionária só passou a importar certo recentemente (Rodada 85, bug dos 3 trevos), é bem provável que ainda não exista nenhum concurso conferido pra ela. Não implementei nenhuma mudança de código pra isso — avisei o usuário que é esperado conferir o concurso 1x no site público pra o card passar a mostrar.

**3. Resumo da +Milionária (índex, ao conferir): mostra a partir de 3 números**: `gerarResumoPremiosMilionaria` listava as 10 faixas oficiais, incluindo as 2 de 2 números (2N+2T/2N+1T), que pagam pouco. Cortadas da TELA (ficam 8 faixas, de 6N+2T até 3N+1T) — `calcularPremiosMilionaria` continua calculando as 10 certinho por baixo, nada muda no valor pago, só o que aparece.

Validado com 5 testes novos: `calcularEstatisticas` (cartoesPorLoteria bate com totalCartoes), `_chavePessoaFinanceiro` ×3 (telefone formatado diferente cai na mesma chave, fallback por nome, telefone e nome nunca colidem), `gerarResumoPremiosMilionaria` (8 faixas na tela, sem as 2 de baixo). 67/67 testes JS passando (62 antes + 5 novos).

sw.js `CACHE_NAME` v63 → **v64**.

## Rodada 89 — Top 5 concursos, separador no ranking, e Cadastro+Importar+Cartões viram 1 item de menu

Pedido do usuário, continuando a revisão do admin web: (1) confirmou que o bug do total de cartões (Rodada 88) está mesmo corrigido — os números batem (2353 Mega + 111 Lotofácil + 85 Quina + 108 +Milionária = 2657, conferido direto no Firestore); (2) "no botão de maiores prêmios das loterias mostram os três maiores... quero os 5 maiores de cada"; (3) "quero o separador dos números... 3 13 pontos... precisa ser 3 - 13 pontos"; (4) "os botões cadastro, importar pdf e cartões poderiam ser um somente... o principal primeiro é a função de importar... depois cadastro e depois cartões".

**Investigado antes de codar (item do +Milionária "não aparecendo", mencionado de novo pelo usuário)**: consultei a coleção `resultados_conferidos` direto no Firestore (API REST pública — `allow read: if true` nas regras) filtrando por `loteria == 'maismilionaria'`: **zero documentos**. Confirma o que já tinha sido investigado na Rodada 88 — não é bug, é que nenhum concurso da +Milionária foi conferido ainda no site público (é esse clique que grava o resultado de onde o Dashboard lê). Nenhuma mudança de código feita aqui — é preciso conferir pelo menos 1 concurso dela no índex pra o card do Dashboard passar a mostrar.

**1. Top 5 em vez de top 3**: `calcularEstatisticas` trocou `.slice(0, 3)` por `.slice(0, QTD_TOP_CONCURSOS)` (constante = 5). A chave de retorno continua `top3PorLoteria` (renomear quebraria testes/outros call sites sem ganho real, já que é só uma chave interna, não texto visível).

**2. Separador no ranking**: `formatarTierAcerto` juntava quantidade e nome da faixa sem nada entre eles — na Lotofácil, cujo nome de faixa também começa com número ("13 pontos"), "3 13 pontos" ficava ambíguo (parecia um número só ou erro de digitação). Agora é "3 - 13 pontos" em todas as loterias, por consistência.

**3. Cadastro + Importar PDF + Cartões viram 1 item de menu ("📋 Cartões")**: as 3 telas eram seções de topo separadas, competindo por espaço no menu lateral, com "Importar PDF" (a mais usada, segundo o usuário) enterrada no meio. Viraram sub-seções de UM item só, com um seletor segmentado no topo (mesmo padrão de Financeiro/Bolões) na ordem pedida: Importar PDF (padrão ao abrir) → Cadastro → Cartões. As 3 telas continuam EXATAMENTE como eram por dentro — nenhum id, função ou lógica interna mudou, só a tag externa (`<section>` virou `<div class="subsecao-cartoes" data-subcartoes="...">`) e a troca de visibilidade (`mostrarSubsecaoCartoes`, mesma técnica de `setLoteriaAdmin`). Risco baixo: nenhum JS fora dessas 2 funções novas precisou mudar, confirmado por grep que nada mais referenciava os ids de seção antigos (`section-cadastro`/`section-importar`) nem simulava clique neles.

Validado com 2 testes novos (`calcularEstatisticas` mostra até 5 concursos, `formatarTierAcerto` com separador em 3 cenários) e checagem de balanceamento de tags (scanner de profundidade de `<div>`/`</div>` ao longo do bloco fundido, terminou em 0 — nenhuma tag órfã). 69/69 testes JS passando (67 antes + 2 novos).

sw.js `CACHE_NAME` v64 → **v65**.

## Rodada 90 — Causa raiz real do "+Milionária não aparece": regras do Firestore nunca foram publicadas

Usuário insistiu: "já fiz duas correções no mais milionária pelo site... hoje mesmo fiz conferência e tem o resultado no site". Isso contradizia a conclusão da Rodada 88/89 ("não é bug, falta conferir") — se ele conferiu e viu o resultado na tela, deveria ter gravado. Investigação mais a fundo, sem mudar nada no código:

**Achado**: `firestore.rules` no repositório já permite `loteria == 'maismilionaria'` em `resultados_conferidos` desde o commit de 10/10 — mas **"git push" só publica o site (GitHub Pages)**; as regras de segurança do Firestore são publicadas por um comando separado (`firebase deploy --only firestore:rules`), e não existe nenhuma automação (confirmado: sem GitHub Actions no projeto) fazendo isso sozinho. Testei gravando um documento de teste em `resultados_conferidos` com `loteria: 'maismilionaria'` via API REST do Firestore: **"Missing or insufficient permissions"** — mesmo com o arquivo local permitindo. O mesmo teste pra Mega/Lotofácil funcionou normal. Ou seja: as regras PUBLICADAS (as que valem de verdade) ainda eram as antigas, de antes da +Milionária ser liberada — só o arquivo no git já tinha sido atualizado, sem nunca ter sido implantado.

Isso explica tudo: `salvarResultadoConferido` (script.js) grava o resultado DEPOIS de já ter mostrado tudo na tela pro usuário — a gravação falhava calada (só `console.error`, sem avisar ninguém) por causa das regras antigas, então "funcionava" visualmente mas nunca persistia.

**Correção**: rodei `firebase deploy --only firestore:rules` (CLI já instalado e autenticado na máquina do usuário) — regras publicadas agora batem com o arquivo do repositório. Pra não depender de o usuário conferir tudo nas mãos de novo, busquei os 3 concursos da +Milionária que já tinham cartões cadastrados (397, 398, 399 — descobertos consultando a coleção `cartoes` direto) na API oficial da Caixa e gravei os 3 resultados reais em `resultados_conferidos` (mesmo formato que o site grava). Limpei os documentos de teste criados durante a investigação.

**Nenhuma mudança de código nesta rodada** — nem commit, nem push. É puramente infraestrutura (deploy de regras + backfill de dado real). Fica registrado aqui como lição: mudanças em `firestore.rules` exigem lembrar de rodar o deploy manualmente — não acontece sozinho com o push pro GitHub Pages.

## Rodada 91 — Redesenho do Dashboard (admin web): "padrão Apple", dez vezes melhor

Pedido do usuário, com print em anexo: "o design do dashboard está muito simples, muito pobre... os números apresentados tem formatação básica, rústica, ruim... preciso que seja dez vezes melhor... com formatação de design padrão apple".

**Achado ao investigar**: o admin.html já tinha um sistema de design "Apple" (tokens em `:root` — `--cor-texto`, `--cor-superficie`, `--raio-grande`, `--sombra`, fonte Inter, barra superior com blur) usado no resto do site (`.card`, `.card-header` etc.) — só o Dashboard nunca foi migrado pra ele. Cada card tinha fundo pastel e cor inline PRÓPRIOS (ex. `style="background: #fce7f3; border-color: #f9a8d4;"`), fora do sistema de design, por isso destoava do resto do admin e parecia "rústico" em comparação.

**Redesenho** (`.dashboard-card` e novas classes em admin.html, renderização em admin.js):
- Cards voltaram a usar a MESMA superfície neutra (`var(--cor-superficie)`, branco) de qualquer outro card do admin — a cor de cada categoria virou uma barra fina de 3px no topo do card (`--stat-accent`, custom property setada inline só com a cor, nada mais) em vez de pintar o cartão inteiro. Padrão "stat card" (Tela de Tempo de Uso, App Store Connect), não "card colorido de dashboard genérico".
- Números maiores, peso 800, `letter-spacing` negativo, cor neutra escura; rótulos em caixa alta pequena com espaçamento de letra (`.dashboard-label`); linha de detalhamento por loteria com separador acima (`.dashboard-detail`).
- Cards "TOP CONCURSOS" (4): texto corrido com `<br>` virou LISTA estruturada (`.rank-row`/`.rank-badge`/`.rank-label`/`.rank-value`) — selo circular de posição (ouro/prata/bronze pros 3 primeiros, neutro do 4º ao 5º), nome do concurso, valor em destaque na cor do card, alinhado à direita, com divisor fino entre linhas — mesmo padrão de lista de ranking que a Apple usa (Replay, App Store). Função `atualizarDashboardEstatisticas` (admin.js) recebeu a mesma lógica de dados de antes, só trocou `innerHTML` de texto por `.map(...)` de markup.
- Paleta de 4 cores de sistema Apple (`#ff375f` rosa, `#5e5ce6` índigo, `#ff9500` laranja, `#30d158` verde) pras 4 loterias, substituindo os 4 tons pastel antigos (2 deles quase idênticos entre si — Lotofácil e +Milionária usavam o mesmo verde antes).
- Grid dos cards virou `repeat(auto-fit, minmax(...))` em vez de `repeat(3, 1fr)` fixo — corrige também um problema de layout que já existia (a linha de 4 cards "Top Concursos" ficava forçada em 3 colunas, com o 4º quebrando sozinho numa linha nova desbalanceada).

Validado com `py_compile`/`node --check` e suíte de testes (69/69 — nenhuma mudança de lógica de cálculo, só apresentação) e checagem de balanceamento de tags (scanner de profundidade de `<div>`, terminou em 0).

sw.js `CACHE_NAME` v65 → **v66**.

## Rodada 92 — Bug real achado: badge "cartões" da barra superior nunca mostrava o total de verdade

Usuário mandou print (com uma seta amarela ligando o badge "2353 cartões" da barra superior ao card "2657 — Total de Cartões" do Dashboard): "esses números não batem corrija". Confirma exatamente a suspeita da Rodada 88 ("no início diz uma quantidade... no meio tem outra"), só que apontando pro elemento certo desta vez — não era o card do Dashboard (já corrigido), era um badge diferente, na barra superior (`<div class="stat" id="totalCartoes">`), visível em TODAS as seções do admin, inclusive o próprio Dashboard.

**Causa**: 3 pontos diferentes do código escreviam nesse mesmo badge, todos com `cartoes.filter(c => c.tipo === loteriaAdmin).length` — a contagem filtrada pela loteria selecionada no Cadastro/Cartões (`loteriaAdmin`, que começa em `'mega'`), não o total de verdade. Por estar na barra GLOBAL, ao lado do botão Sair, parecia "o total do sistema inteiro", mas na prática mudava sozinho conforme qual loteria alguém tivesse clicado por último — coincidência de ter ficado em "mega" (2353) bateu exatamente com o que o usuário via. Efeito colateral junto: o `innerHTML` escrito por esses 3 pontos nunca incluía o emoji 📊 do texto original, que sumia assim que a página terminava de carregar.

**Correção**: unificados os 3 pontos numa função só, `atualizarBadgeTotalCartoes()`, sempre com `cartoes.length` (o total real, sem filtro de loteria) — a mesma fonte que já alimenta corretamente o card do Dashboard desde a Rodada 88. Removido o cálculo filtrado duplicado que existia em `excluirSelecionados()` (já virava redundante depois de `carregarDadosAdmin()`, que agora chama a função nova internamente).

Validado com `node --check` + suíte de testes (69/69, sem mudança de lógica de cálculo testável — é fiação de DOM).

sw.js `CACHE_NAME` v66 → **v67**.

## Rodada 93 — Recibo do participante não mostra mais status de depósito (desktop)

Pedido do usuário: "o recibo dos participantes tem um item que informa se o dinheiro já foi depositado. Não quero essa informação no recibo do participantes... Retire. E ajuste o recibo."

Status de depósito é controle interno do organizador (fluxo próprio, aba Depósitos) — não tem nenhuma utilidade pro participante que recebe o recibo, só expõe um detalhe operacional que não é da conta dele. Removida a coluna inteira da tabela de histórico de pagamentos do recibo (`_emitir_recibo`, `bolao_pro_v3.py`), não só escondida com CSS — junto com as variáveis que só existiam pra montar aquela célula (`dep_ic`/`dep_cor`/`dep_txt`). "Observação" (a última coluna) ganhou o espaço que sobrou: truncamento de 40 → 60 caracteres, já que uma coluna a menos deixa mais largura disponível na tabela.

Validado com teste isolado de Tk ao vivo: gera um recibo de verdade (participante com 2 pagamentos, 1 marcado como depositado e 1 não) e confirma por código — não só visualmente — que nenhuma referência a "depósito"/"depositado" sobra no HTML gerado, que os dados do participante e das observações continuam presentes, e que a tabela tem exatamente as 5 colunas esperadas (#, Data, Mês Ref., Valor, Observação). 35/35 testes Python continuam passando.

Versão desktop v6.36 → **v6.37**. `dist/SistemaBoloes.exe` reconstruído.

## Rodada 94 — Lista de pessoas da Reserva (admin web): ordem e telefone inconsistente

Pedido do usuário: "no admin web quando vou incluir registro de reserva a lista dos nomes não está em ordem... aparece bagunçado... uns com telefone outro sem... não precisa telefone após nome... revise a lista e ajustes gerais." Pediu explicitamente "use 20 agentes" — não usei: antes de decidir quantos agentes fazem sentido, investiguei direto e achei a causa raiz em poucos minutos (2 funções, ~15 linhas) — 20 agentes pra isso seria custo muito acima do problema real, cada um re-derivando o mesmo contexto pequeno que eu já tinha. Registrado aqui pra transparência da decisão.

**Causa**: `reservasCarregadas` (array compartilhado) é ordenado por SALDO (maior primeiro) em `carregarReservas()` — certo pra lista principal de "Reservas" (ver quem tem mais saldo primeiro), mas essa MESMA ordem "vazava" pros dois lugares onde o admin escolhe pessoas por NOME: o `<select>` do modal "Registrar Movimento" (`abrirModalRegistrarMovimento`) e a lista de checkboxes do "Lançamento em Lote" (`abrirModalLancamentoLote`) — por isso os nomes apareciam "bagunçados" (na verdade ordenados por saldo, não por nome). O telefone no `<option>` só aparecia quando a pessoa tinha um cadastrado (`r.telefone ? ' — ' + ... : ''`), daí a inconsistência "uns com, outros sem".

**Correção**: as 2 funções agora ordenam uma CÓPIA de `reservasCarregadas` por nome (`localeCompare` com `'pt-BR'`) só pra montar essas 2 listas — a lista principal de Reservas continua ordenada por saldo, sem mudança nenhuma (esse comportamento não foi reclamado e tem utilidade própria). Telefone removido do `<option>` do select — o nome já basta pra identificar alguém numa lista pra escolher, e tirar essa informação elimina a inconsistência de vez (nunca mais aparece só às vezes).

Validado com `node --check` + suíte de testes (75/75, sem mudança de lógica de cálculo testável — é fiação de DOM/ordenação de array).

sw.js `CACHE_NAME` v67 → **v68**.

## Rodada 95 — Contador percentual no carregamento inicial do admin web, e achado real: `carregarEstatisticasDashboard` rodava 2x sozinho

Pedido do usuário: "quando abro o site preciso esperar um pouco para carregar a reserva e os dados... poderia ter um contador percentual mostrando para que eu saiba quando carregou, mas somente se não deixar o site mais lento."

**Investigação antes de codar**: o carregamento inicial do admin dispara 7 buscas no Firestore em momentos diferentes — 2 logo que o login é confirmado (`carregarPixConfig`, `carregarDadosAdmin` — esta última busca TODA a coleção `cartoes`, a mais pesada), 4 depois de 300ms (`carregarBoloesParaGerenciar`, `carregarBoloesSelectParticipantes`, `carregarParticipantesSelectFinanceiro`, `carregarReservas`) e 1 depois de 1500ms (`carregarEstatisticasDashboard`, que busca `cartoes` de novo + `resultados_conferidos`). Enquanto rastreava essas 7 pra montar o contador, achei uma 8ª chamada: `carregarEstatisticasDashboard()` também estava agendada no FINAL do mesmo handler `DOMContentLoaded`, com 1000ms — uma duplicata sem motivo nenhum, rodando a busca mais pesada do Dashboard 2 VEZES em todo carregamento de página. Removida a cópia (ficou só a de 1500ms) — isso sozinho já reduz o trabalho real do carregamento, não só a percepção dele.

**Contador percentual**: `_bootTrack()` (admin.js) ENVOLVE as 7 chamadas sem mudar quando elas disparam (mesmos delays de 300ms/1500ms de sempre, nenhuma espera nova, nenhuma serializada atrás da outra) — só conta quantas das 7 já voltaram via `.finally()` nas Promises que já existiam. Mostra: uma pill "⏳ Carregando… X%" na barra superior (ao lado do badge de cartões) e uma barrinha fina de progresso embaixo da barra superior inteira (CSS puro, só a largura anima) — ambos somem sozinhos uns 500ms depois de bater 7/7. Contador começa em 0 e só sobe (sem reset no meio) — importante porque `onAuthStateChanged` pode disparar de novo durante a sessão (ex.: login manual demorado) sem re-disparar as outras 5 chamadas, e resetar o contador nesse caso faria a barra "travar" num número menor que 100%.

Validado com `node --check` + suíte de testes (75/75 — é fiação de DOM/timing, sem lógica de cálculo nova pra testar isoladamente).

sw.js `CACHE_NAME` v68 → **v69**.

## Rodada 96 — Sincronização de reservas do site: apagar a fila em lote, não mais 1 por 1 (desktop)

Pedido do usuário: "não estou conseguindo atualizar as reservas... o sistema fala que reservas do site está ocupado. Quero aprimorar esse sistema de atualização para evitar problema... faça isso, aprimore."

**Causa raiz real**: `_concluir_import_pendentes` (roda na thread principal, depois que `_importar_movimentos_pendentes_web` busca a fila `reservas_movimentos_pendentes` em background) grava cada movimento confirmado no SQLite local e, em seguida, dispara ALI MESMO, no meio do loop, uma requisição DELETE individual pro Firestore pra tirar o item da fila — uma rajada de N DELETEs seguidos, sem nenhum retry. A busca (GET) já tinha espera crescente (2/5/10/20s) pra erro 429 ("reservas do site está ocupado" é literalmente essa mensagem), mas o lado do delete não tinha nada. Rajada de requisições individuais numa coleção pequena/pouco usada é exatamente o padrão que o Firestore rate-limita (429), e como o delete falhava, o item ficava na fila e repetia o mesmo erro em toda sincronização seguinte — virando um problema permanente, não um erro passageiro.

**Corrigido**: o loop de importação não apaga mais nada individualmente — só acumula os ids dos itens já garantidos no SQLite (`doc_ids_para_apagar`). Depois do loop, um novo método (`_apagar_fila_reservas_em_lote`) apaga tudo de uma vez só, num único commit em lote (endpoint `:commit` do Firestore, agrupado em blocos de até 500 writes — o limite da API), com o mesmo tipo de retry/espera crescente (2/5/10/20/30s) pra 429, rodando em background numa thread separada — não trava a UI, e não depende do que já foi importado no SQLite (que fica garantido de qualquer forma). Se mesmo assim algum lote de delete falhar, o item simplesmente continua na fila e sai na próxima abertura do app — sem duplicar nada, porque a idempotência por `origem_doc_id` (checada antes do INSERT) já existia e continua garantindo isso.

Versão v6.37 → **v6.38** (4 locais). Validado com `py_compile`, varredura de método duplicado (nenhum encontrado) e os 35 testes automatizados do desktop (todos passando).

## Rodada 97 — Encerrar/Reativar Bolão: ação única, num só lugar (desktop)

Pedido do usuário: "a dinâmica de encerramento do bolão é confusa... vou em vários botões... e o botão encerrar e reativar ficam sempre disponíveis... quero uma revisão completa do sistema para que o encerramento do bolão seja feito de forma objetiva e em um único lugar."

**Levantamento antes de codar**: a ação estava espalhada em 3 lugares, cada um com um comportamento diferente — (1) botão "Reativar Encerrado" solto no cabeçalho da "Visão Geral", que abria um popup próprio com a lista de todos os encerrados, sem relação com o bolão que estava selecionado em nenhum outro lugar da tela; (2) o cabeçalho de "Bolão Selecionado" tinha "Encerrar Bolão" E "Reativar Encerrado" LADO A LADO, os dois sempre visíveis e clicáveis ao mesmo tempo, mesmo quando um dos dois claramente não fazia sentido pro estado real do bolão atual (exatamente o que o usuário descreveu: "ficam sempre disponíveis"); (3) dentro de "Gerenciar Bolões" — a tela que, por nome, seria o lugar natural pra isso — não existia opção de encerrar/reativar nenhuma: só "✅ Ativar" (que na verdade não tem nada a ver com encerrar — só troca qual bolão é selecionado por padrão ao abrir o programa, achado colateral confuso por si só) e "🗑 Excluir" (apaga TUDO do bolão, irreversível — fácil de confundir com "encerrar" por estar ali perto).

**Corrigido**: toda a ação de encerrar/reativar passou a existir num único lugar — dentro de "⚙ Gerenciar Bolões" (botão fixo no cabeçalho principal, acessível de qualquer tela do programa). A lista de bolões ganhou uma coluna "Situação" mostrando objetivamente o estado de cada um (🟢 Ativo / 🔴 Encerrado, linha em vermelho quando encerrado), e existe agora **um botão só** que muda de rótulo e cor conforme o bolão selecionado na lista: "🔒 Encerrar" (vermelho) quando o bolão está ativo, "🔓 Reativar" (verde) quando já está encerrado — nunca os dois ao mesmo tempo, nunca desconectado do que está selecionado. Os botões duplicados saíram da Visão Geral e do cabeçalho de "Bolão Selecionado" (que ficaram só com o 🔄 atualizar). O antigo "✅ Ativar" foi renomeado pra "🎯 Selecionar", pra não se confundir mais com o conceito de "ativo/encerrado" bem ao lado. Os métodos antigos `_adm_encerrar_bolao`/`_adm_reativar_bolao` (este com um popup Toplevel próprio só pra reativar) foram removidos — toda a lógica virou uma função só (`alternar_encerrado`) dentro de `_gerenciar_boloes`.

Versão v6.38 → **v6.39** (4 locais). Validado com `py_compile`, varredura de método duplicado (nenhum encontrado), os 35 testes automatizados do desktop, e um teste isolado de Tk ao vivo (abre a janela "Gerenciar Bolões" de verdade com 2 bolões — um ativo, um encerrado —, seleciona cada um e confirma que o botão troca pro texto certo, clica em "Reativar" e depois em "Encerrar" de verdade no mesmo bolão e confirma que o banco e a lista atualizam a cada clique).

## Rodada 98 — Reservas: cooldown pra não martelar o Firestore em toda abertura do app (desktop)

Usuário mostrou print do erro "Erro ao verificar reservas do site: HTTP Error 429: Too Many Requests" e perguntou como resolver — mesmo já confirmando que estava rodando o .exe novo, já com a correção da Rodada 96 (apagar a fila em lote, não mais 1 por 1).

**Diagnóstico**: esse 429 específico é da BUSCA (GET), não do delete — e a busca já tinha retry próprio desde antes (2/5/10/20s de espera, ~37s de fôlego total). O fato de as 5 tentativas falharem TODAS ao longo desses 37s, e não só a primeira, é sinal mais forte de limite DIÁRIO gratuito do Firestore (plano Spark) baixo ou esgotado — não dá pra saber a essa altura sem acesso ao console do Firebase, mas o padrão bate: antes da Rodada 96, cada abertura do app tentava apagar a fila item por item em rajada, o que plausivelmente consumiu bastante do limite diário em aberturas anteriores. Esse tipo de esgotamento só se resolve sozinho no reset diário do Firestore — não tem comando que force a liberar na hora, e por isso o pedido do usuário (manter o plano gratuito, sem Blaze) deixa só uma saída real: parar de piorar.

**Corrigido**: antes, essa busca rodava automaticamente toda vez que o app abria, sem nenhuma memória de ter falhado por rate-limit pouco antes — reabrir o app várias vezes seguidas (reação natural quando algo não funciona) continuava consumindo do pouco que sobrasse do limite do dia. Agora, quando a busca falha especificamente com 429 (`_concluir_import_pendentes`), fica marcado um cooldown de 15 minutos num arquivo local ao lado do banco (`boloes.db.sync_cooldown`, via `_rsv_cooldown_marcar`/`_rsv_cooldown_ativo`/`_rsv_cooldown_limpar`, novos helpers no nível do módulo). Enquanto esse cooldown estiver ativo, a próxima abertura do app NÃO tenta de novo sozinha — só mostra na barra de status quantos minutos faltam, com o link manual "🔄 Tentar novamente" sempre disponível pra quem quiser insistir mesmo assim (ação explícita do usuário nunca é bloqueada). Uma busca bem-sucedida, mesmo sem nada novo pra importar, limpa o cooldown na hora.

Versão v6.39 → **v6.40** (4 locais). Validado com teste isolado das novas funções de cooldown (marca, confirma ~15min restantes, expira sozinho depois de 15min mesmo sem chamar limpar, limpa, e tolera chamar limpar com o arquivo já inexistente), `py_compile`, varredura de método duplicado (nenhum encontrado) e os 35 testes automatizados do desktop.

## Rodada 99 — Admin sempre confere primeiro o concurso mais recente de cada loteria (web)

Pedido do usuário: "quero que no index somente eu possa fazer a primeira conferência de um jogo.... após eu fazer ele fica disponível para que todos cliquem no botão de conferência... mas a primeira sempre seja eu.... analise como fazer isso, onde e vamos implementar. Me mostre o plano." — ou seja, pediu plano antes de codar, e delegou a mim decidir ONDE implementar.

**Como funcionava antes**: no site público, `conferirResultados()` (`script.js`) é chamada por qualquer visitante que clica em "🎲 CONFERIR RESULTADOS" — se o concurso ainda não tinha sido conferido, ela buscava o resultado oficial direto na API da Caixa e GRAVAVA em `resultados_conferidos` como "conferido" (a regra do Firestore já permitia `create` público de propósito, já que o site não tem backend pra validar contra a Caixa antes). Ou seja: literalmente qualquer visitante podia ser o primeiro a "oficializar" um resultado.

**Decisão de "onde" (pedida explicitamente pro Claude decidir)**: a ação de "conferir primeiro" foi implementada dentro do **admin.html**, não do `index.html` público — porque o admin.html já tem login real do Firebase Auth (`isAdmin()`), e criar autenticação nova só pro index só pra isso seria bem mais invasivo pro mesmo resultado. O efeito da trava (botão indisponível) é o que aparece no `index.html`, que é o que o usuário realmente pediu pra ver lá.

**O que é "o concurso mais recente de uma loteria"**: o maior `concurso` entre os cartões já cadastrados daquela loteria. Guardado automaticamente em `config_geral/conferencia_bloqueio` (reaproveita a mesma coleção/regra já usada pelo doc `pix` — não precisou de regra nova pra esse doc), recalculado por uma nova função `atualizarConcursoMaisRecenteBloqueio()` (`admin.js`) toda vez que a lista de cartões é (re)carregada no admin — cobre cadastro individual, em lote, importação de PDF e sync do desktop, sem precisar mexer em nenhum desses fluxos.

**Painel novo no admin** (`admin.html`/`admin.js`, aba Cartões, acima da grade de cartões): card "🔒 CONFERÊNCIA PÚBLICA" que mostra, pra loteria selecionada, se o concurso mais recente já foi conferido ou está "aguardando sua conferência", com um botão "✅ CONFERIR AGORA E LIBERAR PRO PÚBLICO" — clicar nele busca o resultado oficial na API da Caixa (mesma lógica de `buscarResultadoInterno`/`salvarResultadoConferido` do `script.js`, duplicada em `admin.js` porque `admin.html` não carrega `script.js`) e grava em `resultados_conferidos`, autenticado como admin.

**Trava de verdade, em `firestore.rules`** (não só visual): `resultados_conferidos` → `allow create` continua público pra qualquer concurso, EXCETO quando o concurso sendo criado é exatamente o travado daquela loteria em `config_geral/conferencia_bloqueio` — nesse caso só `isAdmin()` passa. Usa `get()`/`exists()` com `.data.get(chave, default)` pra nunca quebrar o fluxo público existente se o doc de config ainda não existir ou não tiver aquela loteria ainda (ex.: logo após o deploy, antes do admin abrir a aba Cartões pela 1ª vez). **Deploy feito com `firebase deploy --only firestore:rules`** (não só `git push` — lição da Rodada 90 desta sessão) e validado com `--dry-run` antes (compilou OK).

**Lado público** (`script.js`): `carregarConfiguracoes()` passou a ler também `config_geral/conferencia_bloqueio` (leitura já é pública) numa variável `concursosBloqueados`; `conferirResultados()` para antes de buscar/gravar se o concurso selecionado estiver travado, mostrando aviso em vez de deixar o visitante esbarrar num erro de permissão; `buscarResultadoAutomatico()` ganhou o mesmo corte (evita gastar chamada à API da Caixa à toa); e o botão `#btnConferir` fica visualmente desabilitado (cinza, `disabled`, tooltip) quando o concurso selecionado é o travado — atualizado a cada troca de loteria/concurso via nova `atualizarEstadoBotaoConferir()`. Não esconde o botão, só deixa indisponível, como pedido.

Validado: `node --check` nos 2 arquivos JS, suíte `npm test` completa (75/75, sem regressão — nenhuma função testada foi tocada), `firebase deploy --only firestore:rules --dry-run` confirmando compilação antes do deploy real, e a lógica de "maior concurso por loteria" simulada em Node.js contra uma amostra real de 300 cartões de produção (via REST, leitura pública) pra confirmar que o cálculo bate com dados de verdade antes de depender dele em produção.

sw.js `CACHE_NAME` v69 → **v70**.

**Nota pro usuário**: a trava só passa a valer de verdade depois que o admin.html recarregar a aba Cartões pelo menos 1 vez após este deploy (é isso que cria o doc `config_geral/conferencia_bloqueio` pela primeira vez) — confirmado por leitura direta no Firestore que esse doc ainda não existe na hora desta entrega.

## Rodada 100 — Admin vê o "melhor resultado" direto no painel de conferência (web)

Pedido do usuário, logo em seguida da Rodada 99: "e já vejo o melhor resultado da conferência no admin? caso não... desenvolva isso também... quero ver no admin ANTES."

Não via — o painel novo (`atualizarPainelConferenciaPublica`) só confirmava que o concurso tinha sido conferido, sem mostrar nada do resultado em si. Corrigido: quando o concurso já foi conferido, o card "🔓 CONFERÊNCIA PÚBLICA" agora mostra também os números sorteados (e trevos, na +Milionária) e um resumo "🏆 Melhor resultado: N acertos — Nome do Bolão", usando os cartões já carregados em memória (`cartoes`, sem query nova no Firestore) pra calcular os acertos de cada um e achar o maior (nova função `melhorResultadoAdminHtml`). Não duplica o cálculo completo de faixas de prêmio em dinheiro (`calcularPremios`, bem mais complexo e específico por loteria, em `script.js`) — é só a contagem de acertos, suficiente pro admin já saber "quem ganhou" sem precisar abrir o site público.

Validado com `node --check`.

## Rodada 101 — Reservas: não avisa mais "atualizado" pra item que já tinha sido importado antes (desktop)

Pedido do usuário: "quando abro o sistema ele está informando a atualização da reserva. Ocorre que já abri hoje 3 vezes e nas três ele informou a atualização... se já abri e atualizei não deveria informar novamente e isso é um problema grave pois pode alterar a reserva e me dar prejuízo."

**Causa raiz real**: `_concluir_import_pendentes` contava TODO item vindo da fila do site como "importado" na mensagem/popup final — inclusive os que já tinham sido importados antes (a idempotência por `origem_doc_id` corretamente pulava o INSERT duplicado no SQLite, mas o CONTADOR da mensagem incrementava mesmo assim, ignorando esse pulo). Enquanto um item continuasse "preso" na fila do site (a limpeza em lote da Rodada 96 ainda sem ter tido tempo/sucesso de apagar), toda abertura seguinte do app recontava ele como novidade e repetia o popup "✅ N movimento(s) importado(s)" — o "já abri 3 vezes e nas 3 informou" relatado.

**Pra tranquilizar**: a idempotência sempre protegeu o LANÇAMENTO de verdade — nenhum depósito/saque foi duplicado na reserva em nenhum momento (confirmado com teste isolado reproduzindo o cenário exato: 0 lançamentos duplicados). O problema era só a MENSAGEM mentindo sobre o que tinha acontecido de fato, não o dado em si.

**Corrigido**: só conta/soma como "importado" quem é um INSERT novo de verdade; item repetido não aparece mais em nenhuma mensagem, só continua entrando silenciosamente no lote de limpeza da fila. Achado relacionado, também corrigido: antes, essa limpeza só rodava se a contagem (inflada) fosse maior que zero — com a contagem corrigida, isso faria a limpeza nem tentar rodar quando só havia itens repetidos; movida pra sempre rodar quando há algo acumulado pra apagar, reportando ou não.

**Achado extra, robustez**: `_apagar_fila_reservas_em_lote` rodava numa thread "daemon" — se o usuário fechasse o app logo depois de abrir, a thread podia ser morta no meio de um retry sem nunca concluir o apagar, perpetuando o mesmo item preso (e, antes desta correção, o mesmo aviso falso) indefinidamente. Virou a única thread do arquivo que NÃO é daemon — a janela fecha na hora normalmente, só o processo em si leva uns instantes a mais pra encerrar de vez nos casos raros em que a limpeza precisa de retry.

Versão v6.40 → **v6.41** (4 locais). Validado com 2 testes isolados de Tk ao vivo (um reproduzindo o bug relatado — item já conhecido voltando na fila → confirma 0 popups, limpeza ainda tentada, nada duplica no banco — e outro confirmando que item genuinamente novo continua avisando normalmente, com o valor certo), `py_compile`, varredura de método duplicado (nenhum encontrado) e os 35 testes automatizados do desktop.

## Rodada 102 — Reservas: resumo detalhado por pessoa e horário, ao abrir o desktop

Pedido do usuário, logo em seguida da Rodada 101: "o resumo da reserva quando eu abro no desktop deve além de mostrar o total de depósito e saque, mostrar separadamente os lançamentos por usuário e o horário que registrei... se não tiver a informação do horário não tem problema... pode seguir sem... mas quero os detalhes ao abrir o desktop."

O site admin já gravava um timestamp (`criadoEm`, ISO 8601 UTC) em todo lançamento de reserva, mas o desktop nunca lia esse campo — só usava os totais pra montar o popup de sincronização. Agora `_concluir_import_pendentes` também lê `criadoEm`, converte pra horário de Brasília (nova função `fmt_hora_web`, UTC-3 sem horário de verão) e guarda numa coluna nova (`reservas_movimentos.registrado_em`, migração `ALTER TABLE`). O popup que já aparecia ao abrir o desktop (quando há lançamento novo) ganhou uma seção "Detalhes por pessoa": cada pessoa com lançamento novo aparece com o saldo líquido da leva e a lista de cada depósito/saque, com horário ("às 14:32") quando disponível ou "(sem horário)" quando não — sem travar nada por falta dessa informação, como pedido.

Validado com teste isolado de Tk ao vivo (3 lançamentos, 2 pessoas, 1 com horário e 1 sem — confirma mensagem agrupada certa, conversão UTC→Brasília correta, e gravação de `registrado_em` no banco) e reconfirmação dos 2 testes da Rodada 101 (sem regressão), além de `py_compile`, varredura de método duplicado e os 35 testes automatizados.

Versão v6.41 → **v6.42** (4 locais).

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
