AOS.init();

// ------------------------- MENU MOBILE -------------------------

class MobileNavbar {
  constructor(mobileMenu, navList, navLinks) {
    this.mobileMenu = document.querySelector(mobileMenu);
    this.navList = document.querySelector(navList);
    this.navLinks = document.querySelectorAll(navLinks);
    this.activeClass = "active";

    this.handleClick = this.handleClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  animateLinks() {
    this.navLinks.forEach((link, index) => {
      link.style.animation
        ? (link.style.animation = "")
        : (link.style.animation = `navLinkFade 0.5s ease forwards ${
            index / 7 + 0.3
          }s`);
    });
  }

  handleClick(e) {
    e.stopPropagation(); // evita disparo no documento
    this.navList.classList.toggle(this.activeClass);
    this.mobileMenu.classList.toggle(this.activeClass);
    this.animateLinks();

    // 👉 quando abrir, escuta clique/touch fora
    if (this.navList.classList.contains(this.activeClass)) {
      document.addEventListener("click", this.handleOutsideClick);
      document.addEventListener("touchstart", this.handleOutsideClick);
    } else {
      document.removeEventListener("click", this.handleOutsideClick);
      document.removeEventListener("touchstart", this.handleOutsideClick);
    }
  }

  handleOutsideClick(e) {
    // fecha se o clique NÃO for no menu nem no botão
    if (
      !this.navList.contains(e.target) &&
      !this.mobileMenu.contains(e.target)
    ) {
      this.navList.classList.remove(this.activeClass);
      this.mobileMenu.classList.remove(this.activeClass);
      this.navLinks.forEach((link) => (link.style.animation = "")); // limpa animação
      document.removeEventListener("click", this.handleOutsideClick);
      document.removeEventListener("touchstart", this.handleOutsideClick);
    }
  }

  addClickEvent() {
    this.mobileMenu.addEventListener("click", this.handleClick);
  }

  init() {
    if (this.mobileMenu) {
      this.addClickEvent();
    }
    return this;
  }
}

const mobileNavbar = new MobileNavbar(
  ".mobile-menu",
  ".nav-list",
  ".nav-list li"
);
mobileNavbar.init();

// ------------------------- ATIVAR LINK DE MENU -------------------------

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-list a");
  const contadorEl = document.getElementById("contador-itens");

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

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

// ---------------------------------navibar hiddem-----------------------------
let lastScroll = 0;
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  const currentScroll =
    window.pageYOffset || document.documentElement.scrollTop;

  if (currentScroll > lastScroll) {
    // Scrolando para baixo → esconde
    navbar.classList.add("hidden");
  } else {
    // Scrolando para cima → mostra
    navbar.classList.remove("hidden");
  }

  lastScroll = currentScroll <= 0 ? 0 : currentScroll; // evita valores negativos
});
