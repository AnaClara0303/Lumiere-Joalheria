const produtosContainer = document.querySelector("#produtos");
const filtrosContainer = document.querySelector("#filtros");
const statusLoja = document.querySelector("#statusLoja");
const painelCarrinho = document.querySelector("#painelCarrinho");
const itensCarrinhoContainer = document.querySelector("#itensCarrinho");
const contadorCarrinho = document.querySelector("#contadorCarrinho");
const totalCarrinho = document.querySelector("#totalCarrinho");
const toast = document.querySelector("#toast");
const buscaLoja = document.querySelector("#buscaLoja");
const formBusca = document.querySelector("#formBusca");
const menuMobile = document.querySelector("#menuMobile");
const menuButton = document.querySelector(".menu-button");
let produtos = [];
let categoriaAtual = "Todos";
let carrinho = JSON.parse(localStorage.getItem("carrinhoLumiere")) || [];

function valorNumerico(valor) { return typeof valor === "string" ? Number(valor.replace(".", "").replace(",", ".")) : Number(valor); }
function formatarMoeda(valor) { return valorNumerico(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function imagemFallback(event) { event.target.style.display = "none"; }

function alternarMenu(aberto) {
    menuMobile.hidden = !aberto;
    menuButton.setAttribute("aria-expanded", String(aberto));
}

function renderizarFiltros() {
    const categorias = ["Todos", ...new Set(produtos.map((produto) => produto.categoria))];
    filtrosContainer.innerHTML = categorias.map((categoria) => `<button class="filter ${categoria === categoriaAtual ? "active" : ""}" data-categoria="${categoria}">${categoria}</button>`).join("");
    filtrosContainer.querySelectorAll(".filter").forEach((botao) => botao.addEventListener("click", () => { categoriaAtual = botao.dataset.categoria; renderizarFiltros(); renderizarProdutos(); }));
}

function renderizarProdutos() {
    const termo = buscaLoja.value.trim().toLocaleLowerCase();
    const lista = produtos.filter((produto) => {
        const pertenceCategoria = categoriaAtual === "Todos" || produto.categoria === categoriaAtual;
        const textoProduto = `${produto.titulo} ${produto.categoria} ${produto.descricao || ""}`.toLocaleLowerCase();
        return pertenceCategoria && (!termo || textoProduto.includes(termo));
    });
    statusLoja.textContent = `${lista.length} ${lista.length === 1 ? "peça disponível" : "peças disponíveis"}`;
    produtosContainer.innerHTML = lista.slice(0, 12).map((produto) => `<article class="product-card"><div class="product-image"><img src="${produto.imagem}" alt="${produto.titulo}" onerror="imagemFallback(event)"></div><div class="product-info"><span class="product-category">${produto.categoria}</span><h3>${produto.titulo}</h3><p>${formatarMoeda(produto.preco)}</p><button class="product-buy" data-id="${produto.id}" type="button">Adicionar à sacola</button></div></article>`).join("");
    produtosContainer.querySelectorAll(".product-buy").forEach((botao) => botao.addEventListener("click", () => adicionarAoCarrinho(botao.dataset.id)));
}

function adicionarAoCarrinho(id) {
    const produto = produtos.find((item) => String(item.id) === String(id));
    if (!produto) return;
    carrinho.push(produto); localStorage.setItem("carrinhoLumiere", JSON.stringify(carrinho)); atualizarCarrinho();
    toast.textContent = "Peça adicionada à sua sacola"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200);
}

function atualizarCarrinho() {
    contadorCarrinho.textContent = carrinho.length;
    totalCarrinho.textContent = formatarMoeda(carrinho.reduce((total, item) => total + valorNumerico(item.preco), 0));
    itensCarrinhoContainer.innerHTML = carrinho.length ? carrinho.map((item, index) => `<div class="cart-item"><img src="${item.imagem}" alt="" onerror="imagemFallback(event)"><div><h3>${item.titulo}</h3><p>${formatarMoeda(item.preco)}</p></div><button class="remove-item" type="button" data-index="${index}">Remover</button></div>`).join("") : '<p class="cart-empty">Sua sacola está esperando<br>por uma peça especial.</p>';
    itensCarrinhoContainer.querySelectorAll(".remove-item").forEach((botao) => botao.addEventListener("click", () => { carrinho.splice(Number(botao.dataset.index), 1); localStorage.setItem("carrinhoLumiere", JSON.stringify(carrinho)); atualizarCarrinho(); }));
}

function alternarCarrinho(aberto) { painelCarrinho.classList.toggle("open", aberto); painelCarrinho.setAttribute("aria-hidden", String(!aberto)); document.querySelector("#overlay").classList.toggle("open", aberto); }
document.querySelector("#btnCarrinho").addEventListener("click", () => alternarCarrinho(true));
document.querySelector("#fecharCarrinho").addEventListener("click", () => alternarCarrinho(false));
document.querySelector("#overlay").addEventListener("click", () => alternarCarrinho(false));
document.querySelector("#finalizarCompra").addEventListener("click", () => { toast.textContent = "Em breve, um consultor Lumiére falará com você."; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); });
menuButton.addEventListener("click", () => alternarMenu(menuMobile.hidden));
document.querySelector("#fecharMenu").addEventListener("click", () => alternarMenu(false));
menuMobile.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => alternarMenu(false)));
buscaLoja.addEventListener("input", renderizarProdutos);
formBusca.addEventListener("submit", (event) => { event.preventDefault(); document.querySelector("#colecao").scrollIntoView({ behavior: "smooth" }); renderizarProdutos(); });
if (window.location.protocol === "file:") {
    statusLoja.textContent = "Abra a loja pelo endereço http://localhost:3000 para carregar os produtos.";
} else {
    fetch("/api/products").then((response) => response.json()).then((dados) => { produtos = dados; renderizarFiltros(); renderizarProdutos(); }).catch(() => { statusLoja.textContent = "Não foi possível carregar a coleção. Inicie o servidor com node server.js."; });
}
atualizarCarrinho();