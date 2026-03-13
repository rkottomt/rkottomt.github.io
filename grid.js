(function () {
  'use strict';

  // ==================== 5-PHASE TILE ENTRANCE ANIMATION ====================
  var tiles = document.querySelectorAll('.tile');
  var cols = 4;
  var tileGrid = document.getElementById('tileGrid');
  var canvas = document.getElementById('animCanvas');
  var progressFill = document.getElementById('animProgress');
  var replayBtn = document.getElementById('animReplay');

  function runTileAnimation() {
    if (!canvas || !tileGrid || tiles.length === 0) return;

    tiles.forEach(function (t) {
      t.classList.remove('tile-show', 'tile-ready', 'tile-glow');
      t.style.opacity = '0';
      t.style.transform = 'scale(0.7) translateY(10px)';
    });

    if (replayBtn) { replayBtn.classList.remove('visible'); }

    var wrapper = canvas.parentElement;
    var W = wrapper.offsetWidth;
    var H = wrapper.offsetHeight;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cx = W / 2;
    var cy = H / 2;
    var DURATION = 7000;

    var tileTargets = [];
    tiles.forEach(function (t) {
      var r = t.getBoundingClientRect();
      var wr = wrapper.getBoundingClientRect();
      tileTargets.push({
        x: r.left - wr.left + r.width / 2,
        y: r.top - wr.top + r.height / 2,
        w: r.width,
        h: r.height
      });
    });

    var particles = [];
    for (var i = 0; i < 16; i++) {
      var angle = (i / 16) * Math.PI * 2;
      var brightness = Math.round(80 + (i / 15) * 175);
      particles.push({
        idx: i,
        angle: angle,
        orbitR: 80 + (i % 4) * 30,
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.8 + Math.random() * 0.6),
        bri: brightness,
        x: cx, y: cy,
        snapX: 0, snapY: 0,
        trail: [],
        size: 3 + Math.random() * 2
      });
    }

    var shockwaves = [];
    var animId = null;
    var startTime = 0;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

    function draw(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / DURATION, 1);
      if (progressFill) progressFill.style.width = (progress * 100) + '%';

      ctx.clearRect(0, 0, W, H);

      // PHASE 1: Emergence (0–700ms)
      if (elapsed < 700) {
        var t1 = elapsed / 700;
        var e1 = easeOutCubic(t1);
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var dist = p.orbitR * e1;
          p.x = cx + Math.cos(p.angle) * dist;
          p.y = cy + Math.sin(p.angle) * dist;
          p.trail = [{x: p.x, y: p.y}];
        }
        // Neural network lines during emergence
        for (var i = 0; i < particles.length; i++) {
          for (var j = i + 1; j < particles.length; j++) {
            var dx = particles[i].x - particles[j].x;
            var dy = particles[i].y - particles[j].y;
            var dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 180) {
              var lineAlpha = e1 * 0.12 * (1 - dist / 180);
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha + ')';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var s = p.size * e1;
          var alpha = e1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s + 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',' + (alpha * 0.12) + ')';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',' + alpha + ')';
          ctx.fill();
        }
      }

      // PHASE 2: Constellation Orbit (700–2800ms)
      else if (elapsed < 2800) {
        var t2 = (elapsed - 700) / 2100;
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var a = p.angle + t2 * Math.PI * 2 * p.orbitSpeed;
          var wobble = Math.sin(t2 * Math.PI * 6 + i) * 15;
          p.x = cx + Math.cos(a) * (p.orbitR + wobble);
          p.y = cy + Math.sin(a) * (p.orbitR + wobble);
          p.trail.push({x: p.x, y: p.y});
          if (p.trail.length > 12) p.trail.shift();
          p.snapX = p.x;
          p.snapY = p.y;
        }
        // Neural network constellation lines
        for (var i = 0; i < particles.length; i++) {
          for (var j = i + 1; j < particles.length; j++) {
            var dx = particles[i].x - particles[j].x;
            var dy = particles[i].y - particles[j].y;
            var dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 160) {
              var pulse = 0.1 + Math.sin(t2 * Math.PI * 8 + i + j) * 0.06;
              var lineBri = Math.round((particles[i].bri + particles[j].bri) / 2);
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = 'rgba(' + lineBri + ',' + lineBri + ',' + lineBri + ',' + pulse + ')';
              ctx.lineWidth = 0.6;
              ctx.stroke();
              // Small node dots at midpoints for neural-net feel
              if (dist > 60) {
                var mx = (particles[i].x + particles[j].x) / 2;
                var my = (particles[i].y + particles[j].y) / 2;
                ctx.beginPath();
                ctx.arc(mx, my, 1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,' + (pulse * 0.4) + ')';
                ctx.fill();
              }
            }
          }
        }
        // Draw trails + particles
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          if (p.trail.length > 1) {
            for (var k = 1; k < p.trail.length; k++) {
              var ta = (k / p.trail.length) * 0.25;
              ctx.beginPath();
              ctx.moveTo(p.trail[k-1].x, p.trail[k-1].y);
              ctx.lineTo(p.trail[k].x, p.trail[k].y);
              ctx.strokeStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',' + ta + ')';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',0.1)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',1)';
          ctx.fill();
        }
      }

      // PHASE 3: Magnetic Convergence (2800–4400ms)
      else if (elapsed < 4400) {
        var t3 = (elapsed - 2800) / 1600;
        var e3 = easeInOutCubic(t3);
        // Tile slot glow
        for (var i = 0; i < tileTargets.length; i++) {
          var tg = tileTargets[i];
          var glowPulse = 0.06 + Math.sin(t3 * Math.PI * 4 + i) * 0.04;
          ctx.strokeStyle = 'rgba(255,255,255,' + glowPulse + ')';
          ctx.lineWidth = 1;
          ctx.strokeRect(tg.x - tg.w/2, tg.y - tg.h/2, tg.w, tg.h);
        }
        // Fading network lines between converging particles
        if (e3 < 0.7) {
          var lineAlpha = 0.08 * (1 - e3 / 0.7);
          for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
              var dx = particles[i].x - particles[j].x;
              var dy = particles[i].y - particles[j].y;
              var dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 200) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = 'rgba(200,200,200,' + (lineAlpha * (1 - dist/200)) + ')';
                ctx.lineWidth = 0.4;
                ctx.stroke();
              }
            }
          }
        }
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var tg = tileTargets[p.idx];
          p.x = p.snapX + (tg.x - p.snapX) * e3;
          p.y = p.snapY + (tg.y - p.snapY) * e3;
          if (e3 > 0.1) {
            var trailLen = 35 * (1 - e3);
            var ddx = tg.x - p.snapX;
            var ddy = tg.y - p.snapY;
            var mag = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
            var tx = p.x - (ddx/mag) * trailLen;
            var ty = p.y - (ddy/mag) * trailLen;
            var grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
            grad.addColorStop(0, 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',0)');
            grad.addColorStop(1, 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',0.35)');
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + (1-e3)*0.5), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',1)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2 + 6*(1-e3), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',' + (0.08 + 0.08*(1-e3)) + ')';
          ctx.fill();
        }
        if (t3 > 0.85) {
          tiles.forEach(function (t) { t.classList.add('tile-glow'); });
        }
      }

      // PHASE 4: Impact + Tile Reveal (4400–5400ms)
      else if (elapsed < 5400) {
        var t4 = (elapsed - 4400) / 1000;
        // Shockwaves
        if (t4 < 0.05 && shockwaves.length === 0) {
          for (var i = 0; i < particles.length; i++) {
            var tg = tileTargets[i];
            var b = particles[i].bri;
            shockwaves.push({ x: tg.x, y: tg.y, r: 0, maxR: 60, bri: b, born: elapsed });
            shockwaves.push({ x: tg.x, y: tg.y, r: 0, maxR: 40, bri: Math.min(255, b + 30), born: elapsed + 80 });
          }
          // Reveal tiles in diagonal wave
          tiles.forEach(function (tile, idx) {
            var row = Math.floor(idx / cols);
            var col = idx % cols;
            var delay = (col + row) * 60;
            setTimeout(function () {
              tile.classList.remove('tile-glow');
              tile.style.transform = '';
              tile.style.opacity = '';
              tile.classList.add('tile-show');
            }, delay);
            setTimeout(function () {
              tile.classList.remove('tile-show');
              tile.classList.add('tile-ready');
            }, delay + 600);
          });
        }
        // Draw shockwaves
        var canvasAlpha = 1 - easeOutCubic(t4);
        ctx.globalAlpha = canvasAlpha;
        for (var s = shockwaves.length - 1; s >= 0; s--) {
          var sw = shockwaves[s];
          var age = (elapsed - sw.born) / 500;
          if (age < 0) continue;
          if (age > 1) { shockwaves.splice(s, 1); continue; }
          var r = sw.maxR * easeOutCubic(age);
          var a = 0.35 * (1 - age);
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + sw.bri + ',' + sw.bri + ',' + sw.bri + ',' + a + ')';
          ctx.lineWidth = 1.5 * (1 - age);
          ctx.stroke();
        }
        // Fading particles
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var tg = tileTargets[p.idx];
          var fadeAlpha = 1 - easeOutCubic(t4);
          ctx.beginPath();
          ctx.arc(tg.x, tg.y, p.size * (1 - t4*0.5), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.bri + ',' + p.bri + ',' + p.bri + ',' + fadeAlpha + ')';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // PHASE 5: Settle (5400–7000ms)
      else if (elapsed < DURATION) {
        var t5 = (elapsed - 5400) / 1600;
        var fadeOut = 1 - easeOutCubic(t5);
        if (fadeOut > 0.01) {
          ctx.globalAlpha = fadeOut * 0.3;
          for (var i = 0; i < particles.length; i++) {
            var tg = tileTargets[particles[i].idx];
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, 2, 0, Math.PI * 2);
            var b = particles[i].bri;
            ctx.fillStyle = 'rgba(' + b + ',' + b + ',' + b + ',0.5)';
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      // Done
      else {
        ctx.clearRect(0, 0, W, H);
        canvas.style.opacity = '0';
        if (progressFill) progressFill.style.width = '100%';
        if (replayBtn) replayBtn.classList.add('visible');
        tiles.forEach(function (t) {
          if (!t.classList.contains('tile-ready')) {
            t.classList.remove('tile-show', 'tile-glow');
            t.style.transform = '';
            t.style.opacity = '';
            t.classList.add('tile-ready');
          }
        });
        return;
      }

      animId = requestAnimationFrame(draw);
    }

    canvas.style.opacity = '1';
    if (animId) cancelAnimationFrame(animId);
    startTime = 0;
    shockwaves = [];
    animId = requestAnimationFrame(draw);
  }

  if (canvas && tileGrid) {
    runTileAnimation();
    if (replayBtn) {
      replayBtn.addEventListener('click', function () {
        runTileAnimation();
      });
    }
  }

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
      tiles.forEach(function (tile) {
        var rect = tile.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));
        var maxDist = 350;
        var norm = Math.min(dist / maxDist, 1);
        var brightness = 1.6 - (norm * 1.1);
        var borderAlpha = ((1 - norm) * 0.35).toFixed(3);
        tile.style.filter = 'brightness(' + brightness.toFixed(2) + ')';
        tile.style.borderColor = 'rgba(255,255,255,' + borderAlpha + ')';
      });
    });

    tileGrid.addEventListener('mouseleave', function () {
      tiles.forEach(function (tile) {
        tile.style.filter = 'brightness(0.5)';
        tile.style.borderColor = '';
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

  // ==================== INTEREST TAG EXPAND/COLLAPSE ====================
  var tagPairs = [
    { tag: 'pokerTag', detail: 'pokerDetail' },
    { tag: 'nbaTag', detail: 'nbaDetail' },
    { tag: 'shoesTag', detail: 'shoesDetail' },
    { tag: 'musicTag', detail: 'musicDetail' },
    { tag: 'foodTag', detail: 'foodDetail' }
  ];

  tagPairs.forEach(function (pair) {
    var tag = document.getElementById(pair.tag);
    var detail = document.getElementById(pair.detail);
    if (tag && detail) {
      tag.addEventListener('click', function () {
        var isOpen = detail.classList.contains('visible');
        // Close all others
        tagPairs.forEach(function (p) {
          var d = document.getElementById(p.detail);
          var t = document.getElementById(p.tag);
          if (d) d.classList.remove('visible');
          if (t) t.classList.remove('active');
        });
        if (!isOpen) {
          detail.classList.add('visible');
          tag.classList.add('active');
        }
      });
    }
  });

  // ==================== ANIME RANKING MODAL ====================
  var animeTag = document.getElementById('animeTag');
  var animeModal = document.getElementById('animeModal');
  var animeModalClose = document.getElementById('animeModalClose');

  if (animeTag && animeModal) {
    animeTag.addEventListener('click', function () {
      animeModal.classList.add('open');
    });

    animeModalClose.addEventListener('click', function () {
      animeModal.classList.remove('open');
    });

    animeModal.addEventListener('click', function (e) {
      if (e.target === animeModal) {
        animeModal.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && animeModal.classList.contains('open')) {
        animeModal.classList.remove('open');
      }
    });
  }

  // ==================== 3D COURSE CAROUSEL ====================
  var carousel = document.getElementById('courseCarousel');
  if (carousel) {
    var cards = carousel.querySelectorAll('.carousel-card');
    var total = cards.length;
    var currentIndex = 0;
    var currentAngle = 0;
    var theta = 360 / total;
    var radius = Math.round((260 / 2) / Math.tan(Math.PI / total));

    cards.forEach(function (card, i) {
      var angle = theta * i;
      card.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
    });

    function rotateCarousel() {
      carousel.style.transform = 'translateZ(-' + radius + 'px) rotateY(' + currentAngle + 'deg)';
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

    function goNext() {
      currentIndex = (currentIndex + 1) % total;
      currentAngle -= theta;
      rotateCarousel();
    }

    function goPrev() {
      currentIndex = (currentIndex - 1 + total) % total;
      currentAngle += theta;
      rotateCarousel();
    }

    if (prevBtn) prevBtn.addEventListener('click', goPrev);
    if (nextBtn) nextBtn.addEventListener('click', goNext);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    });
  }
})();
