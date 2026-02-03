# HUB CRM - Gestão Hub

![Angular](https://img.shields.io/badge/Angular-20-dd0031?logo=angular&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socketdotio&logoColor=white)
![License](https://img.shields.io/badge/Licenca-Privado-red)

Sistema de gestão simplificado com foco em empreendimentos, contratos, financeiro e indicadores. Frontend Angular 20 com componentes standalone e backend Express 5 com Supabase (PostgreSQL) e Socket.io para atualizações em tempo real.

---

## Funcionalidades

### Dashboard & Analytics
- **Dashboard executivo** com métricas e indicadores
- **Indicadores financeiros** consolidados
- **Gráficos** interativos (Chart.js)

### Empreendimentos & Obras
- Cadastro e gestão de **empreendimentos imobiliários**
- Acompanhamento de **obras** com detalhes

### Financeiro
- **Fluxo de caixa** com visualização detalhada
- **Parcelas e pagamentos** com múltiplos métodos
- **Configuração de valores** por método de pagamento

### Gestão de Usuários
- **3 papéis**: Admin, Admin Gerencial, Usuário
- **18 permissões** granulares (CRUD por módulo)
- Upload de **foto de perfil**
- Troca de senha obrigatória

### Documentos & Relatórios
- Geração de relatórios em **PDF** (PDFKit / jsPDF)
- Exportação em **Excel** (ExcelJS / xlsx-js-style)
- Geração de documentos **Word** (docx)

### Notificações
- Notificações persistentes por usuário
- **Toast notifications** (ngx-toastr)
- Atualizações em **tempo real** (Socket.io)

### Segurança
- Autenticação **JWT** com recuperação de senha por e-mail
- **Rate limiting** e slow-down contra abuso
- **Helmet** para headers HTTP seguros
- Rastreamento de atividade do usuário

---

## Identidade Visual

| Cor | Hex | Uso |
|---|---|---|
| **Primary** | `#09005C` | Azul escuro principal |
| **Secondary** | `#00EDB1` | Verde água |
| **Accent** | `#30ADFC` | Azul claro |

---

## Arquitetura

```
gestao-hub/
├── gestao-hub-frontend/    # Angular 20 + standalone components
├── gestao-hub-backend/     # Express 5 + Supabase + Socket.io
├── database/               # Schema SQL (23 tabelas)
└── CLAUDE.md               # Diretrizes de desenvolvimento
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 18.x
- [Angular CLI](https://angular.dev/tools/cli) >= 20.x
- Conta no [Supabase](https://supabase.com/) com projeto configurado

## Instalação

```bash
# Frontend
cd gestao-hub-frontend && npm install

# Backend
cd gestao-hub-backend && npm install
```

## Executando

```bash
# Frontend (http://localhost:4200)
cd gestao-hub-frontend && npm start

# Backend com hot reload (http://localhost:3000)
cd gestao-hub-backend && npm run dev
```

## Build

```bash
# Frontend - produção
cd gestao-hub-frontend && npm run build

# Frontend - desenvolvimento
cd gestao-hub-frontend && npm run build:development

# Backend - produção
cd gestao-hub-backend && npm start
```

## Testes

```bash
# Frontend (Karma/Jasmine)
cd gestao-hub-frontend && npm test

# Backend (Jest)
cd gestao-hub-backend && npm test
cd gestao-hub-backend && npm run test:coverage
cd gestao-hub-backend && npm run lint
```

---

## Frontend

### Estrutura

```
gestao-hub-frontend/src/app/
├── components/              # 27 componentes reutilizáveis
│   ├── breadcrumb/
│   ├── change-password/
│   ├── delete-confirmation-modal/
│   ├── empreendimentos-page/
│   ├── executive-dashboard-page/
│   ├── financeiro-page/
│   ├── fluxo-caixa-page/
│   ├── forgot-password/
│   ├── header/
│   ├── help-page/
│   ├── home-page/
│   ├── image-upload/
│   ├── indicadores-financeiros-page/
│   ├── login-layout / login-primary-input/
│   ├── new-user-page/
│   ├── obra-page/
│   ├── observacoes-modal/
│   ├── payment-methods-manager / payment-methods-selector / payment-value-config/
│   ├── reset-password/
│   ├── settings-page/
│   ├── sidebar/
│   ├── user-modal / user-selection-modal/
│   └── users-page/
├── pages/                   # 3 páginas de rota
│   ├── home/                       # Container principal
│   ├── login/                      # Autenticação
│   └── access-denied/              # Acesso negado
├── services/                # 20+ serviços Angular
│   ├── auth.ts, login.ts
│   ├── analytics.ts, report.ts
│   ├── attachment.service.ts, upload.ts
│   ├── company.ts
│   ├── mentoria.service.ts, mentoria-templates.service.ts
│   ├── payment-method.service.ts
│   ├── planejamento-estrategico.service.ts
│   ├── profile-picture.service.ts
│   ├── user.service.ts, user.ts
│   ├── vaga.service.ts, vaga-export.service.ts, vagas-hub.service.ts
│   ├── candidato.service.ts, entrevista.service.ts
│   ├── routine.service.ts, routine-attachment.service.ts
│   ├── modal.service.ts, search.service.ts
│   └── breadcrumb.service.ts, rate-limit.service.ts
├── guards/                  # 10 guards de rota
│   ├── auth-guard.ts, admin-guard.ts, admin-only-guard.ts
│   ├── admin-gerencial-guard.ts, user-guard.ts
│   ├── rs-guard.ts
│   └── must-change-password-guard.ts
├── interceptors/            # 2 interceptors HTTP
│   ├── auth.ts
│   └── retry.interceptor.ts
├── directives/              # 3 diretivas customizadas
│   ├── currency-mask.directive.ts
│   ├── document-mask.directive.ts
│   └── scroll-animation.ts
├── pipes/                   # 3 pipes customizados
│   ├── date-no-timezone-pipe.ts
│   ├── newline-to-br.pipe.ts
│   └── safe.pipe.ts
├── types/                   # Definições TypeScript
└── app.routes.ts            # Configuração de rotas
```

### Principais Bibliotecas

| Biblioteca | Uso |
|---|---|
| **Angular 20** | Framework UI com standalone components |
| **Chart.js** | Gráficos do dashboard |
| **CKEditor 5** / **TipTap** | Editores rich text |
| **docx** | Geração de documentos Word |
| **jsPDF** + **html2canvas** | Exportação em PDF |
| **xlsx-js-style** | Exportação em Excel com formatação |
| **pdfjs-dist** | Visualização de PDFs |
| **ngx-toastr** | Notificações toast |
| **RxJS** | Programação reativa |

### Configuração de Ambiente

```typescript
// environment.ts (desenvolvimento)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  authUrl: 'http://localhost:3000/api/auth'
};

// environment.prod.ts (produção)
export const environment = {
  production: true,
  apiUrl: 'https://gestao-hub.onrender.com/api',
  authUrl: 'https://gestao-hub.onrender.com/api/auth'
};
```

---

## Backend

### Estrutura

```
gestao-hub-backend/
├── server.js                 # Entry point com graceful shutdown
└── src/
    ├── app.js                # Configuração Express (CORS, Helmet, rotas)
    ├── config/
    │   ├── database.js       # Cliente Supabase + query handlers
    │   ├── auth.js           # Configuração JWT
    │   ├── email.js          # Nodemailer SMTP
    │   ├── rateLimiter.js    # Rate limiting
    │   └── websocket.js      # Socket.io
    ├── controllers/          # 7 controllers
    │   ├── analyticsController.js
    │   ├── authController.js
    │   ├── companyController.js
    │   ├── paymentMethodController.js
    │   ├── reportController.js
    │   ├── userController.js
    │   └── userProfilePictureController.js
    ├── routes/               # 6 arquivos de rotas
    │   ├── analyticsRoutes.js
    │   ├── authRoutes.js
    │   ├── companyRoutes.js
    │   ├── reportRoutes.js
    │   ├── userRoutes.js
    │   └── userProfilePictureRoutes.js
    ├── middleware/            # 5 middlewares
    │   ├── auth.js / authMiddleware.js
    │   ├── roleMiddleware.js
    │   ├── errorHandler.js
    │   └── activityTracker.js
    ├── models/               # 6 modelos de dados
    │   ├── Candidato.js, Company.js, Entrevista.js
    │   ├── Routine.js, Vaga.js
    │   └── index.js
    ├── services/             # 6 serviços de negócio
    │   ├── activityService.js
    │   ├── authService.js
    │   ├── emailService.js
    │   ├── reportService.js
    │   ├── rsReportService.js
    │   └── userService.js
    ├── reportGenerators/     # Geração de relatórios
    │   ├── pdfGenerator.js
    │   └── excelGenerator.js
    ├── utils/                # Utilitários
    │   ├── tokenGenerator.js
    │   └── validators.js
    └── jobs/                 # Jobs em background
```

### Endpoints da API

#### Autenticação (`/api/auth`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/login` | Login com email/senha |
| POST | `/register` | Cadastro de usuário |
| POST | `/forgot-password` | Solicitar reset de senha |
| POST | `/reset-password` | Resetar senha |

#### Usuários (`/api/users`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar usuários |
| POST | `/` | Criar usuário |
| GET | `/:id` | Detalhes do usuário |
| PUT | `/:id` | Atualizar usuário |
| DELETE | `/:id` | Remover usuário |

#### Empresas (`/api/companies`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Dados da empresa |
| PUT | `/` | Atualizar empresa |

#### Outros
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/analytics` | Dados analíticos |
| GET | `/api/reports/*` | Geração de relatórios |
| GET | `/health` | Health check |

### Variáveis de Ambiente

Crie `gestao-hub-backend/.env`:

```env
# Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key

# JWT
JWT_SECRET=sua-chave-secreta
JWT_EXPIRE=7d
JWT_RESET_EXPIRE=1h

# E-mail (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM="Sistema Hub <noreply@hub.com.br>"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Para gerar um JWT secret seguro:

```bash
cd gestao-hub-backend && npm run generate-jwt
```

---

## Banco de Dados

### Tabelas principais (23 tabelas)

| Grupo | Tabelas |
|---|---|
| **Usuários** | `users`, `roles`, `permissions`, `role_permissions` |
| **Empresa** | `companies` |
| **Clientes** | `clients`, `clients_pf`, `clients_pj`, `client_emails`, `client_phones`, `client_attachments` |
| **Serviços** | `services`, `service_stages` |
| **Contratos** | `contracts`, `contract_services`, `contract_service_stages`, `contract_installments`, `contract_payment_methods`, `contract_assignments`, `contract_attachments` |
| **Sistema** | `notifications`, `contract_access_logs` |

### Papéis de Usuário

| Papel | Acesso |
|---|---|
| **Admin** | Acesso total: usuários, clientes, contratos, relatórios, configurações |
| **Admin Gerencial** | Acesso administrativo limitado (sem gestão completa de usuários) |
| **Usuário** | Acesso básico às funcionalidades atribuídas |

### Permissões (18 permissões)

| Módulo | Permissões |
|---|---|
| **users** | create, read, update, delete |
| **clients** | create, read, update, delete |
| **contracts** | create, read, update, delete |
| **services** | create, read, update, delete |
| **reports** | read |
| **analytics** | read |

---

## Segurança

- **Helmet** para headers HTTP seguros
- **CORS** configurado para o frontend
- **Rate Limiting** com `express-rate-limit` e `express-slow-down`
- **JWT** para autenticação stateless (expiração 7 dias)
- **bcryptjs** para hash de senhas
- **Joi** para validação de entrada
- **Guards de rota** por papel no frontend (10 guards)
- **Middleware de autorização** por papel no backend
- **Rastreamento de atividade** em endpoints sensíveis

## Deploy

| Componente | Plataforma |
|---|---|
| Frontend | Vercel (build estático) |
| Backend | Render (Node.js) |
| Banco de dados | Supabase (PostgreSQL gerenciado) |

---

Desenvolvido por **GIO**
