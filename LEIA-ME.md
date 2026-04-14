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

## 🚀 Deploy na VPS (Docker Swarm + Portainer + Traefik)

> Estrutura usada: Docker Swarm + Portainer + Traefik + GitHub Actions + ghcr.io

---

### PASSO 1 — Subir o código no GitHub

#### 1.1 Criar o repositório no GitHub

Acesse github.com → **New repository**
- Nome: `juridicocrm`
- Visibilidade: Private
- Não inicializar com nada

#### 1.2 Inicializar o git local

```bash
cd /pasta/do/projeto

git init
git branch -M main
git remote add origin https://github.com/ulyssesrocharosa/juridicocrm.git
```

#### 1.3 Criar o `.gitignore`

```bash
cat > .gitignore << 'EOF'
node_modules/
.env
backend/data/
backend/uploads/
frontend/dist/
*.log
EOF
```

#### 1.4 Primeiro commit e push

```bash
git add .
git commit -m "feat: initial commit"
git push -u origin main
```

O push já dispara o GitHub Actions automaticamente. Acompanhe o build na aba **Actions** do repositório — aguarde ficar verde antes de continuar.

As imagens geradas ficam disponíveis em:
```
ghcr.io/ulyssesrocharosa/juridico-crm-backend:latest
ghcr.io/ulyssesrocharosa/juridico-crm-frontend:latest
```

---

### PASSO 2 — Preparar a VPS

#### 2.1 Gerar token do GitHub para puxar imagens

No GitHub: **Settings → Developer Settings → Personal access tokens → Tokens (classic) → Generate new token**
- Note: `vps-docker-pull`
- Permissão: marque apenas `read:packages`

#### 2.2 Autenticar o Docker da VPS

```bash
echo SEU_TOKEN_AQUI | docker login ghcr.io -u ulyssesrocharosa --password-stdin
# Deve retornar: Login Succeeded
```

#### 2.3 Criar o banco de dados

```bash
docker exec -it $(docker ps -q -f name=postgres) psql -U postgres -c "CREATE DATABASE juridico_crm;"
```

#### 2.4 Criar o DNS

No painel do seu provedor de domínio, adicione:
```
Tipo: A
Nome: juridico
Valor: IP_DA_SUA_VPS
```

---

### PASSO 3 — Deploy no Portainer

1. Acesse o Portainer → **Stacks → Add Stack**
2. Nome da stack: `juridico`
3. Build method: **Web editor**
4. Cole o conteúdo do arquivo `docker-stack.yml`
5. Adicione as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `JWT_SECRET` | uma chave longa e aleatória |
| `EVOLUTION_API_URL` | `https://evolution.vmdautobot.pro` |
| `EVOLUTION_API_KEY` | sua chave da Evolution API |

6. Clique em **Deploy the stack**

---

### PASSO 4 — Inicializar o banco (só na primeira vez)

Após a stack subir:

```bash
docker exec -it $(docker ps -q -f name=juridico_backend) node scripts/init-db.js
```

Acesse: **https://juridico.vmdautobot.pro**

Login inicial: `admin@juridico.com` / `admin123` — troque a senha imediatamente.

---

### PASSO 5 — Atualizações futuras

A cada alteração no código:

```bash
git add .
git commit -m "fix: descrição da alteração"
git push origin main
# GitHub Actions builda as novas imagens automaticamente
```

Para aplicar na VPS:

```bash
docker service update --force --image ghcr.io/ulyssesrocharosa/juridico-crm-backend:latest juridico_backend
docker service update --force --image ghcr.io/ulyssesrocharosa/juridico-crm-frontend:latest juridico_frontend
```

Ou pelo Portainer: **Stacks → juridico → Update the stack**

---

## 🐳 Deploy com Docker Compose (Produção local)

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
