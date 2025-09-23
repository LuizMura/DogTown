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
  measurementId: "G-8P2KKQ8CE7",
};

// 🔹 Inicializa Firebase e Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function carregarCervejas() {
  const lista = document.getElementById("lista-cervejas");
  const spinner = document.getElementById("spinner"); // 👈 pega spinner primeiro
  spinner.classList.remove("hidden"); // mostra spinner

  const snapshot = await getDocs(collection(db, "produtos"));

  const cervejas = [];
  snapshot.forEach((docSnap) => {
    cervejas.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Ordenar pela propriedade "ordem"
  cervejas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  lista.innerHTML = "";
  cervejas.forEach((cerveja) => {
    const card = document.createElement("div");
    card.classList.add("card-cerveja");
    card.innerHTML = `
      <img src="${cerveja.imagem}" alt="${cerveja.nome}">
      <h2>${cerveja.nome}</h2>
      <p class="abv-ibu">${cerveja.abv ? `ABV: ${cerveja.abv}` : ""} ${
      cerveja.ibu ? `IBU: ${cerveja.ibu}` : ""
    }</p>
      <p class="tamanho">${cerveja.tamanho || ""}</p>
      <p class="valor"><strong>R$ ${
        cerveja.preco ? cerveja.preco.toFixed(2).replace(".", ",") : "00,00"
      }</strong></p>
      <button class="botao-add-carrinho">Adicionar ao carrinho</button>
    `;

    const botao = card.querySelector(".botao-add-carrinho");
    botao.addEventListener("click", () => {
      if (window.adicionarAoCarrinho) {
        const nomeLimpo = cerveja.nome.replace(/^Dogtown\s*-\s*/i, "").trim();
        window.adicionarAoCarrinho(
          nomeLimpo,
          cerveja.preco,
          cerveja.tamanho || ""
        );
      } else {
        console.warn("Função adicionarAoCarrinho não encontrada");
      }
    });

    lista.appendChild(card);
  });

  spinner.classList.add("hidden"); // esconde spinner
}

carregarCervejas();
