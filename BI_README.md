# 🧠 BI Inteligente - Sistema de Business Intelligence Profissional

## Visão Geral

O **BI Inteligente** é um sistema completo de Business Intelligence desenvolvido para fornecer análises avançadas, insights acionáveis e previsões inteligentes para tomada de decisão empresarial.

## 🏗️ Arquitetura

### Backend (Node.js + Express)
- **Porta 3002** - API de Analytics e BI
- **Motor de Análises** - Algoritmos de ML básico integrados
- **Armazenamento** - JSON files para dados de BI
- **Cache** - Agregações pré-calculadas para performance

### Frontend (React + TypeScript)
- **Interface Moderna** - Design responsivo com Tailwind CSS
- **Visualizações** - Recharts para gráficos interativos
- **Tempo Real** - Auto-atualização a cada 5 minutos
- **Exportação** - PDF e Excel integrados

## 📊 Módulos Disponíveis

### 1. Visão Geral (Overview)
- **KPIs em Destaque**: Faturamento, Lucro Bruto, Inadimplência, Crescimento
- **Alertas Inteligentes**: Notificações automáticas baseadas em regras
- **Tendências**: Gráficos de evolução com média móvel
- **Fluxo de Caixa**: Análise de entradas e saídas mensais

### 2. Vendas (Sales Analytics)
- **Resumo de Vendas**: Total, quantidade, ticket médio
- **Classificação ABC**: Análise de Pareto para produtos
- **Top Produtos**: Ranking de produtos mais vendidos
- **Top Clientes**: Análise de clientes mais valiosos

### 3. Financeiro (Financial Analytics)
- **Aging Report**: Análise de inadimplência por faixa de atraso
- **Fluxo de Caixa**: Projeções e histórico
- **Indicadores**: Liquidez, cobrança, inadimplência
- **Comparativos**: Realizado vs Previsto

### 4. Previsões (Predictive Analytics)
- **Suavização Exponencial**: Previsão de vendas
- **Regressão Linear**: Análise de tendências
- **Confiança**: Percentual de acerto das previsões
- **Cenários**: Múltiplos métodos combinados

### 5. Analytics Avançado
- **Performance**: Margem bruta, crescimento, cobrança
- **Outliers**: Detecção automática de anomalias
- **Sazonalidade**: Padrões recorrentes identificados
- **Cohort Analysis**: Análise de coortes

## 🔧 Configuração

### Instalação do Backend

```bash
cd backend
npm install
```

### Inicialização

```bash
# Iniciar apenas a API de BI
npm run start:bi

# Iniciar todos os servidores
npm run start:all
```

### Variáveis de Ambiente

```env
BI_PORT=3002
```

## 📁 Estrutura de Dados

### Dados de Vendas (`bi_data/sales.json`)
```json
[
  {
    "id": "1",
    "data": "2026-03-30",
    "produto": "Produto A",
    "cliente": "Cliente X",
    "valor": 1500.00,
    "quantidade": 10
  }
]
```

### Dados Financeiros (`bi_data/financial.json`)
```json
[
  {
    "id": "1",
    "tipo": "receber",
    "descricao": "Fatura #001",
    "valor": 5000.00,
    "vencimento": "2026-04-15",
    "status": "pendente"
  }
]
```

## 🚀 Funcionalidades

### APIs Disponíveis

#### Analytics
- `GET /api/bi/health` - Health check
- `GET /api/bi/sales/summary` - Resumo de vendas
- `GET /api/bi/sales/trends` - Tendências de vendas
- `GET /api/bi/sales/abc` - Classificação ABC
- `GET /api/bi/financial/summary` - Resumo financeiro
- `GET /api/bi/financial/cashflow` - Fluxo de caixa
- `GET /api/bi/kpis` - Indicadores-chave
- `POST /api/bi/kpis` - Atualizar metas

#### Alertas e Previsões
- `GET /api/bi/alerts` - Alertas inteligentes
- `GET /api/bi/predictions/sales` - Previsão de vendas
- `GET /api/bi/predictions/cashflow` - Previsão de fluxo de caixa
- `GET /api/bi/performance` - Métricas de performance

#### Dados
- `POST /api/bi/data/import` - Importar dados
- `GET /api/bi/data/export/:type` - Exportar dados
- `POST /api/bi/reports/generate` - Gerar relatórios

### Algoritmos de Análise

#### 1. Média Móvel
```javascript
calculateMovingAverage(data, windowSize = 7)
```
Suaviza dados para identificar tendências.

