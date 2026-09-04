const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = 3000;
const API_URL = "https://fakestoreapi.com";
const PRODUCTS_FILE = path.join(__dirname, "produtos.json");
const CLIENTS_FILE = path.join(__dirname, "cadastros.json");
const ADMINS_FILE = path.join(__dirname, "administradores.json");
const sessions = new Map();
const GITHUB_API = "https://api.github.com";

function githubStorageConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function githubFileUrl(filePath) {
  const fileName = path.basename(filePath);
  const branch = process.env.GITHUB_BRANCH || "main";
  return `${GITHUB_API}/repos/${encodeURIComponent(process.env.GITHUB_OWNER)}/${encodeURIComponent(process.env.GITHUB_REPO)}/contents/${encodeURIComponent(fileName)}?ref=${encodeURIComponent(branch)}`;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function readAccounts(filePath) {
  try {
    const content = await readJsonContent(filePath);
    if (!content) return [];

    const accounts = JSON.parse(content);
    return Array.isArray(accounts) ? accounts : [accounts];
  } catch (error) {
    console.error(`Erro ao ler ${path.basename(filePath)}:`, error.message);
    try {
      const content = fs.readFileSync(filePath, "utf8").trim();
      if (!content) return [];
      const accounts = JSON.parse(content);
      return Array.isArray(accounts) ? accounts : [accounts];
    } catch (fallbackError) {
      console.error(`Erro no fallback local de ${path.basename(filePath)}:`, fallbackError.message);
      return [];
    }
  }
}

async function readProducts() {
  try {
    const content = await readJsonContent(PRODUCTS_FILE);
    try {
      return JSON.parse(content);
    } catch {
      return [...content.matchAll(/\{[\s\S]*?\}/g)].map((match) => JSON.parse(match[0]));
    }
  } catch (error) {
    console.error("Erro ao ler produtos.json:", error.message);
    try {
      const content = fs.readFileSync(PRODUCTS_FILE, "utf8").trim();
      try {
        return JSON.parse(content);
      } catch {
        return [...content.matchAll(/\{[\s\S]*?\}/g)].map((match) => JSON.parse(match[0]));
      }
    } catch (fallbackError) {
      console.error("Erro no fallback local de produtos.json:", fallbackError.message);
      return [];
    }
  }
}

async function readJsonContent(filePath) {
  if (githubStorageConfigured()) {
    const response = await axios.get(githubFileUrl(filePath), { headers: githubHeaders() });
    return Buffer.from(response.data.content, "base64").toString("utf8").trim();
  }

  if (process.env.VERCEL) {
    throw new Error("Configure o armazenamento do GitHub nas variáveis de ambiente da Vercel.");
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

async function writeJsonContent(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  if (!githubStorageConfigured()) {
    if (process.env.VERCEL) {
      throw new Error("Configure GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO na Vercel.");
    }
    fs.writeFileSync(filePath, content, "utf8");
    return;
  }

  const current = await axios.get(githubFileUrl(filePath), { headers: githubHeaders() });
  const fileName = path.basename(filePath);
  const branch = process.env.GITHUB_BRANCH || "main";
  await axios.put(
    `${GITHUB_API}/repos/${encodeURIComponent(process.env.GITHUB_OWNER)}/${encodeURIComponent(process.env.GITHUB_REPO)}/contents/${encodeURIComponent(fileName)}`,
    {
      message: `Atualizar ${fileName}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha: current.data.sha,
      branch
    },
    { headers: { ...githubHeaders(), "Content-Type": "application/json" } }
  );
}

async function writeProducts(products) {
  return writeJsonContent(PRODUCTS_FILE, products);
}

async function writeAccounts(accounts) {
  return writeJsonContent(CLIENTS_FILE, accounts);
}

function getCookie(request, name) {
  const cookies = request.headers.cookie || "";
  const cookie = cookies.split(";").find((item) => item.trim().startsWith(`${name}=`));
  return cookie ? cookie.trim().slice(name.length + 1) : null;
}

function requireAdmin(req, res, next) {
  const token = getCookie(req, "session");
  const session = token && sessions.get(token);
  if (!session || session.role !== "admin") {
    return res.status(403).json({ erro: "Acesso restrito aos administradores." });
  }
  return next();
}

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe seu e-mail e sua senha." });
  }

  const accountMatches = (account) => {
    const accountEmail = account.email || account.usuario || account.login;
    const accountPassword = account.senha || account.password;
    return accountEmail === email && accountPassword === senha;
  };

  const adminAccount = (await readAccounts(ADMINS_FILE)).find(accountMatches);
  const clientAccount = (await readAccounts(CLIENTS_FILE)).find(accountMatches);
  const isAdmin = Boolean(adminAccount);
  const isClient = Boolean(clientAccount);

  if (!isAdmin && !isClient) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const account = isAdmin ? adminAccount : clientAccount;
  sessions.set(token, { role: isAdmin ? "admin" : "cliente", user: { nome: account.nome, email: account.email, foto: account.foto || "" } });
  res.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`);
  return res.json({ tipo: isAdmin ? "admin" : "cliente", redirect: isAdmin ? "/adm.html" : "/" });
});

app.get("/api/session", (req, res) => {
  const token = getCookie(req, "session");
  const session = token && sessions.get(token);
  if (!session) return res.json({ autenticado: false });
  return res.json({ autenticado: true, tipo: session.role, usuario: session.user });
});

app.post("/api/logout", (req, res) => {
  const token = getCookie(req, "session");
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return res.status(204).send();
});

app.post("/api/register", async (req, res) => {
  const nome = String(req.body?.nome || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const senha = String(req.body?.senha || "");
  const foto = String(req.body?.foto || "").trim();

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Informe nome, e-mail e senha." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });
  }

  const clients = await readAccounts(CLIENTS_FILE);
  const admins = await readAccounts(ADMINS_FILE);
  const emailExists = [...clients, ...admins].some((account) => String(account.email || "").toLowerCase() === email);
  if (emailExists) {
    return res.status(409).json({ erro: "Este e-mail já possui uma conta." });
  }

  const nextId = [...clients, ...admins].reduce((highest, account) => Math.max(highest, Number(account.id) || 0), 0) + 1;
  const client = { id: nextId, nome, email, senha, foto };
  clients.push(client);
  await writeAccounts(clients);
  return res.status(201).json({ mensagem: "Conta criada com sucesso." });
});

app.get("/adm.html", (req, res) => {
  const token = getCookie(req, "session");
  const session = token && sessions.get(token);

  if (!session || session.role !== "admin") {
    return res.redirect("/?login=admin");
  }

  return res.sendFile(path.join(__dirname, "adm.html"));
});

app.get("/api/products", async (req, res) => {
  res.json(await readProducts());
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const { titulo, preco, descricao, categoria, imagem } = req.body || {};
  if (!titulo || preco === undefined || !categoria || !imagem) {
    return res.status(400).json({ erro: "Preencha nome, preço, categoria e imagem." });
  }

  const products = await readProducts();
  const nextId = products.reduce((highest, product) => Math.max(highest, Number(product.id) || 0), 0) + 1;
  const product = {
    id: String(nextId),
    titulo: String(titulo).trim(),
    preco: String(preco).replace(".", ","),
    descricao: String(descricao || "").trim(),
    categoria: String(categoria).trim(),
    imagem: String(imagem).trim()
  };
  products.push(product);
  await writeProducts(products);
  return res.status(201).json(product);
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const products = await readProducts();
  const remaining = products.filter((product) => String(product.id) !== String(req.params.id));
  if (remaining.length === products.length) {
    return res.status(404).json({ erro: "Produto não encontrado." });
  }
  await writeProducts(remaining);
  return res.status(204).send();
});

app.get("/api/categories", async (req, res) => {
  const categories = [...new Set((await readProducts()).map((product) => product.categoria))];
  res.json(categories);
});

app.get("/api/products/category/:category", async (req, res) => {
  const category = decodeURIComponent(req.params.category).toLocaleLowerCase();
  const products = (await readProducts()).filter(
    (product) => product.categoria.toLocaleLowerCase() === category
  );
  res.json(products);
});

// Rota opcional para detalhes de um produto
app.get("/api/products/:id", async (req, res) => {
  const product = (await readProducts()).find((item) => String(item.id) === req.params.id);
  if (!product) return res.status(404).json({ erro: "Produto não encontrado." });
  res.json(product);
});

// SPA fallback
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FakeStore rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
