(function () {
  'use strict';

  // ==================== STAGGERED TILE ENTRY ====================
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach(function (tile, i) {
    tile.style.animationDelay = (i * 30) + 'ms';
  });

  // ==================== TILE FLIP ====================
  window.flipTile = function (tile) {
    tile.classList.toggle('flipped');
  };

  // ==================== CUSTOM CURSOR ====================
  const cursorDot = document.getElementById('cursorDot');
  let cursorX = -100, cursorY = -100;
  let dotX = -100, dotY = -100;

  document.addEventListener('mousemove', function (e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
  });

  document.addEventListener('mouseleave', function () {
    cursorDot.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    cursorDot.style.opacity = '1';
  });

  function animateCursor() {
    dotX = cursorX;
    dotY = cursorY;
    cursorDot.style.transform = 'translate(' + dotX + 'px, ' + dotY + 'px)';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  tiles.forEach(function (tile) {
    tile.addEventListener('mouseenter', function () {
      cursorDot.classList.add('expanded');
    });
    tile.addEventListener('mouseleave', function () {
      cursorDot.classList.remove('expanded');
    });
  });

  // ==================== SPOTLIGHT / BRIGHTNESS RIPPLE ====================
  var tileGrid = document.getElementById('tileGrid');

  if (tileGrid) {
    tileGrid.addEventListener('mousemove', function (e) {
      var gridRect = tileGrid.getBoundingClientRect();

      tiles.forEach(function (tile) {
        var rect = tile.getBoundingClientRect();
        var tileCenterX = rect.left + rect.width / 2;
        var tileCenterY = rect.top + rect.height / 2;
        var dx = e.clientX - tileCenterX;
        var dy = e.clientY - tileCenterY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = Math.max(gridRect.width, gridRect.height) * 0.5;
        var norm = Math.min(dist / maxDist, 1);
        var brightness = 1.2 - (norm * 0.5);
        tile.style.filter = 'brightness(' + brightness.toFixed(2) + ')';
      });
    });

    tileGrid.addEventListener('mouseleave', function () {
      tiles.forEach(function (tile) {
        tile.style.filter = 'brightness(0.85)';
      });
    });
  }

  // ==================== PAGE TRANSITIONS ====================
  var navLinks = document.querySelectorAll('.nav-link-transition');
  var pageWrapper = document.getElementById('pageWrapper');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto')) return;
      e.preventDefault();
      pageWrapper.classList.add('fade-out');
      setTimeout(function () {
        window.location.href = href;
      }, 200);
    });
  });

  // Fade in on page load
  window.addEventListener('pageshow', function () {
    pageWrapper.classList.remove('fade-out');
  });

  // ==================== 3D COURSE CAROUSEL ====================
  var carousel = document.getElementById('courseCarousel');
  if (carousel) {
    var cards = carousel.querySelectorAll('.carousel-card');
    var total = cards.length;
    var currentIndex = 0;
    var theta = 360 / total;
    var radius = Math.round((260 / 2) / Math.tan(Math.PI / total));

    cards.forEach(function (card, i) {
      var angle = theta * i;
      card.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
    });

    function rotateCarousel() {
      var angle = -theta * currentIndex;
      carousel.style.transform = 'translateZ(-' + radius + 'px) rotateY(' + angle + 'deg)';
      cards.forEach(function (card, i) {
        card.classList.toggle('active', i === currentIndex);
      });
      var indicator = document.getElementById('carouselCurrent');
      if (indicator) {
        indicator.textContent = String(currentIndex + 1).padStart(2, '0');
      }
    }

    var totalEl = document.getElementById('carouselTotal');
    if (totalEl) totalEl.textContent = String(total).padStart(2, '0');

    rotateCarousel();

    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + total) % total;
        rotateCarousel();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % total;
        rotateCarousel();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        currentIndex = (currentIndex - 1 + total) % total;
        rotateCarousel();
      } else if (e.key === 'ArrowRight') {
        currentIndex = (currentIndex + 1) % total;
        rotateCarousel();
      }
    });
  }
})();
