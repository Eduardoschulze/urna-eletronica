function carregar(chave,padrao) {
try{return JSON.parse(localStorage.getItem(chave))??padrao}catch{return padrao}
}

const carregarCandidatos=()=>carregar("candidatos",[]),carregarVotos=()=>carregar("votos",{}
);


const salvarCandidatos=d=>localStorage.setItem("candidatos",JSON.stringify(d)),salvarVotos=d=>localStorage.setItem("votos",JSON.stringify(d));

const abas=document.querySelectorAll(".aba"),telas=document.querySelectorAll(".tela");

abas.forEach(a=>a.addEventListener("click",()=> {
abas.forEach(x=>x.classList.remove("ativa"));
telas.forEach(x=>x.classList.remove("ativa"));
a.classList.add("ativa");
document.getElementById(a.dataset.tela).classList.add("ativa");
if (a.dataset.tela==="candidatos")mostrarCandidatos();
if (a.dataset.tela==="resultado")mostrarResultado()}));

const form=document.getElementById("formCandidato"),listaCandidatos=document.getElementById("listaCandidatos");

form.addEventListener("submit",e=> {
e.preventDefault();
const nome=document.getElementById("nomeCandidato").value.trim(),numero=document.getElementById("numeroCandidato").value.trim();
if (!/^\d{2}$/.test(numero)) {
alert("O número deve ter exatamente 2 dígitos.");
return}
const cs=carregarCandidatos();
if (cs.some(c=>c.numero===numero)) {
alert("Esse número já está cadastrado.");
return}cs.push({nome,numero}
);

salvarCandidatos(cs);
form.reset();
mostrarCandidatos()}
);


function mostrarCandidatos() {
listaCandidatos.replaceChildren();
const cs=carregarCandidatos();
if (!cs.length) {
const li=document.createElement("li");
li.textContent="Nenhum candidato cadastrado ainda.";
listaCandidatos.appendChild(li);
return}cs.forEach(c=> {
const li=document.createElement("li");
li.append(document.createTextNode(c.numero+" - "+c.nome+" "));
const b=document.createElement("button");
b.textContent="Remover";
b.addEventListener("click",()=> {
salvarCandidatos(carregarCandidatos().filter(x=>x.numero!==c.numero));
mostrarCandidatos()}
);

li.appendChild(b);
listaCandidatos.appendChild(li)})}
const input=document.getElementById("numerovoto"),previa=document.getElementById("previa"),fim=document.getElementById("fim"),botoes=document.querySelector(".botoes-urna");
let bloqueia=false;

input.addEventListener("input",()=> {
input.value=input.value.replace(/\D/g,"").slice(0,2);
atualizarPrevia()}
);


function atualizarPrevia() {
previa.textContent="";
if (!input.value)return;
const c=carregarCandidatos().find(x=>x.numero===input.value);
previa.textContent=c?"Candidato: "+c.nome:"Número não cadastrado: voto nulo"}
function registrar(chave) {
if (bloqueia)return;
const votos=carregarVotos();
votos[chave]=(votos[chave]||0)+1;
salvarVotos(votos);
bloqueia=true;
input.hidden=previa.hidden=botoes.hidden=true;
fim.style.display="block";
setTimeout(()=> {
input.value="";
input.hidden=previa.hidden=botoes.hidden=false;
fim.style.display="none";
bloqueia=false;
atualizarPrevia();
input.focus()},1500)}
document.getElementById("btnConfirma").addEventListener("click",()=> {
const n=input.value;
if (n.length!==2) {
alert("Digite os 2 dígitos do candidato.");
return}registrar(carregarCandidatos().some(c=>c.numero===n)?n:"nulo")}
);


document.getElementById("btnBranco").addEventListener("click",()=>registrar("branco"));
document.getElementById("btnCorrige").addEventListener("click",()=> {
input.value="";
atualizarPrevia();
input.focus()}
);


function mostrarResultado() {
const votos=carregarVotos(),res=carregarCandidatos().map(c=>({nome:c.numero+" - "+c.nome,qtd:votos[c.numero]||0}));
res.push({nome:"Brancos",qtd:votos.branco||0},{nome:"Nulos",qtd:votos.nulo||0}
);

res.sort((a,b)=>b.qtd-a.qtd);
const total=res.reduce((s,x)=>s+x.qtd,0);
document.getElementById("totalVotos").textContent="Total de votos: "+total;
const lista=document.getElementById("listaResultado");
lista.replaceChildren();
res.forEach(x=> {
const p=total?x.qtd/total*100:0,bloco=document.createElement("div");
bloco.className="item-resultado";
const linha=document.createElement("div");
linha.className="linha";
const nome=document.createElement("span"),qtd=document.createElement("span");
nome.textContent=x.nome;
qtd.textContent=x.qtd+" voto(s) - "+p.toFixed(1)+"%";
linha.append(nome,qtd);
const barra=document.createElement("div"),fill=document.createElement("div");
barra.className="barra";
fill.style.width=p+"%";
barra.appendChild(fill);
bloco.append(linha,barra);
lista.appendChild(bloco)})}
document.getElementById("btnZerar").addEventListener("click",()=> {
if (confirm("Tem certeza que deseja zerar todos os votos?")) {
localStorage.removeItem("votos");
mostrarResultado()}
}

);


mostrarCandidatos();
input.focus();

