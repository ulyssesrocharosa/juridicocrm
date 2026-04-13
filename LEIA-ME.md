# 🏛️ JurisCRM - Sistema de Gestão Jurídica

Sistema completo de CRM jurídico com acompanhamento processual via DataJud, integração WhatsApp e notificações push.

---

## ⚡ Início Rápido (Desenvolvimento)

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas configurações
npm install
npm run dev
```

O backend estará em: **http://localhost:3001**

Em desenvolvimento, o backend cria um usuário inicial: `admin@juridico.com` / `admin123`. Em produção, configure seu usuário inicial e altere as credenciais antes de expor o sistema.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará em: **http://localhost:5173**

---

## 🐳 Deploy com Docker Compose (Produção)

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas configurações de produção
```

### 2. Subir todos os serviços

```bash
docker-compose up -d
```

Isso sobe:
- **Frontend** na porta 80
- **Backend (API)** na porta 3001
- **Evolution API (WhatsApp)** na porta 8080
- **MongoDB** (para Evolution API)

---

## 🔧 Configuração do WhatsApp (Evolution API)

1. Acesse http://seu-servidor:8080 (Evolution API Manager)
2. Crie uma instância chamada `juridico-crm`
3. Conecte seu número via QR Code
4. No JurisCRM, vá em **WhatsApp → Conectar** e escaneie o QR Code

---

## 🔔 Notificações Push (Opcional)

Para ativar notificações push no navegador:

```bash
# Instalar web-push globalmente
npm install -g web-push

# Gerar chaves VAPID
web-push generate-vapid-keys
```

Adicione as chaves geradas ao `.env`:
```
VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_EMAIL=mailto:admin@escritorio.com
```

---

## 📋 Módulos do Sistema

### 🏠 Dashboard
- Resumo de clientes, processos e mensagens
- Gráficos de leads por mês e por status
- Atalhos para atividades recentes

### 👥 Clientes (CRM)
- Cadastro completo: nome, CPF/CNPJ, email, telefone, endereço
- Pipeline de leads: Prospecto → Qualificado → Ativo → Encerrado
- Timeline de interações (notas, ligações, reuniões, emails)
- Vinculação com processos e WhatsApp

### ⚖️ Processos
- Vinculação por número CNJ
- Consulta automática na API pública do DataJud/CNJ
- Histórico de movimentações com indicação de novidades
- Polling automático a cada 6 horas

### 💬 WhatsApp
- Painel de chat integrado
- Vinculação automática de contatos ao cliente CRM
- Envio e recebimento de mensagens em tempo real
- Histórico de conversas

### 🔔 Notificações
- Alertas de novas movimentações processuais
- Notificações push no navegador
- Central de notificações com histórico

---

## 🔑 API DataJud
- **Chave configurada:** `cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`
- **Endpoint base:** `https://api-publica.datajud.cnj.jus.br`
- Suporta todos os tribunais: TJSP, TJRJ, TRT, TRF, STJ, TST, etc.

---

## 🏗️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Banco de Dados | PostgreSQL |
| Tempo Real | Socket.io |
| WhatsApp | Evolution API |
| Notificações | Web Push API (VAPID) |
| Jobs Agendados | node-cron |
| Auth | JWT |
| Deploy | Docker + Nginx |

---

## 📁 Estrutura de Arquivos

```
juridico-crm/
├── backend/
│   ├── db/database.js          # Schema e inicialização PostgreSQL
│   ├── middleware/auth.js       # JWT middleware
│   ├── routes/
│   │   ├── auth.js             # Login, usuários
│   │   ├── clientes.js         # CRM de clientes
│   │   ├── processos.js        # Processos + DataJud
│   │   ├── whatsapp.js         # Evolution API + chat
│   │   └── notificacoes.js     # Push notifications
│   ├── services/
│   │   ├── datajud.js          # Integração CNJ DataJud
│   │   └── evolutionApi.js     # Integração WhatsApp
│   ├── server.js               # Servidor + Socket.io + Jobs
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard, Clientes, Processos, WhatsApp, Config
│       ├── components/         # Layout, Sidebar, Notificações
│       ├── contexts/           # AuthContext
│       ├── hooks/              # useSocket
│       └── api/                # Chamadas HTTP
├── docker-compose.yml
└── LEIA-ME.md
```
