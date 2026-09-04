# Lumiere Joalheria

## Publicar na Vercel

### 1. Subir o projeto para o GitHub

1. Crie um repositorio no GitHub.
2. Envie todos os arquivos deste projeto para esse repositorio.
3. Confirme que `produtos.json`, `cadastros.json` e `administradores.json` estao na raiz do repositorio.

### 2. Criar o token do GitHub

1. No GitHub, acesse **Settings > Developer settings > Personal access tokens > Fine-grained tokens**.
2. Clique em **Generate new token**.
3. Em **Repository access**, selecione somente o repositorio da loja.
4. Em **Repository permissions**, conceda `Contents: Read and write`.
5. Gere o token e copie-o. Ele sera usado somente na Vercel.

Nunca coloque o token em um arquivo do projeto, no frontend ou em um commit.

### 3. Criar o projeto na Vercel

1. Acesse a Vercel e clique em **Add New > Project**.
2. Importe o repositorio do GitHub.
3. Mantenha o framework como **Other** e clique em **Deploy**.
4. Abra **Project Settings > Environment Variables**.
5. Adicione as variaveis abaixo para os ambientes `Production`, `Preview` e `Development`:

| Variavel | Valor |
| --- | --- |
| `GITHUB_TOKEN` | Token fine-grained criado na etapa 2 |
| `GITHUB_OWNER` | Usuario ou organizacao dona do repositorio |
| `GITHUB_REPO` | Nome do repositorio |
| `GITHUB_BRANCH` | Branch dos arquivos, normalmente `main` |

6. Salve as variaveis e acesse **Deployments > Redeploy** para publicar com as novas configuracoes.

### 4. Testar a loja

1. Abra a URL gerada pela Vercel.
2. Confira se os produtos aparecem na pagina inicial.
3. Teste o cadastro de um cliente.
4. Entre com uma conta de administrador e adicione um produto.
5. Confira no GitHub se houve um novo commit alterando `produtos.json` ou `cadastros.json`.

## Executar localmente

No terminal, dentro da pasta do projeto:

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

Sem as variaveis do GitHub, o modo local le e atualiza os arquivos JSON diretamente. Na Vercel, os arquivos JSON sao lidos e atualizados pela API do GitHub. As sessoes de login ficam em memoria e podem expirar quando a Vercel reiniciar a funcao.