/* 시너지스 (SynerSI) — interactions
   - 헤더 스크롤 상태
   - 모바일 메뉴
   - 스크롤 등장(reveal)
   - FAQ 한 번에 하나 열기
   - 현재 연도
*/
(function () {
  "use strict";

  var doc = document;
  var header = doc.getElementById("header");
  var toggle = doc.querySelector(".menu-toggle");
  var mobileNav = doc.getElementById("mobileNav");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header ---------- */
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  function setMenu(open) {
    if (!mobileNav || !toggle) return;
    mobileNav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    doc.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!mobileNav.classList.contains("is-open"));
    });
  }

  if (mobileNav) {
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  doc.addEventListener("click", function (e) {
    if (!mobileNav || !mobileNav.classList.contains("is-open")) return;
    if (mobileNav.contains(e.target) || (toggle && toggle.contains(e.target))) return;
    setMenu(false);
  });

  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1080) setMenu(false);
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- FAQ: 하나만 열기 ---------- */
  var faqItems = Array.prototype.slice.call(doc.querySelectorAll(".faq details"));
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item && other.open) other.open = false;
      });
    });
  });

  /* ---------- footer year ---------- */
  var yearEl = doc.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
