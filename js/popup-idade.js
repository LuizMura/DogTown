document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("popup-idade");
  const btnSim = document.getElementById("btn-sim");
  const btnNao = document.getElementById("btn-nao");

  // Verifica se o usuário já confirmou a idade
  if (localStorage.getItem("idadeConfirmada") === "sim") {
    popup.style.display = "none"; // Se já confirmou, esconde o popup
  } else {
    popup.style.display = "flex"; // Se não confirmou, mostra o popup
  }

  btnSim.addEventListener("click", function () {
    localStorage.setItem("idadeConfirmada", "sim"); // Salva confirmação
    popup.style.display = "none"; // Esconde o popup
  });

  btnNao.addEventListener("click", function () {
    window.location.href = "https://www.google.com"; // Redireciona
  });
});
