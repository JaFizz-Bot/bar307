(function () {
  var STORAGE_KEY = "bar307-lang";
  var toggle = document.getElementById("lang-toggle");
  var opts = toggle.querySelectorAll(".lang-opt");

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-en][data-th]").forEach(function (el) {
      el.textContent = lang === "th" ? el.dataset.th : el.dataset.en;
    });
    opts.forEach(function (opt) {
      opt.classList.toggle("is-active", opt.dataset.lang === lang);
    });
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle.addEventListener("click", function () {
    var current = document.documentElement.lang === "th" ? "th" : "en";
    applyLang(current === "th" ? "en" : "th");
  });

  applyLang(localStorage.getItem(STORAGE_KEY) || "en");

  // Lightbox voor de fotogalerij
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");

  document.querySelectorAll("[data-lightbox] img").forEach(function (img) {
    img.addEventListener("click", function () {
      if (img.classList.contains("is-missing")) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.hidden = false;
    });
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.classList.contains("lightbox-close")) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });
})();
