// js/loja.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ⚠️ Use a MESMA configuração do seu painel admin (o mesmo projeto Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyD1lY9XI-Np8r8Kk9I1QMo-_V537SXlOUM",
  authDomain: "dogtown-f3603.firebaseapp.com",
  projectId: "dogtown-f3603",
  storageBucket: "dogtown-f3603.appspot.com",
  messagingSenderId: "153818184475",
  appId: "1:153818184475:web:892e41f0d576c5d16931be",
  measurementId: "G-ZEPXV9VTFE",
};

// 🔹 Inicializa Firebase e Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeCartKey(nome, volume) {
  return (
    String(nome || "")
      .trim()
      .toLowerCase() +
    "::" +
    String(volume || "")
      .trim()
      .toLowerCase()
  );
}

function getCarrinho() {
  try {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    return carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
  } catch (_error) {
    return [];
  }
}

function updateProductCounters() {
  const countersByProduct = {};

  getCarrinho().forEach((item) => {
    const key = normalizeCartKey(item.nome, item.volume);
    const quantidade = Number(item.quantidade || 0);
    countersByProduct[key] = (countersByProduct[key] || 0) + quantidade;
  });

  document.querySelectorAll(".card-cerveja[data-cart-name]").forEach((card) => {
    const key = normalizeCartKey(
      card.dataset.cartName,
      card.dataset.cartVolume,
    );
    const counter = card.querySelector(".card-cart-counter");

    if (!counter) {
      return;
    }

    const quantidade = countersByProduct[key] || 0;
    counter.textContent = quantidade > 0 ? String(quantidade) : "";
    counter.classList.toggle("is-visible", quantidade > 0);
  });
}

window.addEventListener("dogtown-cart-updated", updateProductCounters);

async function carregarCervejas() {
  const lista = document.getElementById("lista-cervejas");
  const spinner = document.getElementById("spinner");
  spinner.classList.remove("hidden");

  const snapshot = await getDocs(collection(db, "produtos"));

  const cervejas = [];
  snapshot.forEach((docSnap) => {
    cervejas.push({ id: docSnap.id, ...docSnap.data() });
  });

  cervejas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  lista.innerHTML = "";
  cervejas.forEach((cerveja) => {
    const nomeLimpo = String(cerveja.nome || "")
      .replace(/^Dogtown\s*-\s*/i, "")
      .trim();
    const volume = cerveja.tamanho || "";

    const card = document.createElement("div");
    card.classList.add("card-cerveja");
    card.dataset.cartName = nomeLimpo;
    card.dataset.cartVolume = volume;
    card.innerHTML = `
      <span class="card-cart-counter" aria-hidden="true"></span>
      <img src="${cerveja.imagem}" alt="${cerveja.nome}">
      <h2>${cerveja.nome}</h2>
      <p class="abv-ibu">${cerveja.abv ? `ABV: ${cerveja.abv}` : ""} ${
        cerveja.ibu ? `IBU: ${cerveja.ibu}` : ""
      }</p>
      <p class="tamanho">${volume}</p>
      <p class="valor"><strong>R$ ${
        cerveja.preco ? cerveja.preco.toFixed(2).replace(".", ",") : "00,00"
      }</strong></p>
      <button class="botao-add-carrinho">Adicionar ao carrinho</button>
    `;

    const botao = card.querySelector(".botao-add-carrinho");
    botao.addEventListener("click", () => {
      if (window.adicionarAoCarrinho) {
        window.adicionarAoCarrinho(nomeLimpo, cerveja.preco, volume);
      } else {
        console.warn("Função adicionarAoCarrinho não encontrada");
      }
    });

    lista.appendChild(card);
  });

  updateProductCounters();
  spinner.classList.add("hidden");
}

carregarCervejas();
