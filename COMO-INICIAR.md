# 🚀 NexusERP - Como Iniciar o Sistema

## Método Mais Fácil (1 Clique)

### Duplo clique em: `INICIAR-TUDO.bat`

Este script faz TUDO automaticamente:
- ✅ Verifica se o Node.js está instalado
- ✅ Instala todas as dependências
- ✅ Inicia o Backend BI
- ✅ Inicia o Frontend
- ✅ Cria links públicos (acessíveis de qualquer lugar)
- ✅ Abre o navegador automaticamente

---

## O que vai acontecer:

1. **Janelas do servidor** vão abrir (não feche!)
2. **Links públicos** serão exibidos em janelas separadas
3. **Navegador** vai abrir automaticamente

---

## Links que você vai receber:

### 📊 Acesso Local (seu computador)
```
http://localhost:5173          → Dashboard Principal
http://localhost:5173/bi       → Dashboard BI Inteligente
http://localhost:3002          → Backend API
```

### 🌐 Acesso Público (de qualquer lugar)
```
https://XXXX.loca.lt           → Dashboard Principal
https://XXXX.loca.lt/bi        → Dashboard BI
https://YYYY.loca.lt           → Backend API
```

---

## Como usar o link público:

1. Copie o link que começa com `https://`
2. Envie para qualquer pessoa
3. Ela pode acessar de qualquer lugar do mundo!
4. O link funciona enquanto seu computador estiver ligado

---

## Arquivos disponíveis:

| Arquivo | Função |
|---------|--------|
| `INICIAR-TUDO.bat` | ⭐ **INICIA TUDO** (recomendado) |
| `iniciar-sistema.bat` | Inicia sem links públicos |
| `criar-link-publico.bat` | Cria apenas os links |
| `link-instantaneo.bat` | Link rápido com localtunnel |
| `gerar-link.bat` | Menu com opções |
| `deploy-vercel.bat` | Deploy permanente (Vercel) |

---

## Solução de Problemas

### "Node.js não encontrado"
→ Instale em: https://nodejs.org

### "Porta já em uso"
→ Feche outras instâncias do sistema

### "Link não funciona"
→ Verifique se as janelas do servidor estão abertas

### "Erro ao instalar dependências"
→ Execute como Administrador

---

## Para Parar o Sistema

Feche todas as janelas que abriram:
- Backend BI - NexusERP
- Frontend - NexusERP
- Link Publico - Frontend
- Link Publico - Backend

---

## Deploy Permanente (Link que não muda)

Para um link permanente (que não muda quando você reinicia):

```bash
deploy-vercel.bat
```

Isso cria um link permanente como:
`https://nexuserp.vercel.app`

---

## Precisa de Ajuda?

Verifique os arquivos:
- `DEPLOY_RAPIDO.md` - Guia rápido de deploy
- `DEPLOY_GUIDE.md` - Guia completo
- `BI_README.md` - Documentação do BI
