// ============================================================
// Bento Theme — Main JavaScript
// ============================================================

(function () {
  'use strict';

  // -- Mobile nav toggle --
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.classList.toggle('is-active');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close on nav link click (mobile)
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('nav-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // -- Smooth scroll for anchor links --
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      var target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // -- Intersection observer for card entrance animation --
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var cards = document.querySelectorAll('.bento-card');
    if (cards.length > 0) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.style.animationPlayState = 'running';
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      cards.forEach(function (card) {
        card.style.animationPlayState = 'paused';
        observer.observe(card);
      });
    }
  }
})();
