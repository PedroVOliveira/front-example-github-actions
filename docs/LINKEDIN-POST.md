# Artigo Completo para o LinkedIn (Tutorial Passo a Passo com Referências)

Abaixo você encontra o **Artigo Completo** estruturado como um tutorial prático de ponta a ponta (ideal para publicar em **"Escrever artigo"** no LinkedIn) e, no final do arquivo, um **Post de Chamada para o Feed**.

---

## Título Sugerido

> **Guia Prático de CI/CD no Front-end: Do Zero ao Deploy Automatizado com GitHub Actions, Docker e Fly.io (Passo a Passo)**

---

## Corpo do Artigo

Quantas vezes você já criou um projeto pessoal ou profissional e deixou a parte de **deploy automatizado (CI/CD)** para depois porque parecia complexo demais? Ou então viu arquivos de configuração cheios de comandos mágicos onde ninguém sabia explicar o que cada linha fazia?

Automatizar o ciclo de build e entrega da sua aplicação não precisa ser uma caixa-preta. Quando entendemos os fundamentos do **GitHub Actions**, combinados com um **Dockerfile** enxuto e uma plataforma amigável a containers como o **Fly.io**, você cria um fluxo validado que pode reaproveitar em todos os seus projetos pessoais e profissionais.

Neste artigo, preparei um **tutorial passo a passo — explicando linha por linha** — utilizando um repositório público em **Next.js** como lastro para você acompanhar, clonar e aplicar hoje mesmo.

🔗 **Repositório público do projeto:** https://github.com/PedroVOliveira/front-example-github-actions

---

### 1. O que é o GitHub Actions e seus Fundamentos

O **GitHub Actions** é a plataforma nativa de automação e CI/CD (Integração e Entrega Contínua) integrada ao próprio GitHub. Com ele, você configura fluxos automatizados que reagem a eventos do seu repositório — como rodar testes quando alguém abre um *Pull Request* ou publicar sua aplicação em produção assim que um código novo entra na branch `main`.

Para ler e escrever qualquer automação sem precisar decorar código, você só precisa compreender **5 conceitos fundamentais**:

1. **Workflow (Fluxo de trabalho)**: É o processo automatizado completo, definido por um arquivo `.yml` dentro do seu repositório.
2. **Event (Evento / Gatilho — `on`)**: É o que dispara a execução do workflow (ex: um `push` na branch `main`, um `pull_request`, um clique manual via `workflow_dispatch` ou a chamada de outro workflow via `workflow_call`).
3. **Runner (`runs-on`)**: É a máquina virtual limpa (Ubuntu, Windows ou macOS) que o GitHub provisiona do zero para executar o seu trabalho.
4. **Job (Trabalho)**: É o conjunto de etapas que rodam dentro do mesmo *Runner*.
5. **Step (Passo) e Action (Ação)**: Cada etapa executada sequencialmente dentro de um *Job*. Um *Step* pode rodar um comando puro de terminal (`run`) ou invocar uma **Action** pronta da comunidade (`uses`), que nada mais é do que um pacote reutilizável que resolve tarefas repetitivas (como baixar o código ou configurar uma ferramenta).

