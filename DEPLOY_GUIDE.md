# 🚀 Guia de Deploy - NexusERP

## Opções de Deploy Rápido

### ⚡ Opção 1: Vercel (MAIS FÁCIL - 2 minutos)

1. **Instale o Vercel CLI:**
```bash
npm i -g vercel
```

2. **Execute o deploy:**
```bash
vercel
```

3. **Siga as instruções na tela:**
   - Link para projeto existente? **N**
   - Nome do projeto? **nexuserp**
   - Diretório padrão? **Enter**
   - Build command? **npm run build**
   - Output directory? **dist**
   - Desenvolvimento? **N**

4. **Pronto!** Você receberá um link como:
```
https://nexuserp-seunome.vercel.app
```

---

### ⚡ Opção 2: Netlify (Fácil - 3 minutos)

1. **Acesse:** [netlify.com](https://netlify.com)
2. **Arraste a pasta `dist/`** após fazer o build:
```bash
npm run build
```
3. **Pronto!** Link gerado automaticamente.

---

### ⚡ Opção 3: GitHub Pages (Gratuito)

1. **Crie um repositório no GitHub**

2. **Configure o package.json:**
```json
{
  "homepage": "https://seunome.github.io/nexuserp",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Instale e deploy:**
```bash
npm install gh-pages --save-dev
npm run deploy
```

4. **Acesse:** `https://seunome.github.io/nexuserp`

---

### ⚡ Opção 4: Railway (Backend + Frontend)

1. **Acesse:** [railway.app](https://railway.app)
2. **Conecte seu GitHub**
3. **Deploy automático!**

---

## Deploy Local (Para Testes)

```bash
# Build e preview local
npm run build
npm run preview

# Acesse: http://localhost:3000
```

---

## Deploy com Docker (Produção)

```bash
# Build e inicia tudo
docker-compose up -d

# Frontend: http://localhost
# Backend BI: http://localhost:3002
# Backend NFe: http://localhost:3001
```

---

## Variáveis de Ambiente

Crie um arquivo `.env.production`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
VITE_API_URL=https://seu-backend.vercel.app
```

---

## Solução de Problemas

### Erro: "build failed"
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Erro: "environment variables"
Configure as variáveis no painel da plataforma:
- Vercel: Settings > Environment Variables
- Netlify: Site settings > Build & deploy > Environment

### Erro: "routing 404"
O arquivo `vercel.json` ou `netlify.toml` já está configurado para SPA routing.

---

## Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Pages:** https://pages.github.com
- **Railway:** https://railway.app

---

## Deploy do Backend BI

Para deploy separado do backend:

### Railway (Recomendado)
1. Crie um novo projeto no Railway
2. Selecione o diretório `/backend`
3. Configure como start command: `node bi-api.js`
4. Adicione variável: `BI_PORT=3002`

### Render
1. Acesse [render.com](https://render.com)
2. New > Web Service
3. Conecte o repositório
4. Root directory: `backend`
5. Build command: `npm install`
6. Start command: `node bi-api.js`

### Fly.io
```bash
flyctl launch
flyctl deploy
```

---

## Checklist de Deploy

- [ ] Build executado com sucesso (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Backend deployado e acessível
- [ ] Testar todas as funcionalidades
- [ ] Configurar domínio personalizado (opcional)
- [ ] Configurar SSL/HTTPS (automático na maioria das plataformas)
- [ ] Monitorar logs de erro

---

## Suporte

Se encontrar problemas:
1. Verifique os logs da plataforma
2. Teste localmente primeiro (`npm run dev`)
3. Verifique as variáveis de ambiente
4. Consulte a documentação da plataforma escolhida
