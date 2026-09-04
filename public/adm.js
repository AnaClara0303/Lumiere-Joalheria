const formProduto = document.querySelector('#formProduto');
const listaProdutos = document.querySelector('#produtos');
const status = document.querySelector('#status');
const totalProdutos = document.querySelector('#totalProdutos');
const filtroCategoria = document.querySelector('#filtroCategoria');
const busca = document.querySelector('#busca');
const ordenacao = document.querySelector('#ordenacao');
const mensagem = document.querySelector('#mensagem');
const toast = document.querySelector('#toast');
let produtos = [];

function numero(valor) { return typeof valor === 'string' ? Number(valor.replace('.', '').replace(',', '.')) : Number(valor); }
function moeda(valor) { return numero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function escapar(valor) { return String(valor).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function avisar(texto, erro = false) { toast.textContent = texto; toast.style.background = erro ? '#8b3c37' : ''; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }

function atualizarCategorias() {
    const atual = filtroCategoria.value;
    const categorias = [...new Set(produtos.map((produto) => produto.categoria))].sort((a, b) => a.localeCompare(b));
    filtroCategoria.innerHTML = '<option value="todos">Todas</option>' + categorias.map((categoria) => `<option value="${escapar(categoria)}">${escapar(categoria)}</option>`).join('');
    filtroCategoria.value = categorias.includes(atual) ? atual : 'todos';
}

function renderizar() {
    const termo = busca.value.trim().toLocaleLowerCase();
    const categoria = filtroCategoria.value;
    let lista = produtos.filter((produto) => (!termo || `${produto.titulo} ${produto.categoria}`.toLocaleLowerCase().includes(termo)) && (categoria === 'todos' || produto.categoria === categoria));
    if (ordenacao.value === 'nome') lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
    if (ordenacao.value === 'preco-menor') lista.sort((a, b) => numero(a.preco) - numero(b.preco));
    if (ordenacao.value === 'preco-maior') lista.sort((a, b) => numero(b.preco) - numero(a.preco));
    status.textContent = `${lista.length} ${lista.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
    totalProdutos.textContent = produtos.length;
    listaProdutos.innerHTML = lista.length ? lista.map((produto) => `<article class="product-row"><img src="${escapar(produto.imagem)}" alt="" onerror="this.style.visibility='hidden'"><div><h3>${escapar(produto.titulo)}</h3><p>${escapar(produto.descricao || 'Sem descrição')}</p></div><span class="row-category">${escapar(produto.categoria)}</span><span class="row-price">${moeda(produto.preco)}</span><button class="delete-button" type="button" data-id="${escapar(produto.id)}">Excluir</button></article>`).join('') : '<p class="empty-state">Nenhum produto corresponde à busca.</p>';
    listaProdutos.querySelectorAll('.delete-button').forEach((botao) => botao.addEventListener('click', () => excluirProduto(botao.dataset.id)));
}

async function carregarProdutos() {
    status.textContent = 'Carregando produtos...';
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Não foi possível carregar o catálogo.');
    produtos = await response.json();
    atualizarCategorias(); renderizar();
}

async function excluirProduto(id) {
    const produto = produtos.find((item) => String(item.id) === String(id));
    if (!produto || !window.confirm(`Excluir "${produto.titulo}" da loja?`)) return;
    try {
        const response = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
        const resultado = response.status === 204 ? {} : await response.json();
        if (response.status === 403) throw new Error('Sua sessão expirou. Faça login novamente.');
        if (!response.ok) throw new Error(resultado.erro || 'Não foi possível excluir o produto.');
        await carregarProdutos(); avisar('Produto excluído da vitrine.');
    } catch (error) {
        avisar(error.message || 'Não foi possível excluir o produto.', true);
    }
}

formProduto.addEventListener('submit', async (event) => {
    event.preventDefault(); mensagem.textContent = 'Salvando produto...';
    const dados = Object.fromEntries(new FormData(formProduto));
    try {
        const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.erro || 'Não foi possível salvar o produto.');
        formProduto.reset(); mensagem.textContent = ''; await carregarProdutos(); avisar('Produto adicionado à vitrine.');
    } catch (error) { mensagem.textContent = error.message; }
});

[busca, filtroCategoria, ordenacao].forEach((controle) => controle.addEventListener('input', renderizar));
document.querySelector('#atualizar').addEventListener('click', () => carregarProdutos().catch((error) => avisar(error.message, true)));
carregarProdutos().catch((error) => { status.textContent = error.message; });
