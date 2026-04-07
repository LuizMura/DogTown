// ---------------------------------------------------------------carrossel-cerveja-----------------------------------------------------

(function setupBeerCarousel() {
  const track = document.getElementById("carouselTrack");
  const prevButton = document.querySelector(".nav.prev");
  const nextButton = document.querySelector(".nav.next");
  const styleEl = document.getElementById("beerShowcaseStyle");
  const nameEl = document.getElementById("beerShowcaseName");
  const descriptionEl = document.getElementById("beerShowcaseDescription");
  const abvEl = document.getElementById("beerShowcaseAbv");
  const ibuEl = document.getElementById("beerShowcaseIbu");
  const bodyEl = document.getElementById("beerShowcaseBody");
  const bitternessEl = document.getElementById("beerShowcaseBitterness");
  const aromaEl = document.getElementById("beerShowcaseAroma");
  const pairingEl = document.getElementById("beerShowcasePairing");

  if (!track || !prevButton || !nextButton) {
    return;
  }

  const originals = Array.from(track.querySelectorAll(".carousel-item"));
  if (originals.length < 2) {
    return;
  }

  const CLONE_COUNT = Math.min(2, originals.length);
  const AUTO_PLAY_MS = 3000;
  const BEER_DATA = {
    lager: {
      style: "LAGER",
      name: "DogTown Lager",
      description:
        "Leve e refrescante, feita para beber sem pressa e repetir sem culpa.",
      abv: "4.5%",
      ibu: "11",
      body: 35,
      bitterness: 25,
      aroma: 40,
      pairing:
        "Harmoniza com: petiscos leves, frango grelhado e queijos suaves.",
    },
    apa: {
      style: "APA",
      name: "DogTown APA",
      description: "Cítrica e equilibrada, com final seco e drinkability alta.",
      abv: "5.0%",
      ibu: "39",
      body: 55,
      bitterness: 62,
      aroma: 70,
      pairing: "Harmoniza com: hambúrguer, tacos e frituras crocantes.",
    },
    ipa: {
      style: "IPA",
      name: "DogTown IPA",
      description:
        "Mais intensa no lúpulo, aroma marcante e amargor protagonista.",
      abv: "6.2%",
      ibu: "53",
      body: 68,
      bitterness: 88,
      aroma: 86,
      pairing: "Harmoniza com: churrasco, comida apimentada e cheddar curado.",
    },
    bitter: {
      style: "BITTER",
      name: "DogTown Bitter",
      description: "Tostada e balanceada, com pegada inglesa e final seco.",
      abv: "4.6%",
      ibu: "36",
      body: 58,
      bitterness: 60,
      aroma: 52,
      pairing:
        "Harmoniza com: linguica artesanal, torresmo e pratos de boteco.",
    },
    porter: {
      style: "PORTER",
      name: "DogTown Porter",
      description: "Escura e macia, notas de malte tostado, chocolate e café.",
      abv: "4.7%",
      ibu: "28",
      body: 70,
      bitterness: 44,
      aroma: 66,
      pairing:
        "Harmoniza com: carnes assadas, burger defumado e sobremesas de chocolate.",
    },
  };
  let currentIndex = CLONE_COUNT;
  let autoPlayId = null;
  let startX = 0;
  let endX = 0;

  function cloneItem(item) {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  originals
    .slice(-CLONE_COUNT)
    .reverse()
    .forEach((item) => {
      track.prepend(cloneItem(item));
    });

  originals.slice(0, CLONE_COUNT).forEach((item) => {
    track.appendChild(cloneItem(item));
  });

  function getStep() {
    const firstItem = track.querySelector(".carousel-item");
    if (!firstItem) return 0;
    return firstItem.offsetWidth;
  }

  function updateActiveItem() {
    Array.from(track.children).forEach((item, idx) => {
      item.classList.toggle("active", idx === currentIndex);
    });

    updateShowcase();
  }

  function updateShowcase() {
    if (
      !styleEl ||
      !nameEl ||
      !descriptionEl ||
      !abvEl ||
      !ibuEl ||
      !bodyEl ||
      !bitternessEl ||
      !aromaEl ||
      !pairingEl
    ) {
      return;
    }

    const activeItem = track.children[currentIndex];
    const key = activeItem?.dataset?.beer;
    const beer = BEER_DATA[key] || BEER_DATA.lager;

    styleEl.textContent = beer.style;
    nameEl.textContent = beer.name;
    descriptionEl.textContent = beer.description;
    abvEl.textContent = beer.abv;
    ibuEl.textContent = beer.ibu;
    bodyEl.style.width = `${beer.body}%`;
    bitternessEl.style.width = `${beer.bitterness}%`;
    aromaEl.style.width = `${beer.aroma}%`;
    pairingEl.textContent = beer.pairing;
  }

  function render(options = {}) {
    const { immediate = false } = options;
    const step = getStep();
    if (!step) return;

    const containerWidth = track.parentElement.clientWidth;
    const offset = containerWidth / 2 - step / 2 - currentIndex * step;

    track.style.transition = immediate ? "none" : "transform 0.55s ease";
    track.style.transform = `translateX(${offset}px)`;
    updateActiveItem();
  }

  function goNext() {
    currentIndex += 1;
    render();
  }

  function goPrev() {
    currentIndex -= 1;
    render();
  }

  function normalizeLoopPosition() {
    const minIndex = CLONE_COUNT;
    const maxIndex = CLONE_COUNT + originals.length - 1;
    let shouldJump = false;

    if (currentIndex > maxIndex) {
      currentIndex = minIndex;
      shouldJump = true;
    } else if (currentIndex < minIndex) {
      currentIndex = maxIndex;
      shouldJump = true;
    }

    if (shouldJump) {
      render({ immediate: true });
      requestAnimationFrame(() => {
        track.style.transition = "transform 0.55s ease";
      });
    }
  }

  function stopAutoPlay() {
    if (autoPlayId) {
      window.clearInterval(autoPlayId);
      autoPlayId = null;
    }
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayId = window.setInterval(goNext, AUTO_PLAY_MS);
  }

  prevButton.addEventListener("click", () => {
    goPrev();
    startAutoPlay();
  });

  nextButton.addEventListener("click", () => {
    goNext();
    startAutoPlay();
  });

  track.addEventListener("transitionend", normalizeLoopPosition);

  track.addEventListener(
    "touchstart",
    (event) => {
      startX = event.touches[0].clientX;
      endX = startX;
      stopAutoPlay();
    },
    { passive: true },
  );

  track.addEventListener(
    "touchmove",
    (event) => {
      endX = event.touches[0].clientX;
    },
    { passive: true },
  );

  track.addEventListener("touchend", () => {
    const threshold = 50;
    if (startX - endX > threshold) {
      goNext();
    } else if (endX - startX > threshold) {
      goPrev();
    }

    startX = 0;
    endX = 0;
    startAutoPlay();
  });

  window.addEventListener("resize", () => {
    render({ immediate: true });
  });

  window.addEventListener("load", () => {
    render({ immediate: true });
    startAutoPlay();
  });
})();
