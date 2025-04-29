// ------------------------- CARRINHO SLIDE -------------------------

const iconeCarrinho = document.getElementById('icone-carrinho');
const carrinhoAside = document.getElementById('carrinhoAside');

iconeCarrinho.addEventListener('click', (e) => {
  e.stopPropagation();
  carrinhoAside.classList.toggle('aberto');
});

carrinhoAside.addEventListener('click', (e) => {
  e.stopPropagation();
});

document.addEventListener('click', (e) => {
  const navList = document.querySelector(".nav-list");
  const mobileMenu = document.querySelector(".mobile-menu");

  if (!carrinhoAside.contains(e.target) && !iconeCarrinho.contains(e.target)) {
    carrinhoAside.classList.remove('aberto');
  }

  if (!navList.contains(e.target) && !mobileMenu.contains(e.target)) {
    navList.classList.remove('active');
    mobileMenu.classList.remove('active');
  }
});

// ------------------------- CARRINHO DE COMPRAS -------------------------

const botoesAdicionar = document.querySelectorAll(".add");
const carrinhoItens = document.getElementById("carrinho-itens");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const finalizarBtn = document.getElementById("finalizarPedido");

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
  mostrarCarrinhoPorTempo();
}

botoesAdicionar.forEach(botao => {
  botao.addEventListener("click", () => {
    const card = botao.closest(".cerveja-card");
    const nome = card.querySelector("h3").textContent.replace("DogTown - ", "");
    const precoTexto = card.querySelector(".price").textContent.replace("R$", "").replace(",", ".");
    const preco = parseFloat(precoTexto);
    const volume = card.querySelector(".volume").textContent;

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

// ------------------------- FINALIZAÇÃO -------------------------

document.addEventListener("DOMContentLoaded", () => {
  const promptCliente = document.getElementById("promptCliente");
  const cancelarPrompt = document.getElementById("cancelarPrompt");
  const enviarPedido = document.getElementById("enviarPedido");

  function calcularTotais() {
    const subtotal = carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
    const frete = subtotal > 0 && subtotal < 100 ? 15 : 0;
    const total = subtotal + frete;
    return { subtotal, frete, total };
  }

  finalizarBtn?.addEventListener("click", () => {
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }
    
    promptCliente.classList.remove("hidden");
  });

  cancelarPrompt?.addEventListener("click", () => {
    promptCliente.classList.add("hidden");
  });

  enviarPedido?.addEventListener("click", () => {
    const nome = document.getElementById("nomeCliente").value.trim();
    const email = document.getElementById("emailCliente").value.trim();
    const telefone = document.getElementById("telefoneCliente").value.trim();
    const endereco = document.getElementById("enderecoCliente").value.trim();
    const termos = document.getElementById("termos").checked;

    if (!nome || !telefone || !endereco) {
      alert("Por favor, preencha nome, email, telefone e endereço.");
      return;
    }
    if (!termos) {
      const termosEl = document.getElementById("termos");
      termosEl.classList.add("checkbox-invalido");
      alert("Você precisa declarar ter mais de 18 anos antes de enviar o pedido.");
      return;
    } else {
      document.getElementById("termos").classList.remove("checkbox-invalido");
    }
    const { subtotal, frete, total } = calcularTotais();

    let msg = "*🍺 Pedido DogTown Brew*\n\n";
    msg += `👤 *Nome:* ${nome}\n📧 *Email:* ${email}\n📞 *Telefone:* ${telefone}\n🏠 *Endereço:* ${endereco}\n🔞 ${termos ? "Maior de 18 anos" : "Não confirmado"}\n\n`;

    carrinho.forEach(item => {
      msg += `• ${item.nome} (${item.volume}) - ${item.quantidade}x - R$ ${item.preco.toFixed(2)}\n`;
    });

    msg += `\n*Subtotal:* R$ ${subtotal.toFixed(2)}`;
    msg += `\n*Frete:* ${frete === 0 ? "Grátis" : `R$ ${frete.toFixed(2)}`}`;
    msg += `\n*Total:* R$ ${total.toFixed(2)}\n\n`;

    const numero = "5516997698989";
    const link = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;

    promptCliente.classList.add("hidden");
    window.open(link, "_blank");

    localStorage.removeItem("carrinho");
    carrinho = [];
    atualizarCarrinho();
  });

  // function mostrarCarrinhoPorTempo(segundos = 3) {
  //   console.log("Mostrando carrinho por tempo..."); // Teste
  //   carrinhoAside.classList.add('aberto');
  
  //   clearTimeout(mostrarCarrinhoPorTempo.timeoutId);
  //   mostrarCarrinhoPorTempo.timeoutId = setTimeout(() => {
  //     carrinhoAside.classList.remove('aberto');
  //   }, segundos * 1000);
  // }
  
});
