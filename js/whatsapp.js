document.addEventListener("DOMContentLoaded", () => {
    const finalizarBtn = document.getElementById("finalizarPedido");
    const promptCliente = document.getElementById("promptCliente");
    const cancelarPrompt = document.getElementById("cancelarPrompt");
    const enviarPedido = document.getElementById("enviarPedido");
  
    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  
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
  
      if (!nome || !telefone || !endereco ) {
        alert("Por favor, preencha nome, email, telefone e endereço.");
        return;
      }
  
      const { subtotal, frete, total } = calcularTotais();
  
      let msg = "*🍺 Pedido DogTown Brew*\n\n";
      msg += `👤 *Nome:* ${nome}\n📧 *Email:* ${email}\n📞 *Telefone:* ${telefone}\n🏠 *Endereço:* ${endereco}\n\n`;

      carrinho.forEach(item => {
        msg += `• ${item.nome} (${item.volume}) - ${item.quantidade}x - R$ ${item.preco.toFixed(2)}\n`;
      });
  
      msg += `\n*Subtotal:* R$ ${subtotal.toFixed(2)}`;
      msg += `\n*Frete:* ${frete === 0 ? "Grátis" : `R$ ${frete.toFixed(2)}`}`;
      msg += `\n*Total:* R$ ${total.toFixed(2)}\n\n`;
      
  
      const numero = "5516997698989"; // coloque seu número com DDD
      const link = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  
      promptCliente.classList.add("hidden");
      window.open(link, "_blank");
  
      // Limpa carrinho após envio (opcional)
      localStorage.removeItem("carrinho");
      carrinho = [];
    });
  });
  