📚 **Referência oficial:** [Entendendo o GitHub Actions — Documentação do GitHub](https://docs.github.com/pt/actions/about-github-actions/understanding-github-actions)

---

### 2. Configuração do `.env.example` e das Secrets que serão utilizadas

Um princípio inegociável de segurança em qualquer projeto é: **nunca suba arquivos `.env` para o Git e nunca escreva senhas ou chaves de API diretamente no código**.

Mas se o arquivo `.env` não vai para o repositório, duas perguntas surgem:
1. *Como outro desenvolvedor (ou você mesmo daqui a 6 meses) vai saber quais variáveis o projeto precisa?*
2. *Como a nossa automação no GitHub Actions vai ter acesso a essas variáveis na hora do deploy?*

#### 2.1. O papel do `.env.example`
Na raiz do projeto, criamos o arquivo **`.env.example`** contendo apenas os nomes das chaves e valores fictícios de exemplo:

```ini
APP_ENV=production
API_URL=https://api.exemplo.com.br/v1
```

> **Dica prática:** Em projetos Next.js, o `.gitignore` padrão vem com a regra `.env*`, que ignora qualquer arquivo que comece com `.env`. Por isso, adicionamos a exceção `!.env.example` no `.gitignore` para garantir que nosso arquivo de exemplo suba para o repositório!

#### 2.2. Cadastrando as Secrets no GitHub Actions
Usando o `.env.example` como base (somado ao token da nossa hospedagem no Fly.io), cadastramos os valores reais nas **GitHub Secrets**. Elas são variáveis criptografadas pelo GitHub que nunca aparecem em texto puro nos logs (o GitHub mascara automaticamente com `***`).

Para cadastrar no seu repositório, acesse **Settings > Secrets and variables > Actions > New repository secret** e crie as **3 Secrets** abaixo:

- **`APP_ENV`**: `production` *(Variável da aplicação)*
- **`API_URL`**: `https://api.exemplo.com.br/v1` *(Variável da aplicação)*
- **`FLY_API_TOKEN`**: Token de acesso do Fly.io *(Explicado na Seção 4 abaixo)*

📚 **Referência oficial:** [Usando Secrets no GitHub Actions — Documentação do GitHub](https://docs.github.com/pt/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

---

### 3. Configurando o `Dockerfile` (Explicação Linha a Linha)

Para que nossa aplicação rode exatamente do mesmo jeito em qualquer servidor, empacotamos o projeto com **Docker**.

Antes de ir para o `Dockerfile`, habilitamos uma configuração essencial no **`next.config.ts`**:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

O modo `output: "standalone"` faz o Next.js rastrear apenas os arquivos estritamente necessários para produção e gerar um servidor mínimo (`server.js`). Isso reduz o tamanho da imagem Docker final de mais de **1 GB** para cerca de **~130 MB**!

Além disso, seguimos uma **boa prática fundamental de segurança**: **não colocamos `ARG` de Secrets dentro do `Dockerfile`**. Injetar variáveis sensíveis durante o `docker build` deixa rastros no histórico de camadas da imagem (`docker history`) e acopla a imagem a um único ambiente. Nosso `Dockerfile` é 100% limpo e dividido em **3 estágios (Multi-stage build)**:

```dockerfile
# Stage 1: Install dependencies
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# Stage 3: Production image
FROM node:24-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Entendendo cada estágio do `Dockerfile`:
- **Stage 1 (`AS deps`)**:
  - `FROM node:24-alpine AS deps`: Usa a versão leve do Node 24 LTS baseada em Alpine Linux (alinhada com o nosso `.nvmrc`).
  - `RUN corepack enable && corepack prepare pnpm@10.33.2 --activate`: Ativa o gerenciador de pacotes `pnpm` nativamente na versão exata do projeto.
  - `COPY package.json pnpm-lock.yaml ./`: Copia apenas os arquivos de manifesto primeiro (para aproveitar o cache de camadas do Docker caso o código mude mas as dependências não).
  - `RUN pnpm install --frozen-lockfile`: Instala as dependências garantindo que nenhuma versão seja alterada em relação ao lockfile.
- **Stage 2 (`AS build`)**:
  - `COPY --from=deps /app/node_modules ./node_modules`: Reaproveita a pasta `node_modules` instalada no estágio 1.
  - `COPY . .` e `RUN pnpm run build`: Copia o código-fonte e compila a aplicação Next.js (gerando a pasta `.next/standalone`).
- **Stage 3 (`AS production`)**:
  - Começa uma imagem Alpine **nova e limpa**, descartando todo o código-fonte bruto e ferramentas de desenvolvimento dos estágios anteriores.
  - `COPY --from=build ...`: Copia apenas os 3 diretórios necessários para rodar em produção (`public`, `.next/standalone` e `.next/static`).
  - `EXPOSE 3000`, `ENV PORT=3000`, `ENV HOSTNAME="0.0.0.0"`: Expõe a porta 3000 e permite que o servidor escute conexões externas do container.
  - `CMD ["node", "server.js"]`: Inicia o servidor enxuto gerado pelo modo standalone do Next.js.

📚 **Referências oficiais:**
- [Next.js Docs: Output Standalone & Docker](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Docker Docs: Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [pnpm Docs: Working with Docker](https://pnpm.io/docker)

---

### 4. Configurando o Fly.io (`fly.toml` e Token de Acesso)

Para colocar nosso container Server-Side no ar de forma prática, utilizamos o **Fly.io**, uma plataforma que executa containers Docker em *MicroVMs* próximas aos usuários e possui integração direta via CLI com o GitHub Actions.

#### 4.1. Gerando o `FLY_API_TOKEN`
1. Crie uma conta gratuita em [fly.io](https://fly.io) e acesse o seu Dashboard.
2. No menu lateral esquerdo, clique em **Tokens** (ou *Account > Access Tokens*).
3. Crie um novo token e salve o valor gerado na Secret **`FLY_API_TOKEN`** lá no seu repositório do GitHub (como vimos no Passo 2).

#### 4.2. O arquivo `fly.toml` na raiz do projeto
Na raiz do repositório, adicionamos o arquivo **`fly.toml`**, que diz ao Fly.io como construir e rodar nossa aplicação:

```toml
app = 'front-example-github-actions'
primary_region = 'gru'

[build]
  dockerfile = 'Dockerfile'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

#### Explicação linha a linha do `fly.toml`:
- **`app = 'front-example-github-actions'`**: Nome único da sua aplicação dentro do Fly.io.
- **`primary_region = 'gru'`**: Define que o servidor rodará no datacenter de **São Paulo (Guarulhos)**, garantindo baixíssima latência no Brasil.
- **`[build] dockerfile = 'Dockerfile'`**: Instrui o Fly.io a usar exatamente o nosso `Dockerfile` multi-stage que criamos no Passo 3.
- **`internal_port = 3000`**: Conecta o tráfego externo à porta `3000` que expusemos no final do nosso `Dockerfile`.
- **`auto_stop_machines = 'stop'`, `auto_start_machines = true` e `min_machines_running = 0`**: Configuração ideal para projetos pessoais e de estudo! Quando ninguém está acessando o site, a máquina hiberna sozinha para não gerar custos; assim que alguém acessa a URL, o Fly.io acorda a máquina em menos de 1 segundo.
- **`[[vm]]`**: Define uma máquina enxuta com 1 CPU compartilhada e 512MB de RAM (mais que suficiente para o nosso Next.js em modo `standalone`).

📚 **Referências oficiais:**
- [Fly.io Docs: App Configuration (`fly.toml`)](https://fly.io/docs/reference/configuration/)
- [Fly.io Docs: Continuous Deployment with GitHub Actions](https://fly.io/docs/app-guides/continuous-deployment-with-github-actions/)

---

### 5. Montagem da pasta `.github/workflows`

Onde configuramos nossas Actions dentro do repositório?

Um tropeço muito comum de quem está começando é criar uma pasta chamada `.workflow` ou `.github/workflow` (no singular). O GitHub **exige** que todos os arquivos de automação fiquem exatamente dentro do caminho:

```text
front-example-github-actions/
├── .github/
│   └── workflows/
│       ├── deploy.yml       <-- 1. Gatilho principal do projeto (Caller)
│       └── fly-deploy.yml   <-- 2. Workflow reutilizável de Build e Deploy
├── Dockerfile
├── fly.toml
├── .env.example
└── package.json
```

#### Por que dividimos em 2 arquivos dentro de `.github/workflows/`?
Aqui já aplicamos um conceito profissional do GitHub Actions chamado **Reusable Workflows (Workflows Reutilizáveis)**:
- O **`deploy.yml`** é o arquivo do projeto que define *quando* o deploy acontece (no `push` para a `main`) e apenas chama o segundo arquivo.
- O **`fly-deploy.yml`** contém *como* o deploy é feito. Aqui no repositório de exemplo deixamos ele na mesma pasta para você consultar tudo junto, mas em projetos reais com vários repositórios você pode colocá-lo em um **repositório central** e reaproveitá-lo em todos os seus projetos sem repetir código!

📚 **Referência oficial:** [Reutilizando Workflows no GitHub Actions](https://docs.github.com/pt/actions/sharing-automations/reusing-workflows)

---

### 6. Montando a Action: Explicação Linha a Linha dos Arquivos YAML

Vamos agora dissecar cada linha dos nossos dois arquivos em `.github/workflows/`.

#### 6.1. O arquivo principal: `.github/workflows/deploy.yml`

```yaml
name: Deploy (Production)

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy (production)
    uses: ./.github/workflows/fly-deploy.yml
    with:
      app_name: front-example-github-actions
    secrets:
      FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      APP_ENV: ${{ secrets.APP_ENV }}
      API_URL: ${{ secrets.API_URL }}
```

- **`name: Deploy (Production)`**: Nome exibido na aba *Actions* do GitHub.
- **`on.push.branches: [main]`**: Dispara o workflow automaticamente toda vez que um código novo é enviado (ou mergeado) na branch `main`.
- **`on.workflow_dispatch`**: Adiciona um botão **"Run workflow"** na interface do GitHub para você poder disparar manualmente quando quiser.
- **`jobs.deploy`**: Inicia o nosso job de deploy.
- **`uses: ./.github/workflows/fly-deploy.yml`**: Chama o nosso workflow reutilizável localizado na mesma pasta.
- **`with: app_name: front-example-github-actions`**: Passa o nome da aplicação como parâmetro (`input`) para o workflow reutilizável.
- **`secrets`**: Repassa de forma segura as 3 Secrets que cadastramos no repositório para dentro do workflow reutilizável.

---

#### 6.2. O workflow reutilizável: `.github/workflows/fly-deploy.yml`

```yaml
name: Reusable — Fly.io Deploy

on:
  workflow_call:
    inputs:
      app_name:
        description: "Nome da aplicação no Fly.io"
        required: true
        type: string
    secrets:
      FLY_API_TOKEN:
        required: true
      APP_ENV:
        required: true
      API_URL:
        required: true

jobs:
  deploy:
    name: Build & Deploy on Fly.io
    runs-on: ubuntu-latest

    steps:
      - name: Checkout do código-fonte
        uses: actions/checkout@v4

      - name: Configurar Flyctl CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy do container no Fly.io
        run: |
          flyctl apps create "${{ inputs.app_name }}" || true
          flyctl deploy \
            --remote-only \
            --env APP_ENV="${{ secrets.APP_ENV }}" \
            --env API_URL="${{ secrets.API_URL }}"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

#### Explicação passo a passo e linha a linha do `fly-deploy.yml`:

1. **Bloco `on: workflow_call`**:
   - Define que este arquivo é um **Workflow Reutilizável**.
   - Em `inputs` e `secrets`, declaramos o "contrato" do arquivo: ele exige receber o texto `app_name` e as 3 secrets (`FLY_API_TOKEN`, `APP_ENV` e `API_URL`).
2. **Bloco `jobs.deploy` e `runs-on: ubuntu-latest`**:
   - Cria o job `deploy` e solicita ao GitHub uma máquina virtual Ubuntu recém-instalada para rodar os passos abaixo.
3. **Passo 1 — `uses: actions/checkout@v4`**:
   - Quando a máquina virtual do GitHub nasce, ela está completamente vazia! Essa Action oficial do GitHub clona o código do nosso repositório (incluindo o `Dockerfile` e o `fly.toml`) para dentro da máquina virtual.
4. **Passo 2 — `uses: superfly/flyctl-actions/setup-flyctl@master`**:
   - Action oficial do Fly.io que baixa e instala a ferramenta de linha de comando **`flyctl`** dentro do nosso Runner em poucos segundos.
5. **Passo 3 — `Deploy do container no Fly.io` (`run: |`)**:
   - **`flyctl apps create "${{ inputs.app_name }}" || true`**: Garante que, se for o seu primeiro deploy e o app ainda não existir na sua conta do Fly.io, ele será criado automaticamente. O operador `|| true` garante que, nos próximos deploys (quando o app já existir), o comando continue normalmente sem dar erro!
   - **`flyctl deploy --remote-only`**: Aqui acontece a mágica! A flag `--remote-only` envia o nosso `Dockerfile` para o *Remote Builder* gratuito do Fly.io, que constrói a imagem Docker, registra no Fly.io e sobe a nova versão do container.
   - **`--env APP_ENV="${{ secrets.APP_ENV }}"` e `--env API_URL="${{ secrets.API_URL }}"`**: Injeta as nossas Secrets diretamente como variáveis de ambiente em *runtime* dentro do container em produção, mantendo nosso `Dockerfile` 100% limpo!
   - **`env: FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}`**: Disponibiliza o token de autenticação apenas para este passo, permitindo que o `flyctl` se comunique com a sua conta do Fly.io.

📚 **Referências oficiais:**
- [Sintaxe de Workflow para o GitHub Actions](https://docs.github.com/pt/actions/writing-workflows/workflow-syntax-for-github-actions)
- [Action Oficial `actions/checkout`](https://github.com/actions/checkout)
- [Action Oficial `superfly/flyctl-actions`](https://github.com/superfly/flyctl-actions)

---

### 7. Possíveis Evoluções com o GitHub Actions

Depois que essa estrutura base está validada e rodando, você pode evoluir sua esteira de CI/CD em três grandes frentes:

#### 7.1. Adicionando Camada de Testes, Lint e PR Checks
Para impedir que um código com erro de TypeScript, problema de ESLint ou teste quebrado chegue na branch `main`, você pode adicionar um job `quality` que roda em todo `pull_request` e bloqueia o `deploy` usando a propriedade **`needs: quality`**:

```yaml
jobs:
  quality:
    name: Lint, Typecheck & Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm exec tsc --noEmit
      # - run: pnpm test

  deploy:
    name: Deploy (production)
    needs: quality # <-- Só faz o deploy se o Lint, Typecheck e Testes passarem!
    uses: ./.github/workflows/fly-deploy.yml
    # ...
```

#### 7.2. Entendendo a diferença: Deploy no Fly.io (1 Job) vs. Deploy em VPS Própria (2 Jobs)
Uma dúvida excelente para quem quer aprofundar o conhecimento em arquitetura de CI/CD é: *por que no Fly.io fazemos o build e o deploy no mesmo job, enquanto em uma VPS própria (Linux cru) costumamos separar em 2 jobs diferentes (`build` + `deploy`)?*

- **No Fly.io**: A plataforma já possui um *Remote Builder* isolado e um Container Registry próprio embutido. Quando rodamos `flyctl deploy --remote-only`, o próprio Fly.io compila o `Dockerfile` em uma máquina temporária separada e já atualiza a aplicação sem pesar no servidor de produção.
- **Em uma VPS própria (AWS EC2, DigitalOcean, Hetzner, etc.)**: Uma VPS crua não tem construtor separado nem Registry próprio. Se você tentar rodar `docker build` de um projeto Next.js dentro de uma VPS de 1GB ou 2GB de RAM, a compilação vai consumir toda a memória e derrubar os sistemas que estão no ar! Por isso, em cenários de VPS, dividimos em **2 jobs separados**:
  1. **Job `build` (`build-and-push.yml`)**: Compila o `Dockerfile` na máquina gratuita do GitHub Actions, salva a imagem pronta no **GitHub Container Registry (`ghcr.io`)** e exporta a tag gerada (`outputs.image_tag`).
  2. **Job `deploy` (`deploy-vps.yml` com `needs: build`)**: Conecta via SSH na VPS e apenas faz o `docker pull` daquela imagem já pronta (`${{ needs.build.outputs.image_tag }}`), subindo o container em segundos!

#### 7.3. Repositório Central de Workflows Reutilizáveis
Quando você tem vários projetos pessoais ou na empresa, em vez de copiar o `fly-deploy.yml` (ou o `deploy-vps.yml`) para dentro de cada projeto, basta criar **um repositório central dedicado apenas aos seus workflows** (ex: `seu-usuario/git-workflow`) e chamá-lo de qualquer repositório com:
`uses: seu-usuario/git-workflow/.github/workflows/fly-deploy.yml@main`.

---

### 8. Conclusão e Resumo de Referências

Montar uma pipeline de CI/CD com **GitHub Actions**, **Docker** e **Fly.io** tira o peso de processos manuais, protege suas variáveis de ambiente e dá a você um fluxo validado que leva poucos minutos para replicar em qualquer projeto novo.

Todo o código deste tutorial está disponível no repositório público abaixo. Faça um *fork*, configure suas Secrets e teste na prática!

🔗 **Repositório no GitHub:** https://github.com/PedroVOliveira/front-example-github-actions

#### 📚 Lista Consolidada de Referências Oficiais para Consulta:
- **GitHub Actions (Documentação Geral)**: https://docs.github.com/pt/actions
- **Sintaxe de YAML do GitHub Actions**: https://docs.github.com/pt/actions/writing-workflows/workflow-syntax-for-github-actions
- **Gerenciamento de Secrets no GitHub**: https://docs.github.com/pt/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- **Workflows Reutilizáveis (`workflow_call`)**: https://docs.github.com/pt/actions/sharing-automations/reusing-workflows
- **Next.js Output Standalone (Docker)**: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- **Docker Multi-stage Builds**: https://docs.docker.com/build/building/multi-stage/
- **pnpm com Docker**: https://pnpm.io/docker
- **Fly.io + GitHub Actions (Deploy Contínuo)**: https://fly.io/docs/app-guides/continuous-deployment-with-github-actions/
- **Referência do `fly.toml`**: https://fly.io/docs/reference/configuration/

E você, já automatizou o deploy dos seus projetos com GitHub Actions ou ainda faz parte desse processo manualmente? Deixa aqui nos comentários! 👇

#GitHubActions #Docker #NextJS #FrontEnd #CICD #DevOps #FlyIO #DesenvolvimentoWeb #EngenhariaDeSoftware


---

## Versão 2: Post de Chamada para o Feed do LinkedIn (Para divulgar o Artigo + Repositório)

> **Quer automatizar o deploy dos seus projetos com GitHub Actions e Docker, mas sempre achou a configuração confusa?** 🚀
>
> Acabei de publicar um **artigo-tutorial passo a passo** (junto com um repositório público e validado em **Next.js**) explicando **linha por linha** como montar sua esteira de CI/CD do zero até o deploy automatizado no **Fly.io**!
>
> O que você vai encontrar no tutorial e no repositório:
> 1️⃣ Fundamentos do GitHub Actions (Workflow, Event, Runner, Job, Step e Action sem mistério)
> 2️⃣ Como organizar o `.env.example` e proteger suas **GitHub Secrets**
> 3️⃣ Construção do `Dockerfile` multi-stage em 3 estágios com `standalone` (explicado linha a linha e sem vazar secrets com `ARG`)
> 4️⃣ Configuração completa do `fly.toml` e token de deploy no **Fly.io**
> 5️⃣ Montagem da pasta `.github/workflows` com **Workflows Reutilizáveis (`workflow_call`)** explicando cada linha do YAML
> 6️⃣ Como evoluir com Testes, PR Checks e a diferença arquitetural entre deploy no Fly.io (1 Job) vs. VPS própria (2 Jobs com GHCR)
> 7️⃣ Todas as referências e documentações oficiais para você aplicar nos seus projetos pessoais!
>
> 🔗 **Repositório público no GitHub:** https://github.com/PedroVOliveira/front-example-github-actions
>
> Confira o artigo completo e deixe uma ⭐ lá no repositório se o conteúdo te ajudar! 👇
>
> #GitHubActions #Docker #NextJS #FrontEnd #CICD #DevOps #FlyIO #EngenhariaDeSoftware
