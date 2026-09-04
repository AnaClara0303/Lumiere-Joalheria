const btnLogin = document.querySelector('#btnLogin');
const modalLogin = document.querySelector('#modalLogin');
const formLogin = document.querySelector('#formLogin');
const fecharLogin = document.querySelector('#fecharLogin');
const mensagemLogin = document.querySelector('#mensagemLogin');
const areaLogin = document.querySelector('#areaLogin');
const areaCadastro = document.querySelector('#areaCadastro');
const tabEntrar = document.querySelector('#tabEntrar');
const tabCadastro = document.querySelector('#tabCadastro');
const btnCadastro = document.querySelector('#btnCadastro');
const perfilCliente = document.querySelector('#perfilCliente');
const nomeCliente = document.querySelector('#nomeCliente');
const fotoCliente = document.querySelector('#fotoCliente');
const footerLogin = document.querySelector('#footerLogin');
let menuPerfil;

function prepararMenuPerfil() {
  perfilCliente.style.position = 'relative';
  menuPerfil = document.createElement('div');
  menuPerfil.className = 'profile-menu';
  menuPerfil.hidden = true;
  menuPerfil.style.cssText = 'position:absolute;top:42px;right:0;min-width:145px;padding:8px;border:1px solid var(--line);background:var(--paper);box-shadow:0 12px 25px #25221f22;z-index:4';
  const botaoSair = document.createElement('button');
  botaoSair.type = 'button';
  botaoSair.textContent = 'Sair da conta';
  botaoSair.style.cssText = 'width:100%;border:0;padding:10px;background:transparent;color:var(--ink);text-align:left;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase';
  botaoSair.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.reload();
  });
  menuPerfil.appendChild(botaoSair);
  perfilCliente.appendChild(menuPerfil);
}

async function carregarPerfil() {
  try {
    const response = await fetch('/api/session', { credentials: 'same-origin' });
    if (!response.ok) return;
    const resultado = await response.json();
    if (resultado.tipo !== 'cliente' || !resultado.usuario) return;
    const usuario = resultado.usuario;
    nomeCliente.textContent = usuario.nome.split(' ')[0];
    fotoCliente.src = usuario.foto || `https://i.pravatar.cc/80?u=${encodeURIComponent(usuario.email)}`;
    fotoCliente.alt = `Foto de ${usuario.nome}`;
    fotoCliente.onerror = () => { fotoCliente.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome)}&background=ead3d0&color=292522`; };
    btnLogin.hidden = true;
    perfilCliente.hidden = false;
    prepararMenuPerfil();
  } catch (error) {}
}

function alternarModo(modo) {
  const cadastro = modo === 'cadastro';
  areaLogin.hidden = cadastro;
  areaCadastro.hidden = !cadastro;
  tabEntrar.classList.toggle('active', !cadastro);
  tabCadastro.classList.toggle('active', cadastro);
  mensagemLogin.textContent = '';
}

function abrirLogin(modo = 'login') {
  alternarModo(modo);
  mensagemLogin.textContent = '';
  modalLogin.showModal();
}

function mostrarErro(erro) {
  mensagemLogin.textContent = erro.name === 'TypeError' ? 'Não foi possível conectar ao servidor.' : erro.message || 'Não foi possível concluir a operação.';
}

btnLogin.addEventListener('click', () => abrirLogin());
footerLogin?.addEventListener('click', () => abrirLogin());
fecharLogin.addEventListener('click', () => modalLogin.close());
perfilCliente.addEventListener('click', (event) => {
  if (event.target.closest('.profile-menu')) return;
  menuPerfil.hidden = !menuPerfil.hidden;
});
tabEntrar.addEventListener('click', () => alternarModo('login'));
tabCadastro.addEventListener('click', () => alternarModo('cadastro'));

formLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  mensagemLogin.textContent = 'Entrando...';
  const dados = {
    email: document.querySelector('#emailLogin').value.trim(),
    senha: document.querySelector('#senhaLogin').value
  };
  try {
    const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados), credentials: 'same-origin' });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.erro);
    window.location.href = resultado.redirect;
  } catch (error) { mostrarErro(error); }
});

btnCadastro.addEventListener('click', async () => {
  const dados = { nome: formLogin.nome.value.trim(), email: formLogin.emailCadastro.value.trim(), senha: formLogin.senhaCadastro.value };
  if (!dados.nome || !dados.email || !dados.senha) { mensagemLogin.textContent = 'Preencha todos os campos para criar sua conta.'; return; }
  mensagemLogin.textContent = 'Criando sua conta...';
  try {
    const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados), credentials: 'same-origin' });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.erro);
    mensagemLogin.textContent = 'Conta criada. Entrando...';
    const login = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: dados.email, senha: dados.senha }), credentials: 'same-origin' });
    const loginResultado = await login.json();
    if (!login.ok) throw new Error(loginResultado.erro);
    window.location.href = loginResultado.redirect;
  } catch (error) { mostrarErro(error); }
});

if (new URLSearchParams(window.location.search).get('login') === 'admin') abrirLogin();
carregarPerfil();
