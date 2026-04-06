(function renderSiteFooter() {
  const mountPoint = document.querySelector("[data-site-footer]");
  if (!mountPoint) return;

  mountPoint.innerHTML = `
    <footer class="footer">
      <div class="redes-sociais">
        <p>MÍDIAS SOCIAIS</p>
        <div class="rede">
          <a class="instagram" href="https://www.instagram.com/dogtownbrewrp/" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-instagram"></i>
          </a>
          <a class="facebook" href="https://wa.me/+5516997698989" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
        </div>
      </div>

      <div class="footer-info">
        <p>CONTATO</p>
        <p>(16) 99769-8989</p>
        <p>cervejariadogtown@gmail.com</p>
        <p>Ribeirão Preto-SP</p>
      </div>

      <div class="developer">
        <p>DESENVOLVIDO <br />POR:</p>
        <a href="https://github.com/LuizMura" target="_blank" rel="noopener noreferrer">
          <img src="img/index/luiz.png" alt="Desenvolvedor Luiz Mura" />
        </a>
      </div>
    </footer>

    <div class="footer-logo">
      <img src="img/index/footer.png" alt="" />
    </div>

    <div class="footer-mobile">
      <img src="img/index/footer-mobile.png" alt="" />
    </div>
  `;
})();
