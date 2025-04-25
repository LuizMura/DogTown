// ------------------------- CARRINHO DE COMPRAS -------------------------

const botoesAdicionar = document.querySelectorAll(".add");
const carrinhoItens = document.getElementById("carrinho-itens");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const finalizarBtn = document.querySelector(".btn");

let carrinho = [];

const carrinhoSalvo = localStorage.getItem("carrinho");
if (carrinhoSalvo) {
  carrinho = JSON.parse(carrinhoSalvo);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  carrinhoItens.innerHTML = "";
  let subtotal = 0;

  carrinho.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("item-carrinho");
    const precoTotal = item.preco * item.quantidade;
    subtotal += precoTotal;

    div.innerHTML = `
      <span class="nome">${item.nome} <small class="volume">(${item.volume})</small></span>
      <div class="quantidade-container">
        <button class="menos" data-index="${index}">-</button>
        <span class="quantidade">${item.quantidade}</span>
        <button class="mais" data-index="${index}">+</button>
      </div>
      <span class="preco">R$ ${precoTotal.toFixed(2)}</span>
      <button class="remover" data-index="${index}">X</button>
    `;

    carrinhoItens.appendChild(div);
  });

  let frete = subtotal > 0 && subtotal <= 99 ? 15 : 0;
  const total = subtotal + frete;

  subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  totalEl.textContent = `R$ ${total.toFixed(2)}`;

  const freteEl = document.getElementById("frete");
  if (freteEl) freteEl.textContent = frete === 0 ? "Grátis" : `R$ ${frete.toFixed(2)}`;

  const contadorEl = document.getElementById("contador-itens");
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  if (contadorEl) contadorEl.textContent = totalItens;

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function adicionarAoCarrinho(nome, preco, volume) {
  const itemExistente = carrinho.find(item => item.nome === nome && item.volume === volume);
  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({ nome, preco, volume, quantidade: 1 });
  }
  atualizarCarrinho();
}

botoesAdicionar.forEach(botao => {
  botao.addEventListener("click", () => {
    const card = botao.closest(".cerveja-card");
    const nome = card.querySelector("h3").textContent.replace("DogTown - ", "");
    const precoTexto = card.querySelector(".price").textContent.replace("R$", "").replace(",", ".");
    const preco = parseFloat(precoTexto);
    const volume = card.querySelector("p").textContent;

    adicionarAoCarrinho(nome, preco, volume);
  });
});

carrinhoItens.addEventListener("click", e => {
  const index = parseInt(e.target.dataset.index);

  if (e.target.classList.contains("remover")) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
  }

  if (e.target.classList.contains("mais")) {
    carrinho[index].quantidade++;
    atualizarCarrinho();
  }

  if (e.target.classList.contains("menos")) {
    carrinho[index].quantidade = Math.max(1, carrinho[index].quantidade - 1);
    atualizarCarrinho();
  }
});
