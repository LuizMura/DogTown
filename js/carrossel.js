// ---------------------------------------------------------------carrossel-cerveja-----------------------------------------------------

const track = document.getElementById("carouselTrack");
const items = track.children;
const itemCount = items.length;
let current = 2;

function update() {
  Array.from(items).forEach((el, idx) => {
    el.classList.toggle("active", idx === current);
  });

  const itemWidth = items[0].offsetWidth;
  track.style.transform = `translateX(-${itemWidth * (current - 3)}px)`;
}

function next() {
  current++;
  if (current >= itemCount - 6) {
    current = 3;
    track.appendChild(track.firstElementChild);
  }
  update();
}

function prev() {
  current--;
  if (current <= 0) {
    current = 1;
    track.prepend(track.lastElementChild);
  }
  update();
}

document.querySelector(".next").addEventListener("click", next);
document.querySelector(".prev").addEventListener("click", prev);

window.addEventListener("load", update);
setInterval(next, 3000);

let startX = 0;
let endX = 0;

track.addEventListener(
  "touchstart",
  (e) => {
    startX = e.touches[0].clientX;
  },
  { passive: true }
);

track.addEventListener(
  "touchmove",
  (e) => {
    endX = e.touches[0].clientX;
  },
  { passive: true }
);

track.addEventListener("touchend", () => {
  const threshold = 50; // Sensibilidade do swipe

  if (startX - endX > threshold) {
    next(); // arrastou pra esquerda
  } else if (endX - startX > threshold) {
    prev(); // arrastou pra direita
  }

  // reseta
  startX = 0;
  endX = 0;
});
