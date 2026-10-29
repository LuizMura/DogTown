import {initializeApp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ======================================================
// CONFIGURAÇÃO FIREBASE
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyD1lY9XI-Np8r8Kk9I1QMo-_V537SXlOUM",
  authDomain: "dogtown-f3603.firebaseapp.com",
  projectId: "dogtown-f3603",
  storageBucket: "dogtown-f3603.appspot.com",
  messagingSenderId: "153818184475",
  appId: "1:153818184475:web:892e41f0d576c5d16931be",
  measurementId: "G-ZEPXV9VTFE",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ======================================================
// DISPONIBILIDADE DOS PRODUTOS
// ======================================================

function produtoEstaDisponivel(produto) {
  // Produtos antigos, sem o campo "disponivel",
  // continuam disponíveis por padrão.
  //
  // Somente produtos explicitamente desativados
  // no painel administrativo ficam indisponíveis.
  return produto.disponivel !== false;
}

// ======================================================
// CARRINHO
// ======================================================

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
  } catch (error) {
    console.warn("Não foi possível ler o carrinho:", error);
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

    if (!counter) return;

    if (card.classList.contains("is-indisponivel")) {
      counter.textContent = "";
      counter.classList.remove("is-visible");
      return;
    }

    const quantidade = countersByProduct[key] || 0;

    counter.textContent = quantidade > 0 ? String(quantidade) : "";

    counter.classList.toggle("is-visible", quantidade > 0);
  });
}

window.addEventListener("dogtown-cart-updated", updateProductCounters);

// ======================================================
// FORMATAÇÃO DE PREÇO
// ======================================================

function formatarPreco(preco) {
  const valor = Number(preco);

  if (!Number.isFinite(valor)) {
    return "00,00";
  }

  return valor.toFixed(2).replace(".", ",");
}

// ======================================================
// CRIAÇÃO DE ELEMENTOS
// ======================================================

function criarElemento(tag, classe, texto = "") {
  const elemento = document.createElement(tag);

  if (classe) {
    elemento.className = classe;
  }

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

// ======================================================
// CRIAÇÃO DOS CARDS DOS PRODUTOS
// ======================================================

function criarCardProduto(cerveja) {
  const nomeOriginal = String(cerveja.nome || "");

  const nomeLimpo = nomeOriginal.replace(/^Dogtown\s*-\s*/i, "").trim();

  const volume = String(cerveja.tamanho || "");
  const preco = Number(cerveja.preco || 0);
  const disponivel = produtoEstaDisponivel(cerveja);

  // Card principal.
  const card = criarElemento("div", "card-cerveja");

  card.dataset.cartName = nomeLimpo;
  card.dataset.cartVolume = volume;

  if (!disponivel) {
    card.classList.add("is-indisponivel");
  }

  // Contador do carrinho.
  const contador = criarElemento("span", "card-cart-counter");

  contador.setAttribute("aria-hidden", "true");
  card.appendChild(contador);

  // Área da imagem.
  const areaImagem = criarElemento("div", "card-imagem-wrap");

  const imagem = document.createElement("img");

  imagem.src = String(cerveja.imagem || "");
  imagem.alt = nomeOriginal || "Produto DogTown Brew";
  imagem.loading = "lazy";

  areaImagem.appendChild(imagem);

  // Película de indisponibilidade.
  if (!disponivel) {
    const pelicula = criarElemento("div", "pelicula-indisponivel");

    pelicula.setAttribute("aria-hidden", "true");

    const selo = criarElemento("span", "selo-indisponivel", "INDISPONÍVEL");

    pelicula.appendChild(selo);
    areaImagem.appendChild(pelicula);
  }

  card.appendChild(areaImagem);

  // Nome.
  const titulo = criarElemento("h2", "", nomeOriginal);

  card.appendChild(titulo);

  // ABV e IBU.
  const informacoes = [];

  if (cerveja.abv !== undefined && cerveja.abv !== null && cerveja.abv !== "") {
    informacoes.push(`ABV: ${cerveja.abv}`);
  }

  if (cerveja.ibu !== undefined && cerveja.ibu !== null && cerveja.ibu !== "") {
    informacoes.push(`IBU: ${cerveja.ibu}`);
  }

  const abvIbu = criarElemento("p", "abv-ibu", informacoes.join(" "));

  card.appendChild(abvIbu);

  // Tamanho.
  const tamanho = criarElemento("p", "tamanho", volume);

  card.appendChild(tamanho);

  // Preço.
  const paragrafoPreco = criarElemento("p", "valor");

  const precoTexto = criarElemento("strong", "", `R$ ${formatarPreco(preco)}`);

  paragrafoPreco.appendChild(precoTexto);
  card.appendChild(paragrafoPreco);

  // Botão de compra.
  const botao = criarElemento(
    "button",
    "botao-add-carrinho",
    disponivel ? "Adicionar ao carrinho" : "Indisponível",
  );

  botao.type = "button";

  if (!disponivel) {
    botao.disabled = true;
    botao.setAttribute("aria-disabled", "true");
    botao.title = "Este produto não está disponível para compra.";
  }

  botao.addEventListener("click", () => {
    // Não permite adicionar produtos indisponíveis.
    if (!produtoEstaDisponivel(cerveja)) {
      return;
    }

    if (typeof window.adicionarAoCarrinho === "function") {
      window.adicionarAoCarrinho(nomeLimpo, preco, volume);
    } else {
      console.warn("Função adicionarAoCarrinho não encontrada.");
    }
  });

  card.appendChild(botao);

  return card;
}

// ======================================================
// CARREGAMENTO DOS PRODUTOS
// ======================================================

async function carregarCervejas() {
  const lista = document.getElementById("lista-cervejas");
  const spinner = document.getElementById("spinner");

  if (!lista) {
    console.error('Elemento com id "lista-cervejas" não encontrado.');
    return;
  }

  if (spinner) {
    spinner.classList.remove("hidden");
  }

  try {
    const snapshot = await getDocs(collection(db, "produtos"));

    const cervejas = [];

    snapshot.forEach((docSnap) => {
      cervejas.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });

    // Ordenação:
    // 1. Disponíveis primeiro (disponivel !== false)
    // 2. Mantém a ordenação numérica (ordem) definida no painel.
    cervejas.sort((a, b) => {
      const dispA = a.disponivel !== false ? 1 : 0;
      const dispB = b.disponivel !== false ? 1 : 0;

      if (dispA !== dispB) {
        return dispB - dispA; // 1 (disponível) vem antes de 0 (indisponível)
      }

      return (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
    });

    lista.replaceChildren();

    cervejas.forEach((cerveja) => {
      const card = criarCardProduto(cerveja);
      lista.appendChild(card);
    });

    updateProductCounters();
  } catch (error) {
    console.error("Erro ao carregar os produtos da DogTown Brew:", error);

    lista.textContent =
      "Não foi possível carregar os produtos. Tente novamente mais tarde.";
  } finally {
    if (spinner) {
      spinner.classList.add("hidden");
    }
  }
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

carregarCervejas();
