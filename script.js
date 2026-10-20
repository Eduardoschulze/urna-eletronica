const STORAGE = { candidates: "candidatos", votes: "votos", users: "urnaUsuarios", admin: "urnaAdmin", session: "urnaSessao" };

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
const loadCandidates = () => load(STORAGE.candidates, []);
const loadVotes = () => load(STORAGE.votes, {});
const loadUsers = () => load(STORAGE.users, []);
const getAdmin = () => load(STORAGE.admin, null);
// A sessão existe apenas enquanto esta página está aberta; nunca restaura login após recarregar.
let activeSession = null;
localStorage.removeItem(STORAGE.session);
const getSession = () => activeSession;
const saveCandidates = value => localStorage.setItem(STORAGE.candidates, JSON.stringify(value));
const saveVotes = value => localStorage.setItem(STORAGE.votes, JSON.stringify(value));
const saveUsers = value => localStorage.setItem(STORAGE.users, JSON.stringify(value));
const normalizeEmail = value => value.trim().toLowerCase();

async function passwordHash(password) {
  // Mantém compatibilidade com o CryptoJS SHA-512 usado no repositório de referência.
  if (window.CryptoJS) return CryptoJS.SHA512(password).toString();
  if (window.crypto?.subtle) {
    const bytes = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(password));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Não foi possível carregar o recurso SHA-512. Verifique sua conexão.");
}

const navTabs = document.querySelectorAll(".nav-tab");
const screens = document.querySelectorAll(".screen");
let nextScreen = "resultado";
let votingLocked = false;

function showScreen(name) {
  screens.forEach(screen => screen.classList.toggle("active", screen.id === name));
  navTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.screen === name));
  if (name === "candidatos") renderCandidates();
  if (name === "resultado") renderResults();
  if (name === "auth") syncAuthView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAuth(view, intendedScreen) {
  nextScreen = intendedScreen;
  showScreen("auth");
  setAuthView(view);
}

function setAuthView(view) {
  document.querySelectorAll(".auth-form-view").forEach(panel => panel.classList.add("hidden"));
  const panel = document.getElementById(`auth${view[0].toUpperCase()}${view.slice(1)}`);
  if (panel) panel.classList.remove("hidden");
  document.querySelectorAll(".inline-message").forEach(message => { message.textContent = ""; message.classList.remove("success"); });
}

function syncAuthView() {
  if (nextScreen === "candidatos") setAuthView(getAdmin() ? "adminLogin" : "adminSetup");
  else setAuthView("register");
}

function refreshAccountArea() {
  const area = document.getElementById("accountArea");
  const session = getSession();
  area.replaceChildren();
  if (!session) {
    const button = document.createElement("button");
    button.className = "account-action";
    button.textContent = "Entrar / cadastro";
    button.addEventListener("click", () => showAuth("register", "resultado"));
    area.append(button);
    document.getElementById("adminTools").style.display = "none";
    return;
  }
  const chip = document.createElement("div");
  chip.className = "user-chip";
  const label = document.createElement("span");
  label.textContent = `${session.role === "admin" ? "★ " : ""}${session.email}`;
  const logout = document.createElement("button");
  logout.type = "button";
  logout.textContent = "Sair";
  logout.addEventListener("click", () => {
    activeSession = null;
    localStorage.removeItem(STORAGE.session);
    refreshAccountArea();
    showScreen("votacao");
  });
  chip.append(label, logout);
  area.append(chip);
  document.getElementById("adminTools").style.display = session.role === "admin" ? "flex" : "none";
}

navTabs.forEach(tab => tab.addEventListener("click", () => {
  const destination = tab.dataset.screen;
  if (destination !== "candidatos" && getSession()?.role === "admin") {
    activeSession = null;
    refreshAccountArea();
  }
  if (destination === "candidatos" && getSession()?.role !== "admin") {
    if (getSession()?.role === "user") {
      activeSession = null;
      refreshAccountArea();
    }
    showAuth(getAdmin() ? "adminLogin" : "adminSetup", "candidatos");
    return;
  }
  if (destination === "resultado" && !getSession()) {
    showAuth("register", "resultado");
    return;
  }
  showScreen(destination);
}));
document.querySelectorAll('.brand[href="#votacao"]').forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  if (getSession()?.role === "admin") {
    activeSession = null;
    refreshAccountArea();
  }
  showScreen("votacao");
}));