#### 2. Detecção de Sazonalidade
```javascript
detectSeasonality(data, period = 7)
```
Identifica padrões recorrentes nos dados.

#### 3. Regressão Linear
```javascript
linearRegression(xData, yData)
```
Calcula tendência e coeficiente de determinação (R²).

#### 4. Classificação ABC (Pareto)
```javascript
classifyABC(items, valueKey = "value")
```
Classifica itens em A (80%), B (15%), C (5%).

#### 5. Suavização Exponencial
```javascript
exponentialSmoothing(data, periods = 4, alpha = 0.3)
```
Previsão de séries temporais.

#### 6. Detecção de Outliers
```javascript
detectOutliers(data)
```
Identifica valores anômalos usando método IQR.

## 🎨 Interface do Usuário

### Componentes Principais

#### Cards de KPI
- Animação de contadores
- Barras de progresso
- Badges de status
- Metas configuráveis

#### Gráficos Interativos
- **AreaChart**: Tendências de vendas
- **ComposedChart**: Fluxo de caixa (barras + linhas)
- **BarChart**: Aging report
- **PieChart**: Classificação ABC
- **LineChart**: Previsões

#### Sistema de Alertas
- **Crítico**: Vermelho - Ação imediata
- **Atenção**: Amarelo - Monitorar
- **Informação**: Azul - Conhecimento

### Exportação

#### PDF
- Layout profissional
- Gráficos embutidos
- Timestamp automático

#### Excel
- Múltiplas abas
- Formatação condicional
- Fórmulas calculadas

## 🔐 Segurança

### Controle de Acesso
- Autenticação via Supabase
- Rotas protegidas (ProtectedRoute)
- Validação de permissões

### Validação de Dados
- Schema validation com Zod
- Sanitização de inputs
- Tratamento de erros

## 📈 Métricas e KPIs

### Indicadores Financeiros
- **Margem Bruta**: (Receita - Custos) / Receita × 100
- **Liquidez Corrente**: Ativo Circulante / Passivo Circulante
- **Taxa de Inadimplência**: Inadimplência / Total a Receber × 100

### Indicadores de Vendas
- **Ticket Médio**: Receita Total / Número de Vendas
- **Crescimento**: (Mês Atual - Mês Anterior) / Mês Anterior × 100
- **Conversão**: Vendas / Leads × 100

## 🛠️ Desenvolvimento

### Adicionar Nova Métrica

1. **Backend** (`bi-api.js`):
```javascript
app.get("/api/bi/nova-metrica", (req, res) => {
  const data = BIDataManager.getSomeData();
  const result = AnalyticsEngine.calculateMetric(data);
  res.json(result);
});
```

2. **Frontend** (`BIDashboard.tsx`):
```typescript
const [novaMetrica, setNovaMetrica] = useState(null);

useEffect(() => {
  fetchData("/nova-metrica").then(setNovaMetrica);
}, []);
```

### Adicionar Novo Gráfico

```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="label" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="value" fill="hsl(var(--primary))" />
  </BarChart>
</ResponsiveContainer>
```

## 📞 Suporte

### Problemas Comuns

#### Backend não inicia
```bash
cd backend
npm install
npm run start:bi
```

#### Dados não aparecem
1. Verifique se os arquivos JSON existem em `backend/bi_data/`
2. Verifique se o backend está rodando na porta 3002
3. Verifique o console do navegador para erros

#### Gráficos não renderizam
1. Verifique se os dados estão no formato correto
2. Verifique se o Recharts está instalado
3. Verifique a responsividade do container

## 📝 Changelog

### v1.0.0 (2026-03-30)
- ✅ Dashboard principal com KPIs
- ✅ Módulo de vendas com classificação ABC
- ✅ Módulo financeiro com aging report
- ✅ Sistema de alertas inteligentes
- ✅ Previsões com suavização exponencial
- ✅ Exportação PDF e Excel
- ✅ Interface responsiva
- ✅ Auto-atualização em tempo real

## 🎯 Roadmap

### v1.1.0
- [ ] Integração com banco de dados PostgreSQL
- [ ] Machine Learning avançado
- [ ] Drill-down interativo
- [ ] Comparativos ano a ano

### v1.2.0
- [ ] Dashboard personalizável
- [ ] Widgets arrastáveis
- [ ] Temas customizados
- [ ] Notificações push

### v2.0.0
- [ ] Multi-tenant
- [ ] API GraphQL
- [ ] Real-time streaming
- [ ] AI-powered insights