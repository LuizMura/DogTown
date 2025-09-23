import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1lY9XI-Np8r8Kk9I1QMo-_V537SXlOUM",
  authDomain: "dogtown-f3603.firebaseapp.com",
  projectId: "dogtown-f3603",
  storageBucket: "dogtown-f3603.appspot.com",
  messagingSenderId: "153818184475",
  appId: "1:153818184475:web:892e41f0d576c5d16931be",
  measurementId: "G-8P2KKQ8CE7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let idEditando = null;

// // DEBUG: mostrar admin direto sem login
// document.getElementById("login-section").style.display = "none";
// document.getElementById("admin-section").style.display = "block";
// carregarProdutos();
window.login = async () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-section").style.display = "block";
    carregarProdutos();
  } catch (error) {
    alert("Login falhou: " + error.message);
  }
};

const prompt = document.getElementById("produto-prompt");
const tituloPrompt = document.getElementById("titulo-prompt");
const btnAbrir = document.getElementById("abrirPrompt");
const btnCancelar = document.getElementById("cancelarPrompt");
const btnSalvar = document.getElementById("salvarProduto");

const inputNome = document.getElementById("input-nome");
const inputPreco = document.getElementById("input-preco");
const inputImagem = document.getElementById("input-imagem");
const inputTamanho = document.getElementById("input-tamanho");
const inputABV = document.getElementById("input-abv");
const inputIBU = document.getElementById("input-ibu");
const inputEstoque = document.getElementById("input-estoque");
const inputOrdem = document.getElementById("input-ordem");
// Mapeamento de cervejas para ABV e IBU
const cervejasPadrao = {
  "Dogtown - LAGER": { abv: "4.5%", ibu: "11" },
  "Dogtown - APA": { abv: "5.0%", ibu: "39" },
  "Dogtown - IPA": { abv: "6.2%", ibu: "53" },
  "Dogtown - BITTER": { abv: "4.6%", ibu: "36" },
  "Dogtown - PORTER": { abv: "4.7%", ibu: "28" },
};

// Atualiza ABV e IBU quando o tipo de cerveja muda
function atualizarABVEIBU() {
  const padrao = cervejasPadrao[inputNome.value];
  if (padrao) {
    inputABV.value = padrao.abv;
    inputIBU.value = padrao.ibu;
  } else {
    inputABV.value = "";
    inputIBU.value = "";
  }
}

btnAbrir.onclick = () => abrirPrompt();
btnCancelar.onclick = () => fecharPrompt();

function abrirPrompt(dados = null, id = null) {
  prompt.classList.remove("hidden");
  if (dados) {
    inputOrdem.value = dados.ordem || 0;
    inputNome.value = dados.nome;
    inputPreco.value = dados.preco;
    inputImagem.value = dados.imagem;
    inputTamanho.value = dados.tamanho;
    inputABV.value = dados.abv || "";
    inputIBU.value = dados.ibu || "";
    inputEstoque.value = dados.estoque || 0;
    tituloPrompt.textContent = "Editar Produto";
    idEditando = id;
  } else {
    inputOrdem.value = 0;
    inputNome.value = "";
    inputPreco.value = "";
    inputImagem.value = "";
    inputABV.value = "";
    inputIBU.value = "";
    inputEstoque.value = 0;
    tituloPrompt.textContent = "Adicionar Produto";
    idEditando = null;
  }
  atualizarABVEIBU(); // garante que ABV/IBU estejam corretos
}
inputNome.addEventListener("change", atualizarABVEIBU);

function fecharPrompt() {
  prompt.classList.add("hidden");
  idEditando = null;
}

btnSalvar.onclick = async () => {
  const produto = {
    nome: inputNome.value.trim(),
    preco: parseFloat(inputPreco.value),
    imagem: inputImagem.value.trim(),
    tamanho: inputTamanho.value.trim(),
    abv: inputABV.value.trim(),
    ibu: inputIBU.value.trim(),
    estoque: parseInt(inputEstoque.value),
    ordem: parseInt(inputOrdem.value) || 0,
  };

  // Verificando se os campos obrigatórios estão preenchidos corretamente
  if (!produto.nome || isNaN(produto.preco) || produto.preco <= 0) {
    alert(
      "Nome e preço são obrigatórios e o preço deve ser um valor positivo."
    );
    return;
  }

  try {
    if (idEditando) {
      await updateDoc(doc(db, "produtos", idEditando), produto);
      alert("Produto atualizado com sucesso!");
    } else {
      await addDoc(collection(db, "produtos"), produto);
      alert("Produto adicionado com sucesso!");
    }
    fecharPrompt();
    carregarProdutos();
  } catch (error) {
    alert("Erro ao salvar produto: " + error.message);
  }
};

async function carregarProdutos() {
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = "";

  const snapshot = await getDocs(collection(db, "produtos"));

  // transforma em array e ordena pelo campo 'ordem'
  const produtos = snapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  produtos.forEach((dados) => {
    const div = document.createElement("div");
    div.classList.add("card-produto");
    div.innerHTML = `
      <img src="${dados.imagem}" alt="${
      dados.nome
    }" style="width: 50%; max-width: 80px; border-radius: 5px; margin-bottom: 10px;">
      <p><strong>${dados.nome}</strong></p>
      <p><strong>R$ ${(Number(dados.preco) || 0).toFixed(2)}</strong></p>
      <p>${dados.abv ? "ABV: " + dados.abv : ""} ${
      dados.ibu ? "IBU: " + dados.ibu : ""
    }</p>
      <p>Estoque: ${dados.estoque || 0}</p>
      <p>${dados.tamanho ? "Tamanho: " + dados.tamanho : ""}</p>
      <p>${dados.descricao || ""}</p>
      <button onclick='abrirPrompt(${JSON.stringify(dados).replace(
        /"/g,
        "&quot;"
      )}, "${dados.id}")'>Editar</button>
      <button onclick='removerProduto("${dados.id}")'>Remover</button>
    `;
    lista.appendChild(div);
  });
}

window.removerProduto = async (id) => {
  await deleteDoc(doc(db, "produtos", id));
  carregarProdutos();
};

window.abrirPrompt = abrirPrompt;
