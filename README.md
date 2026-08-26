# Bolões Aleatórios

Sistema de gestão de bolões de loteria (Mega-Sena, Lotofácil, Lotomania). É composto por dois clientes que compartilham o mesmo backend Firestore:

- **Site público** (GitHub Pages): cadastro/consulta de participantes, conferência de resultados, área administrativa.
- **App desktop** (Python/Tkinter): cadastro de bolões e cartões, controle de reservas/pagamentos, sincronização com o site.

## Arquitetura

```
index.html, consulta.html, admin.html, meus-boloes.html, participantes.html
  ├─ script.js        → lógica da home (bolão aberto, conferência de resultado, instalação PWA)
  ├─ consulta.js       → consulta de participantes por telefone
  ├─ admin.js          → painel administrativo (cadastro, dashboard, cartões, tipos)
  ├─ firebase-config.js→ configuração pública do projeto Firebase (SDK JS)
  └─ sw.js             → service worker (cache network-first)

bolao_pro_v3.py         → app desktop (Tkinter + SQLite local, sincroniza com o mesmo Firestore via REST)

functions/functions/index.js → Cloud Functions (mediação de leitura de `participantes`) — escritas, ainda
                                não deployadas (projeto está no plano Spark/gratuito do Firebase)

firestore.rules          → regras de segurança do Firestore
```

Ambos os clientes autenticam contra o **Firebase Authentication** (e-mail/senha) para qualquer escrita administrativa; leitura pública segue as regras em `firestore.rules`.

## Rodando o site localmente

Não há build step — é HTML/CSS/JS puro. Basta servir a pasta com qualquer servidor estático, por exemplo:

```bash
npx serve .
# ou
python -m http.server 8000
```

Abra `index.html` (ou `admin.html` para a área administrativa).

## Rodando o app desktop

Requer Python 3 com Tkinter (já incluso na instalação padrão do Python no Windows).

```bash
python bolao_pro_v3.py
```

Na primeira sincronização com o site, o app pede login com e-mail/senha da conta Firebase administrativa. O token fica em memória apenas durante a sessão.

Para gerar um executável standalone (Windows):

```bash
pip install pyinstaller
python -m PyInstaller --onefile --windowed --name "SistemaBoloes" bolao_pro_v3.py
```

O executável fica em `dist/SistemaBoloes.exe`. Copie o `boloes.db` existente para dentro de `dist/` se quiser reaproveitar os dados já cadastrados.

## Testes automatizados

Cobrem as funções puras de cálculo/formatação usadas no site (combinatória de cartões, nível de acerto, ordenação por acertos, formatação/validação de telefone). Rodam com o test runner nativo do Node (`node:test`), sem dependências extras:

```bash
npm test
```

Os testes carregam `script.js`/`consulta.js` num sandbox (`node:vm`) com stubs mínimos de `document`/`window`, sem modificar os arquivos originais — veja `test/helpers/loadBrowserScript.js`.

## Deploy

- **Site**: publicado via GitHub Pages a partir da branch `main`.
- **Firestore rules**: `firebase deploy --only firestore:rules` (requer `firebase-tools` autenticado no projeto `mega-sena-sistema`).
- **Cloud Functions**: código pronto em `functions/functions/index.js`, mas o deploy exige o plano Blaze (pago) do Firebase — pendente.

## Notas de segurança

- `firebase-config.js` contém a chave pública do SDK Firebase (não é secreta; a proteção real vem das regras do Firestore).
- Escritas administrativas exigem autenticação Firebase com o e-mail configurado como admin.
- A coleção `participantes` ainda tem leitura pública total (necessária para a consulta por telefone funcionar sem backend); a mediação via Cloud Function reduziria essa exposição, mas depende do deploy pendente acima.
