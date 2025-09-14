# Gestão de Produção — Monorepo (Backend + Frontend)

Sistema web (PWA) para gerenciar produção, inspirado no sistema atual (Microsys).
Este repositório segue um plano didático por módulos: ambiente → backend → frontend → integração → deploy.

## 📦 Estrutura

gestao-producao/
backend/ # API Node.js + TypeScript (Fastify)
frontend/ # React + Vite + TypeScript (PWA base)
README.md

> Cada módulo concluído recebe **tag no Git** (ex.: `m1-hello`, `m2-dominios`, ...).

---

## ✅ Pré-requisitos

- **Node.js LTS** (recomendado 20.x) — checar com `node -v`
- **npm** (vem com Node) — checar com `npm -v`
- **Git** — checar com `git --version`
- **VS Code** com extensões: *ESLint*, *Prettier*, *Prisma* (para módulos futuros)

---

## 🚀 Passo a passo — M1 (Ambiente & Git)

> Objetivo: “Hello API” e “Hello Web” rodando localmente e repositório no GitHub.

### 1) Clonar (ou iniciar do zero)

Se você **ainda não tem** o repositório:

```bash
# crie a pasta do projeto
mkdir gestao-producao
cd gestao-producao

# iniciar git
git init

# criar arquivo README inicial
echo "# Gestão de Produção" > README.md

2) Backend (Hello API)

Crie a pasta e instale dependências:
mkdir backend && cd backend
npm init -y

# dependências de dev
npm i -D typescript tsx @types/node
# dependência de runtime
npm i fastify

# iniciar TypeScript
npx tsc --init

Crie src/server.ts:
import Fastify from "fastify";

const app = Fastify();

/**
 * Rota simples para validar o servidor.
 * A ideia é só provar que a API está no ar.
 */
app.get("/hello", async () => {
  return { message: "Hello API 🚀" };
});

app.listen({ port: 3000 }).then(() => {
  console.log("Server running on http://localhost:3000");
});

No package.json (backend), adicione scripts:
{
  "scripts": {
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc"
  }
}
Rodar:
npm run dev
# abra http://localhost:3000/hello -> deve aparecer {"message":"Hello API 🚀"}

3) Frontend (Hello Web)

Em outra aba/terminal, na raiz do projeto:.

cd ..
npm create vite@latest frontend
# escolha: React + TypeScript
cd frontend
npm install
npm run dev
# abra http://localhost:5173
