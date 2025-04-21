document.addEventListener("DOMContentLoaded", () => {
  const contadorEl = document.getElementById("contador-itens");

  if (contadorEl) {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    let totalItens = 0;

    if (carrinhoSalvo) {
      const carrinho = JSON.parse(carrinhoSalvo);
      totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    }

    contadorEl.textContent = totalItens;
  }
});