document.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => {
  if (nextScreen === "candidatos" && button.dataset.authView === "register") return;
  setAuthView(button.dataset.authView);
}));
document.getElementById("authBack").addEventListener("click", () => showScreen("votacao"));

function validPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[\W_]/.test(password);
}
function setMessage(id, message, success = false) {
  const node = document.getElementById(id);
  node.textContent = message;
  node.classList.toggle("success", success);
}

document.getElementById("formRegister").addEventListener("submit", async event => {
  event.preventDefault();
  const email = normalizeEmail(document.getElementById("registerEmail").value);
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirm").value;
  if (!validPassword(password)) return setMessage("registerMessage", "Use 8 ou mais caracteres, uma letra maiúscula e um símbolo.");
  if (password !== confirm) return setMessage("registerMessage", "As senhas não conferem.");
  if (loadUsers().some(user => user.email === email) || getAdmin()?.email === email) return setMessage("registerMessage", "Este e-mail já possui cadastro.");
  try {
    const hash = await passwordHash(password);
    const users = loadUsers();
    users.push({ email, senhaHash: hash });
    saveUsers(users);
    event.currentTarget.reset();
    setMessage("registerMessage", "Cadastro criado. Agora entre com seu e-mail e senha.", true);
    setTimeout(() => setAuthView("login"), 900);
  } catch (error) { setMessage("registerMessage", error.message); }
});

document.getElementById("formLogin").addEventListener("submit", async event => {
  event.preventDefault();
  const email = normalizeEmail(document.getElementById("loginEmail").value);
  const password = document.getElementById("loginPassword").value;
  try {
    const hash = await passwordHash(password);
    const user = loadUsers().find(item => item.email === email && item.senhaHash === hash);
    if (!user) return setMessage("loginMessage", "E-mail ou senha incorretos.");
    activeSession = { email, role: "user" };
    refreshAccountArea();
    showScreen("resultado");
  } catch (error) { setMessage("loginMessage", error.message); }
});

document.getElementById("formAdminSetup").addEventListener("submit", async event => {
  event.preventDefault();
  if (getAdmin()) return setMessage("adminMessage", "A conta de administrador já foi configurada.");
  const email = normalizeEmail(document.getElementById("adminEmail").value);
  const password = document.getElementById("adminPassword").value;
  const confirm = document.getElementById("adminConfirm").value;
  if (!validPassword(password)) return setMessage("adminMessage", "Use 8 ou mais caracteres, uma letra maiúscula e um símbolo.");
  if (password !== confirm) return setMessage("adminMessage", "As senhas não conferem.");
  if (loadUsers().some(user => user.email === email)) return setMessage("adminMessage", "Esse e-mail já está em uso por uma conta comum.");
  try {
    const hash = await passwordHash(password);
    localStorage.setItem(STORAGE.admin, JSON.stringify({ email, senhaHash: hash }));
    activeSession = { email, role: "admin" };
    event.currentTarget.reset();
    refreshAccountArea();
    showScreen("candidatos");
  } catch (error) { setMessage("adminMessage", error.message); }
});

document.getElementById("formAdminLogin").addEventListener("submit", async event => {
  event.preventDefault();
  const email = normalizeEmail(document.getElementById("adminLoginEmail").value);
  const password = document.getElementById("adminLoginPassword").value;
  const admin = getAdmin();
  try {
    const hash = await passwordHash(password);
    if (!admin || admin.email !== email || admin.senhaHash !== hash) return setMessage("adminLoginMessage", "Credenciais de administrador incorretas.");
    activeSession = { email, role: "admin" };
    refreshAccountArea();
    showScreen("candidatos");
  } catch (error) { setMessage("adminLoginMessage", error.message); }
});

const candidateForm = document.getElementById("formCandidato");
candidateForm.addEventListener("submit", event => {
  event.preventDefault();
  if (getSession()?.role !== "admin") return showAuth(getAdmin() ? "adminLogin" : "adminSetup", "candidatos");
  const name = document.getElementById("nomeCandidato").value.trim();
  const number = document.getElementById("numeroCandidato").value.trim();
  if (!/^\d{2}$/.test(number)) return alert("O número deve ter exatamente 2 dígitos.");
  const candidates = loadCandidates();
  if (candidates.some(candidate => candidate.numero === number)) return alert("Esse número já está cadastrado.");
  candidates.push({ nome: name, numero: number });
  saveCandidates(candidates);
  candidateForm.reset();
  renderCandidates();
});

