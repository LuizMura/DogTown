AOS.init();

// ------------------------- MENU MOBILE -------------------------

class MobileNavbar {
  constructor(mobileMenu, navList, navLinks) {
    this.mobileMenu = document.querySelector(mobileMenu);
    this.navList = document.querySelector(navList);
    this.navLinks = document.querySelectorAll(navLinks);
    this.activeClass = "active";

    this.handleClick = this.handleClick.bind(this);
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
    e.stopPropagation(); // Evita conflito com clique fora
    this.navList.classList.toggle(this.activeClass);
    this.mobileMenu.classList.toggle(this.activeClass);
    this.animateLinks();
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

// // ------------------------- HEADER FIXO -------------------------

// let lastScrollTop = 0;
// const container = document.getElementById("container");

// window.addEventListener("scroll", () => {
//   const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
//   if (currentScroll > lastScrollTop) {
//     container.style.top = "-350px";
//   } else {
//     container.style.top = "0";
//   }
//   lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
// });
