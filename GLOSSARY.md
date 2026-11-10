# Front Example — GitHub Actions & Docker CI/CD

Repositório didático de referência demonstrando a construção de pipelines de CI/CD com GitHub Actions, Docker multi-stage e gerenciamento de Secrets em uma aplicação Next.js.

## Language

**Workflow**:
Processo automatizado configurável definido por um arquivo YAML dentro do diretório `.github/workflows/`, disparado por eventos do repositório (como `push` ou `pull_request`).
_Avoid_: Action (para se referir ao arquivo inteiro), pipeline solto, pasta `.workflow`

**Job**:
Conjunto de passos (*steps*) que executam no mesmo *runner* (máquina virtual). Múltiplos *jobs* rodam em paralelo por padrão ou sequencialmente quando encadeados com `needs`.
_Avoid_: Task, etapa avulsa

**Step**:
Unidade individual de execução dentro de um *Job*, podendo ser um comando de terminal (`run`) ou a chamada de uma *Action* reutilizável (`uses`).
_Avoid_: Job, comando

**Action**:
Aplicação empacotada e reutilizável para a plataforma GitHub Actions (ex: `actions/checkout@v4`) que executa uma tarefa específica dentro de um *Step*.
_Avoid_: Workflow (quando se refere ao bloco `uses:`)

**Runner**:
Servidor provisionado pelo GitHub (ou auto-hospedado) que escuta disparos de *Workflows* e executa um *Job* do início ao fim.
_Avoid_: Container local, servidor de produção

**Secret**:
Credencial ou variável sensível criptografada nas configurações do repositório ou ambiente do GitHub (`Settings > Secrets and variables > Actions`), injetada no *Runner* via contexto `${{ secrets.* }}` sem nunca ser exposta no código-fonte ou no `Dockerfile`.
_Avoid_: Variável hardcoded, `ARG` de secret no Dockerfile, `.env` commitado
