(function () {
  "use strict";

  const popupItems = {
    lager: {
      nome: "Dogtown – Lager",
      kicker: "Estilo: Lager",
      badgePrimary: "ABV 4,5%",
      badgeSecondary: "IBU 11",
      img: "img/cervejas/breja-lager.png",
      descricao:
        "Perfil leve, refrescante e extremamente fácil de beber. Uma cerveja equilibrada, com baixo amargor e perfil limpo, ideal para qualquer ocasião, do happy hour ao churrasco com amigos, perfeita para quem busca refrescância sem abrir mão da qualidade artesanal.",
    },
    apa: {
      nome: "Dogtown – APA (American Pale Ale)",
      kicker: "Estilo: APA",
      badgePrimary: "ABV 5,0%",
      badgeSecondary: "IBU 39",
      img: "img/cervejas/breja-apa.png",
      descricao:
        "Equilíbrio entre malte e lúpulo em uma cerveja aromática e saborosa. A APA Dogtown Brew possui corpo médio, aroma agradável e final suave, sendo uma excelente porta de entrada para estilos mais lupulados.",
    },
    ipa: {
      nome: "Dogtown – IPA (India Pale Ale)",
      kicker: "Estilo: IPA",
      badgePrimary: "ABV 6,2%",
      badgeSecondary: "IBU 53",
      img: "img/cervejas/breja-ipa.png",
      descricao:
        "A IPA da Dogtown Brew é marcada por aromas tropicais resultado de uma combinação certeira de lúpulos que trazem uma experiência nova de sabores, deixando o amargor como um ótimo coadjuvante e elevando o drinkhability, sem sobrecarregar o paladar. Oferece uma experiência robusta e cheia de personalidade.",
    },
    porter: {
      nome: "Dogtown – Porter",
      kicker: "Estilo: Porter",
      badgePrimary: "ABV 4,7%",
      badgeSecondary: "IBU 29",
      img: "img/cervejas/breja-porter.png",
      descricao:
        "Cerveja inspirada na clássica receita inglesa, elaborada com maltes e lúpulos nobres, com um toque de chocolate, caracterizado pela adição de Nibis de Cacau (a forma mais pura e menos processada do chocolate), que proporciona uma experiência complexa, mas sempre equilibrada. Elegante e saborosa, sendo ideal para harmonizações.",
    },
    bitter: {
      nome: "Dogtown – Bitter",
      kicker: "Estilo: Bitter",
      badgePrimary: "ABV 4,6%",
      badgeSecondary: "IBU 36",
      img: "img/cervejas/breja-bitter.png",
      descricao:
        "A Bitter da Dogtown Brew é mais uma leitura da escola inglesa, elaborada com os maltes e lúpulos clássicos do estilo, tendo como foco o equilíbrio entre os aromas e sabores. Nesta cerveja, o dulçor do malte, o amargo do lúpulo e os ésteres de fermentação dividem o protagonismo trazendo novas sensações e experiências a cada gole.",
    },
    "barril-10": {
      nome: "Barril de 10 litros",
      kicker: "Capacidade: 10 litros",
      badgePrimary: "Ideal para 3 a 5 pessoas",
      badgeSecondary: "Base: 2 a 3 L/pessoa em 5h",
      img: "img/chope/barril-10.png",
      descricao:
        "Uma boa escolha para encontros menores, aniversários em casa ou churrascos intimistas. Considerando consumo médio de 2 a 3 litros por pessoa em 5 horas, o barril de 10 litros atende aproximadamente de 3 a 5 pessoas.",
    },
    "barril-20": {
      nome: "Barril de 20 litros",
      kicker: "Capacidade: 20 litros",
      badgePrimary: "Ideal para 7 a 10 pessoas",
      badgeSecondary: "Base: 2 a 3 L/pessoa em 5h",
      img: "img/chope/barril-20.png",
      descricao:
        "Indicado para eventos de porte médio, com boa circulação de convidados. Na base de 2 a 3 litros por pessoa durante 5 horas, o barril de 20 litros costuma servir aproximadamente de 7 a 10 pessoas.",
    },
    "barril-30": {
      nome: "Barril de 30 litros",
      kicker: "Capacidade: 30 litros",
      badgePrimary: "Ideal para 10 a 15 pessoas",
      badgeSecondary: "Base: 2 a 3 L/pessoa em 5h",
      img: "img/chope/barril-30.png",
      descricao:
        "Uma opção equilibrada para festas maiores e eventos corporativos. Considerando consumo de 2 a 3 litros por pessoa ao longo de 5 horas, o barril de 30 litros atende em média de 10 a 15 pessoas.",
    },
    "barril-50": {
      nome: "Barril de 50 litros",
      kicker: "Capacidade: 50 litros",
      badgePrimary: "Ideal para 17 a 25 pessoas",
      badgeSecondary: "Base: 2 a 3 L/pessoa em 5h",
      img: "img/chope/barril-50.png",
      descricao:
        "Pensado para eventos grandes e celebrações com consumo elevado. Com a referência de 2 a 3 litros por pessoa em 5 horas, o barril de 50 litros costuma atender aproximadamente de 17 a 25 pessoas.",
    },
  };

  // ── Build popup markup ──────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "cerveja-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Detalhes da cerveja");

  overlay.innerHTML = `
    <div id="cerveja-popup">
      <button id="cerveja-popup-close" aria-label="Fechar">&times;</button>
      <div id="cerveja-popup-inner">
        <div id="cerveja-popup-img-wrap">
          <img id="cerveja-popup-img" src="" alt="" />
        </div>
        <div id="cerveja-popup-info">
          <p id="cerveja-popup-kicker"></p>
          <h2 id="cerveja-popup-nome"></h2>
          <div id="cerveja-popup-badges">
            <span id="cerveja-popup-abv"></span>
            <span id="cerveja-popup-ibu"></span>
          </div>
          <p id="cerveja-popup-desc"></p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const popupImg = document.getElementById("cerveja-popup-img");
  const popupKicker = document.getElementById("cerveja-popup-kicker");
  const popupNome = document.getElementById("cerveja-popup-nome");
  const popupAbv = document.getElementById("cerveja-popup-abv");
  const popupIbu = document.getElementById("cerveja-popup-ibu");
  const popupDesc = document.getElementById("cerveja-popup-desc");

  // ── Open / close ────────────────────────────────────────────────────
  function openPopup(key) {
    const c = popupItems[key];
    if (!c) return;

    popupImg.src = c.img;
    popupImg.alt = c.nome;
    popupKicker.textContent = c.kicker;
    popupNome.textContent = c.nome;
    popupAbv.textContent = c.badgePrimary;
    popupIbu.textContent = c.badgeSecondary;
    popupDesc.textContent = c.descricao;

    overlay.classList.add("active");
    document.body.classList.add("popup-open");
  }

  function closePopup() {
    overlay.classList.remove("active");
    document.body.classList.remove("popup-open");
  }

  // Close on overlay click (outside card)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });

  document
    .getElementById("cerveja-popup-close")
    .addEventListener("click", closePopup);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
  });

  // ── Attach to carousel images ────────────────────────────────────────
  // Detects beer key from filename, e.g. "breja-ipa.png" → "ipa"
  document.querySelectorAll(".carousel-item img").forEach((img) => {
    const match = img.src.match(/breja-(\w+)\.png/);
    if (!match) return;
    const key = match[1];
    if (!popupItems[key]) return;

    const item = img.closest(".carousel-item");
    item.dataset.cerveja = key;
    item.style.cursor = "pointer";

    item.addEventListener("click", (e) => {
      e.preventDefault();
      openPopup(key);
    });
  });

  document.querySelectorAll("[data-beer-popup]").forEach((trigger) => {
    const key = String(trigger.dataset.beerPopup || "").toLowerCase();
    if (!popupItems[key]) return;

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openPopup(key);
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPopup(key);
      }
    });
  });

  // ── Global API (for use by beer cards on other pages) ───────────────
  window.dogtownOpenBeerPopup = openPopup;
})();
