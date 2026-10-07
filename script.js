// -- Salvar e resgatar dados do LOCALSTORAGE

function carregarCandidatos() {
    const dados = localStorage.getItem("candidatos");
    return dados ? JSON.parse(dados) : []
}

function salvarCandidatos(candidatos) {
    localStorage.setItem("candidatos", JSON.stringify(candidatos));
}

function salvarVotos(votos) {
    localStorage.setItem("votos", JSON.stringify(votos));
}

function carregarVotos() {
    const dados = localStorage.getItem("votos");

    if (!dados || dados === "undefined") {
        return {};
    }

    try {
        return JSON.parse(dados);
    } catch (erro) {
        console.error("Erro ao carregar votos:", erro);
        return {};
    }
}
// ---- Navegação entre páginas

const abas = document.querySelectorAll(".aba")
const telas = document.querySelectorAll(".tela")

abas.forEach(function (aba) {
    aba.addEventListener("click", function () {
        abas.forEach(a => a.classList.remove("ativa"));
        telas.forEach(t => t.classList.remove("ativa"));

        aba.classList.add("ativa")
        document.getElementById(aba.dataset.tela).classList.add("ativa")

        if (aba.dataset.tela == "candidatos") mostrarCandidatos();
        if (aba.dataset.tela == "resultado") mostrarResultado();
    });
});

// --- Cadastro de candidatos 
const formaCandidato = document.getElementById("formCandidato");
const listaCandidatos = document.getElementById("listaCandidatos");

formCandidato.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nome = document.getElementById("nomeCandidato").value.trim();
    const numero = document.getElementById("numeroCandidato").value.trim();

    const candidatos = carregarCandidatos();

    const existente = candidatos.find(c => c.numero === numero);
    if (existente) {
        alert("Já existe um candidato com o número" + numero);
        return;
    }

    candidatos.push({nome: nome, numero: numero});
    salvarCandidatos(candidatos);

    formCandidato.reset();
    mostrarCandidatos();
});

function mostrarCandidatos() {
    const candidatos = carregarCandidatos();
    listaCandidatos.innerHTML = "";

    if (candidatos.length === 0) {
        listaCandidatos.innerHTML = "<li>Nenhum candidato cadastrado ainda.</li>";
        return;
    }

    candidatos.forEach(function (candidato) {
        const li = document.createElement("li");
        li.innerHTML = `
        <span><strong>${candidato.numero}</strong> - ${candidato.nome}</span>
        <button onClick="removerCandidato('${candidato.numero}')">Remover</button>`;
        listaCandidatos.appendChild(li);
    });
}

function removerCandidato(numero) {
    const candidatos = carregarCandidatos().filter(c => c.numero !== numero);
    salvarCandidatos(candidatos);
    mostrarCandidatos();
}

// ---- Votação

const inputVoto = document.getElementById("numerovoto");
const previa = document.getElementById("previa");
const telaFim = document.getElementById("fim");
const urna = document.querySelector(".urna");

inputVoto.addEventListener("input", function (){ 
    inputVoto.value = inputVoto.value.replace(/\D/g, "");
    atualizarPrevia();
});

function atualizarPrevia() {
    const numero = inputVoto.value;

    if(numero.length > 2) {
        previa.innerHTML = "";
        return;
    }

    const candidato = carregarCandidatos().find(c => c.numero === numero);

    if(candidato) {
        previa.innerHTML = `Candidato: <strong>${candidato.nome}</strong>`;
       } else {
        previa.innerHTML = `<spán class="nulo">Número Errado - Voto Nulo</span>`;
       } 
    }

    function registrarVoto(chave) {
        const votos = carregarVotos();
        votos[chave] = (votos[chave] || 0) + 1;
        salvarVotos(votos);
        mostrarFim();
    }

    document.getElementById("btnConfirma").addEventListener("click", function () {
        const numero = inputVoto.value;

        if(numero.length < 2) {
            alert("Digite o número do candidato (2 dígitos).");
            return;
        }
        
        const candidato = carregarCandidatos().find(c => c.numero === numero);
        registrarVoto(candidato ? numero : "nulo");
    });

    document.getElementById("btnBranco").addEventListener("click", function() {
        registrarVoto("branco");
    });

    document.getElementById("btnCorrige").addEventListener("click", limpaUrna);

    function limpaUrna() {
        inputVoto.value = "";
        previa.innerHTML = "";
        inputVoto.focus();
    }

    function mostrarFim() {
        urna.style.previa = "none";
        telaFim.style.display = "block";
    

    setTimeout(function () {
        telaFim.style.display = "none";
        urna.style.display = "block";
        limpaUrna();
    }, 2000);
    }

// ----- Resultado
function mostrarResultado() {
    const candidatos = carregarCandidatos();
    const votos = carregarVotos();
    const lista = document.getElementById("listaResultado");

    const resultado = candidatos.map(c => ({
        nome: `${c.numero} - ${c.nome}`,
        qtd: votos[c.numero] || 0
    }));
    resultado.push({nome: "Brancos", qtd: votos.branco || 0});
    resultado.push({nome: "Nulos", qtd: votos.nulo || 0});

    resultado.sort((a, b) => b.qtd - a.qtd);

    const total = resultado.reduce((soma, item) => soma + item.qtd, 0);
    document.getElementById("totalVotos").textContent = `Total de votos: ${total}`;

    lista.innerHTML = "";
    resultado.forEach(function (item) {
        const porcentagem = total > 0 ? ((item.qtd / total) * 100).toFixed(1) : 0;
        lista.innerHTML += `
        <div class="item-resultado">
         <div class="linha">
            <span>${item.nome}</nome>
            <span>${item.qtd} voto(s) - ${porcentagem}%</span>
        </div>
        <div class="barra"><div style="width: ${porcentagem}%></div><div>
        </div>`;
    });
}

document.getElementById("btnZerar").addEventListener("click", function () {
    if (confirm("Tem certeza que deseha pagar TODOS os votos?")) {
        localStorage.removeItem("votos");
        mostrarResultado();
    }
});

inputVoto.focus();