function renderCandidates() {
  const list = document.getElementById("listaCandidatos");
  list.replaceChildren();
  const candidates = loadCandidates();
  document.getElementById("candidateCount").textContent = candidates.length;
  if (!candidates.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Nenhum candidato cadastrado ainda.";
    list.append(empty);
    return;
  }
  candidates.forEach(candidate => {
    const item = document.createElement("li");
    const info = document.createElement("div");
    info.className = "candidate-info";
    const number = document.createElement("span");
    number.className = "candidate-number";
    number.textContent = candidate.numero;
    const name = document.createElement("span");
    name.className = "candidate-name";
    name.textContent = candidate.nome;
    info.append(number, name);
    item.append(info);
    if (getSession()?.role === "admin") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "candidate-remove";
      remove.textContent = "Remover";
      remove.addEventListener("click", () => {
        saveCandidates(loadCandidates().filter(candidateItem => candidateItem.numero !== candidate.numero));
        renderCandidates();
      });
      item.append(remove);
    }
    list.append(item);
  });
}

const voteInput = document.getElementById("numerovoto");
const preview = document.getElementById("previa");
const voteButtons = document.querySelector(".vote-actions");
const finish = document.getElementById("fim");
voteInput.addEventListener("input", () => {
  voteInput.value = voteInput.value.replace(/\D/g, "").slice(0, 2);
  updatePreview();
});
function updatePreview() {
  if (!voteInput.value) { preview.textContent = "Aguardando seu voto"; return; }
  const candidate = loadCandidates().find(item => item.numero === voteInput.value);
  preview.textContent = candidate ? candidate.nome : "Número não cadastrado · voto nulo";
}
function registerVote(key) {
  if (votingLocked) return;
  const votes = loadVotes();
  votes[key] = (votes[key] || 0) + 1;
  saveVotes(votes);
  votingLocked = true;
  voteInput.hidden = true;
  preview.hidden = true;
  voteButtons.hidden = true;
  finish.style.display = "flex";
  setTimeout(() => {
    voteInput.value = "";
    voteInput.hidden = false;
    preview.hidden = false;
    voteButtons.hidden = false;
    finish.style.display = "none";
    votingLocked = false;
    updatePreview();
    voteInput.focus();
  }, 1500);
}
document.getElementById("btnConfirma").addEventListener("click", () => {
  const number = voteInput.value;
  if (number.length !== 2) return alert("Digite os 2 dígitos do candidato.");
  registerVote(loadCandidates().some(candidate => candidate.numero === number) ? number : "nulo");
});
document.getElementById("btnBranco").addEventListener("click", () => registerVote("branco"));
document.getElementById("btnCorrige").addEventListener("click", () => {
  voteInput.value = "";
  updatePreview();
  voteInput.focus();
});

function renderResults() {
  const votes = loadVotes();
  const rows = loadCandidates().map(candidate => ({ name: `${candidate.numero} · ${candidate.nome}`, count: votes[candidate.numero] || 0 }));
  rows.push({ name: "Votos em branco", count: votes.branco || 0 }, { name: "Votos nulos", count: votes.nulo || 0 });
  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  document.getElementById("totalVotos").textContent = total;
  const list = document.getElementById("listaResultado");
  list.replaceChildren();
  rows.forEach(row => {
    const percent = total ? row.count / total * 100 : 0;
    const block = document.createElement("div");
    block.className = "result-row";
    const line = document.createElement("div");
    line.className = "result-line";
    const name = document.createElement("span");
    name.className = "result-name";
    name.textContent = row.name;
    const value = document.createElement("span");
    value.className = "result-value";
    value.textContent = `${row.count} voto(s) · ${percent.toFixed(1)}%`;
    line.append(name, value);
    const bar = document.createElement("div");
    bar.className = "result-bar";
    const fill = document.createElement("div");
    fill.className = "result-fill";
    fill.style.width = `${percent}%`;
    bar.append(fill);
    block.append(line, bar);
    list.append(block);
  });
}

document.getElementById("btnZerar").addEventListener("click", () => {
  if (getSession()?.role !== "admin") return;
  if (confirm("Tem certeza que deseja zerar todos os votos?")) {
    localStorage.removeItem(STORAGE.votes);
    renderResults();
  }
});

document.getElementById("footerYear").textContent = new Date().getFullYear();
refreshAccountArea();
renderCandidates();
if (getSession()) showScreen("votacao");
