# 🚀 NexusERP - Deploy Rápido

## Método 1: Vercel (2 minutos) ⭐ RECOMENDADO

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy!
vercel --prod
```

**Link gerado:** `https://nexuserp.vercel.app`

---

## Método 2: Netlify Drop (1 minuto)

1. Execute: `npm run build`
2. Acesse: https://app.netlify.com/drop
3. Arraste a pasta `dist/` para o navegador
4. **Pronto!** Link gerado instantaneamente.

---

## Método 3: GitHub Pages (5 minutos)

```bash
# 1. Inicializar Git
git init
git add .
git commit -m "Initial commit"

# 2. Criar repositorio no GitHub e conectar
git remote add origin https://github.com/seunome/nexuserp.git
git push -u origin main

# 3. Deploy
npm install gh-pages --save-dev
npm run deploy
```

**Link:** `https://seunome.github.io/nexuserp`

---

## Método 4: Script Automático (Windows)

```bash
# Executar o script
gerar-link.bat
```

Escolha a opção 1 (Vercel) e siga as instruções.

---

## Método 5: Servidor Local

```bash
# Iniciar tudo
npm run dev

# Acesse: http://localhost:5173/bi
```

---

## Variáveis de Ambiente

Configure no painel da plataforma:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxx
```

---

## Backend BI

Para deploy separado do backend:

### Railway (Gratuito)
1. Acesse: https://railway.app
2. New Project → Deploy from GitHub
3. Selecione pasta `/backend`
4. Start command: `node bi-api.js`

### Render (Gratuito)
1. Acesse: https://render.com
2. New → Web Service
3. Root directory: `backend`
4. Start command: `node bi-api.js`

---

## Troubleshooting

### Erro de build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro 404 após deploy
O arquivo `vercel.json` ou `netlify.toml` já está configurado.

### Variáveis não encontradas
Configure no dashboard da plataforma (Settings → Environment Variables).

---

## Links Úteis

| Plataforma | URL | Tempo |
|------------|-----|-------|
| Vercel | https://vercel.com | 2 min |
| Netlify | https://netlify.com | 1 min |
| GitHub Pages | https://pages.github.com | 5 min |
| Railway | https://railway.app | 3 min |
| Render | https://render.com | 3 min |

---

## Próximos Passos

1. ✅ Deploy do frontend
2. ⬜ Deploy do backend BI
3. ⬜ Configurar domínio personalizado
4. ⬜ Configurar monitoramento

**Domínio personalizado:**
- Vercel: Settings → Domains
- Netlify: Domain settings → Add custom domain
