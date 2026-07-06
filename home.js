/* ============================================================
   home.js — one-page GSAP scroll experience for index.html
   Pins, horizontal scroll, and line-reveal patterns are adapted
   (not copied verbatim) from Antoine Wodniack's open-source
   portfolio, used with permission for this personal site.
   ============================================================ */
(function () {
  'use strict';

  if (!window.gsap) {
    // Without GSAP, leave the page fully visible (no hidden reveal targets).
    return;
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, ScrollToPlugin);
  if (window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  var hasScramble = !!window.ScrambleTextPlugin;

  // Arm CSS so reveal targets start hidden (reduced-motion CSS keeps them shown).
  document.body.classList.add('js-armed');

  // Module-scoped smoother so the nav handler can reach the live instance.
  var smoother = null;

  /* ==================== CUSTOM CURSOR ==================== */
  (function initCursor() {
    var cursorDot = document.getElementById('cursorDot');
    if (!cursorDot) return;
    var cursorX = -100, cursorY = -100;

    document.addEventListener('mousemove', function (e) {
      cursorX = e.clientX;
      cursorY = e.clientY;
    });
    document.addEventListener('mouseleave', function () { cursorDot.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { cursorDot.style.opacity = '1'; });

    (function loop() {
      cursorDot.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px)';
      requestAnimationFrame(loop);
    })();

    var hoverEls = document.querySelectorAll('a, button, .project-card, .carousel-card, .timeline-trigger');
    hoverEls.forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursorDot.classList.add('expanded'); });
      el.addEventListener('mouseleave', function () { cursorDot.classList.remove('expanded'); });
    });
  })();

  /* ==================== ABOUT INTERESTS: click to learn more ==================== */
  (function initInterests() {
    var chips = document.querySelectorAll('.interest-chip');
    var detail = document.getElementById('interestDetail');
    if (!chips.length || !detail) return;

    var DETAILS = {
      poker: "Low-stakes Texas hold 'em \u2014 nothing beats a Friday night home game.",
      nba: 'Timberwolves and Knicks fan. Favorite player is Anthony Edwards.',
      shoes: 'Always collecting \u2014 Dunks, Jordans, Air Forces, 550s, Vomeros, and counting.',
      music: 'Travis Scott, Tyler, the Creator, Pritam, Tame Impala, SZA, Frank Ocean. On repeat: Tu Jaane Na and Nights.',
      food: 'Big food person \u2014 <a href="https://www.bfrz.co/bigroko" target="_blank" rel="noopener">Beli is @bigroko</a>. Current favorites: Pusadee\'s Garden and Semma.'
    };

    var activeChip = null;
    function clearActive() {
      chips.forEach(function (c) { c.classList.remove('active'); });
      activeChip = null;
      detail.hidden = true;
      detail.innerHTML = '';
    }

    // Anime modal
    var modal = document.getElementById('animeModal');
    var modalClose = document.getElementById('animeModalClose');
    var modalOpen = false;
    function openModal() {
      if (!modal) return;
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      modalOpen = true;
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      modalOpen = false;
      var done = function () { if (!modalOpen) modal.hidden = true; modal.removeEventListener('transitionend', done); };
      modal.addEventListener('transitionend', done);
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalOpen) closeModal(); });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.getAttribute('data-modal') === 'anime') {
          openModal();
          return;
        }
        var key = chip.getAttribute('data-interest');
        if (activeChip === chip) { clearActive(); return; }
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        activeChip = chip;
        detail.innerHTML = DETAILS[key] || '';
        detail.hidden = false;
      });
    });
  })();

  /* ==================== EXPERIENCE: click to expand blurb ==================== */
  (function initExperience() {
    var items = document.querySelectorAll('.timeline-item');
    if (!items.length) return;

    var activeItem = null;

    function collapseItem(item) {
      var trigger = item.querySelector('.timeline-trigger');
      var detail = item.querySelector('.timeline-detail');
      item.classList.remove('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (detail) {
        var done = function () {
          if (!item.classList.contains('is-open')) detail.hidden = true;
          detail.removeEventListener('transitionend', done);
        };
        detail.addEventListener('transitionend', done);
      }
    }

    function expandItem(item) {
      var trigger = item.querySelector('.timeline-trigger');
      var detail = item.querySelector('.timeline-detail');
      if (detail) detail.hidden = false;
      if (detail) void detail.offsetHeight;
      item.classList.add('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    items.forEach(function (item) {
      var trigger = item.querySelector('.timeline-trigger');
      if (!trigger) return;

      trigger.addEventListener('click', function () {
        if (activeItem === item) {
          collapseItem(item);
          activeItem = null;
          return;
        }
        if (activeItem) collapseItem(activeItem);
        expandItem(item);
        activeItem = item;
      });
    });
  })();

  /* ==================== 3D COURSE CAROUSEL (geometry + buttons) ==================== */
  var carousel = document.getElementById('courseCarousel');
  var courseCards = carousel ? carousel.querySelectorAll('.carousel-card') : [];
  var courseTotal = courseCards.length;
  var courseTheta = courseTotal ? 360 / courseTotal : 0;
  // Base card width matches the enlarged .carousel-card in home.css.
  var courseCardWidth = window.matchMedia('(max-width: 768px)').matches ? 260 : 360;
  var courseRadius = courseTotal ? Math.round((courseCardWidth / 2) / Math.tan(Math.PI / courseTotal)) : 0;
  var courseIndex = 0;

  function layoutCarousel() {
    courseCards.forEach(function (card, i) {
      card.style.transform = 'rotateY(' + (courseTheta * i) + 'deg) translateZ(' + courseRadius + 'px)';
    });
  }

  function setCarouselAngle(angle) {
    if (!carousel) return;
    carousel.style.transform = 'translateZ(-' + courseRadius + 'px) rotateY(' + angle + 'deg)';
  }

  function setCarouselActive(index) {
    courseIndex = ((index % courseTotal) + courseTotal) % courseTotal;
    courseCards.forEach(function (card, i) {
      card.classList.toggle('active', i === courseIndex);
    });
    var cur = document.getElementById('carouselCurrent');
    if (cur) cur.textContent = String(courseIndex + 1).padStart(2, '0');
  }

  if (carousel && courseTotal) {
    var totalEl = document.getElementById('carouselTotal');
    if (totalEl) totalEl.textContent = String(courseTotal).padStart(2, '0');

    layoutCarousel();
    setCarouselAngle(0);
    setCarouselActive(0);

    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');

    function goToCourse(index) {
      setCarouselActive(index);
      setCarouselAngle(-courseTheta * courseIndex);
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { goToCourse(courseIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToCourse(courseIndex + 1); });
  }

  /* ==================== NAV: smooth-scroll + active state ==================== */
  (function initNav() {
    var links = document.querySelectorAll('.site-nav [data-target]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('data-target');
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        if (smoother) {
          smoother.scrollTo(target, true, 'top top');
        } else {
          gsap.to(window, { duration: 1, ease: 'power2.inOut', scrollTo: { y: target, autoKill: true } });
        }
      });
    });

    ['about', 'experience', 'coursework', 'projects'].forEach(function (id) {
      var navLink = document.querySelector('.nav-link[data-target="' + id + '"]');
      var section = document.getElementById(id);
      if (!navLink || !section) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onToggle: function (self) {
          if (self.isActive) {
            document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
            navLink.classList.add('active');
          }
        }
      });
    });
  })();

  /* ==================== HERO: scramble name + idle letter motion ==================== */
  function initName() {
    var el = document.getElementById('heroNameText');
    if (!el) return;
    var finalText = el.textContent;

    if (prefersReduced) {
      gsap.set(['.hero-sub', '.hero-scroll-hint'], { opacity: 1 });
      return;
    }

    gsap.set(['.hero-sub', '.hero-scroll-hint'], { opacity: 0, y: 16 });

    function startIdle() {
      if (!window.SplitText) return;
      var split = new SplitText(el, { type: 'chars' });
      var chars = split.chars;
      gsap.set(chars, { display: 'inline-block', transformPerspective: 500 });

      function pulse() {
        var c = gsap.utils.random(chars);
        var tl = gsap.timeline({ onComplete: pulse, delay: gsap.utils.random(0.15, 0.9) });
        if (Math.random() < 0.5) {
          tl.to(c, { yPercent: gsap.utils.random(-45, -20), duration: 0.3, ease: 'power2.out' })
            .to(c, { yPercent: 0, duration: 0.55, ease: 'bounce.out' });
        } else {
          tl.to(c, { rotationX: 360, duration: 0.75, ease: 'power2.inOut' })
            .set(c, { rotationX: 0 });
        }
      }
      for (var i = 0; i < 3; i++) gsap.delayedCall(i * 0.4, pulse);
    }

    var tl = gsap.timeline({ delay: 0.2 });
    if (hasScramble) {
      tl.to(el, {
        duration: 3.0,
        scrambleText: { text: finalText, chars: 'upperAndLowerCase', speed: 0.4, revealDelay: 0.5 },
        ease: 'none'
      });
    }
    tl.to('.hero-sub', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, hasScramble ? '-=0.5' : 0)
      .to('.hero-scroll-hint', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .add(startIdle);
  }

  /* ==================== ABOUT ME: "About Me" -> big tagline centered ====================
     "About Me" starts centered; on scroll the line slides left so "About Me" exits off the
     left edge and the full tagline ends centered at a large bold size. The tagline is sized
     to fit the viewport (so it's never clipped), and the fit target guarantees "About Me" is
     fully off-screen at the centered stop. Function-based values + invalidateOnRefresh keep it
     correct across resizes. */
  function buildAboutIntroDesktop() {
    var line = document.getElementById('aboutIntroLine');
    var title = document.getElementById('aboutIntroTitle');
    var desc = document.getElementById('aboutIntroDesc');
    if (!line || !title || !desc) return;

    gsap.set([title, desc], { opacity: 1 });

    var metrics = { T: 0, D: 0, G: 0 };
    // Size the tagline (bold, title-size base) down to fit the viewport, then record widths.
    // target = W - 2*gap + 40 -> tagline fully visible with side margins AND "About Me"
    // sits ~20px off the left edge when the tagline is centered.
    function measure() {
      desc.style.fontSize = '';
      var basePx = parseFloat(getComputedStyle(desc).fontSize) || 1;
      var gap = parseFloat(getComputedStyle(line).columnGap) || 0;
      var natural = desc.offsetWidth || 1;
      var target = window.innerWidth - 2 * gap + 40;
      var scale = Math.min(1, target / natural);
      desc.style.fontSize = (basePx * scale) + 'px';
      metrics.T = title.offsetWidth;
      metrics.D = desc.offsetWidth;
      metrics.G = parseFloat(getComputedStyle(line).columnGap) || 0;
    }
    measure();

    function startX() { return (metrics.G + metrics.D) / 2; } // "About Me" centered
    function endX() { return -(metrics.T + metrics.G) / 2; }  // tagline centered

    gsap.set(line, { x: startX() }); // avoid a flash before ScrollTrigger renders

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#about-intro',
        start: 'top top',
        end: '+=' + Math.round(window.innerHeight * 1.8),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onRefresh: measure
      }
    });
    tl.fromTo(line, { x: startX }, { x: endX, ease: 'none' }, 0)
      // Short hold so the scroll ends with the tagline sitting centered.
      .to({}, { duration: 0.35 });
  }

  function buildAboutIntroStacked() {
    var targets = [document.getElementById('aboutIntroTitle'), document.getElementById('aboutIntroDesc')].filter(Boolean);
    if (!targets.length) return;
    gsap.set(targets, { y: 40 });
    gsap.to(targets, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
      scrollTrigger: { trigger: '#about-intro', start: 'top 65%' }
    });
  }

  /* ==================== HEADER TEXT ANIMATIONS (one effect per section) ==================== */
  function revealIndex(index, section) {
    if (!index) return;
    gsap.set(index, { opacity: 0, y: 20 });
    gsap.to(index, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 80%' }
    });
  }

  function applyHeaderAnim(sectionSel, effect, splitStore) {
    var section = document.querySelector(sectionSel);
    if (!section) return;
    var title = section.querySelector('.section-title');
    var index = section.querySelector('.section-index');
    if (!title) return;

    if (effect === 'scramble') {
      var finalText = title.textContent;
      ScrollTrigger.create({
        trigger: section, start: 'top 78%', once: true,
        onEnter: function () {
          if (hasScramble) {
            gsap.from(title, {
              duration: 1.2,
              scrambleText: { text: finalText, chars: 'upperCase', speed: 0.7 },
              ease: 'none'
            });
          }
        }
      });
      revealIndex(index, section);
      return;
    }

    if (!window.SplitText) { revealIndex(index, section); return; }
    var split = new SplitText(title, { type: 'chars' });
    splitStore.push(split);
    var chars = split.chars;
    var from, to;

    if (effect === 'flip') {
      gsap.set(chars, { transformPerspective: 500 });
      from = { opacity: 0, rotationX: -95, y: 8 };
      to = { opacity: 1, rotationX: 0, y: 0, duration: 0.7, ease: 'back.out(1.7)', stagger: 0.04 };
    } else if (effect === 'wave') {
      from = { opacity: 0, y: 42 };
      to = { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out', stagger: { each: 0.05 } };
    } else { // mask-rise
      title.style.display = 'inline-block';
      title.style.overflow = 'hidden';
      from = { yPercent: 115 };
      to = { yPercent: 0, duration: 0.85, ease: 'power4.out', stagger: 0.05 };
    }

    gsap.set(chars, from);
    to.scrollTrigger = { trigger: section, start: 'top 78%' };
    gsap.to(chars, to);
    revealIndex(index, section);
  }

  function buildHeaderAnims(splitStore) {
    applyHeaderAnim('#about', 'mask-rise', splitStore);
    applyHeaderAnim('#experience', 'flip', splitStore);
    applyHeaderAnim('#coursework', 'wave', splitStore);
    applyHeaderAnim('#projects', 'scramble', splitStore);
  }

  /* ==================== SHARED REVEALS (desktop + mobile) ==================== */
  function buildReveals(splitStore) {
    // About copy — line-by-line reveal driven progressively by scroll (scrub).
    var aboutParas = document.querySelectorAll('#aboutCopy p');
    if (aboutParas.length && window.SplitText) {
      var aboutSplit = new SplitText('#aboutCopy p', { type: 'lines', linesClass: 'reveal-line' });
      splitStore.push(aboutSplit);
      gsap.set(aboutSplit.lines, { y: 32 });
      gsap.to(aboutSplit.lines, {
        opacity: 1, y: 0, ease: 'power2.out', stagger: 0.5,
        scrollTrigger: {
          trigger: '#about',
          start: 'top 75%',
          end: 'bottom 70%',
          scrub: 1
        }
      });
    }

    // Experience — spine draw + staggered items
    var spine = document.getElementById('timelineSpine');
    if (spine) {
      gsap.to(spine, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '#timeline', start: 'top 80%', end: 'bottom 60%', scrub: true }
      });
    }
    var items = document.querySelectorAll('.timeline-item');
    if (items.length) {
      gsap.set(items, { y: 40 });
      gsap.to(items, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '#timeline', start: 'top 70%' }
      });
    }
  }

  /* ==================== PROJECTS: reveal + 3D tilt ==================== */
  function revealProjects() {
    var cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;
    // Use yPercent for the reveal so the tilt handler (which writes x/y/z) never
    // fights the same transform property.
    gsap.set(cards, { opacity: 0, yPercent: 12 });
    gsap.to(cards, {
      opacity: 1, yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '#projects', start: 'top 72%' }
    });
  }

  // Returns an object with destroy(); the whole grid tilts toward the cursor
  // and each card floats by its data-depth for a parallax gallery feel.
  function initProjectTilt() {
    var stage = document.getElementById('projectsStage');
    var grid = document.getElementById('projectsGrid');
    if (!stage || !grid || !window.matchMedia('(hover: hover)').matches) return null;

    var rotX = gsap.quickTo(grid, 'rotationX', { duration: 0.8, ease: 'power3' });
    var rotY = gsap.quickTo(grid, 'rotationY', { duration: 0.8, ease: 'power3' });

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
    var cardTweens = cards.map(function (card) {
      return {
        z: gsap.quickTo(card, 'z', { duration: 0.8, ease: 'power3' }),
        x: gsap.quickTo(card, 'x', { duration: 0.8, ease: 'power3' }),
        y: gsap.quickTo(card, 'y', { duration: 0.8, ease: 'power3' }),
        depth: parseFloat(card.getAttribute('data-depth')) || 1
      };
    });

    function onMove(e) {
      var r = stage.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      rotY(nx * 12);
      rotX(-ny * 12);
      cardTweens.forEach(function (t) {
        t.z(t.depth * 40);
        t.x(nx * t.depth * 26);
        t.y(ny * t.depth * 26);
      });
    }
    function onLeave() {
      rotX(0); rotY(0);
      cardTweens.forEach(function (t) { t.z(0); t.x(0); t.y(0); });
    }

    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);

    return {
      destroy: function () {
        stage.removeEventListener('mousemove', onMove);
        stage.removeEventListener('mouseleave', onLeave);
        gsap.set(grid, { clearProps: 'transform' });
        gsap.set(cards, { clearProps: 'transform' });
      }
    };
  }

  /* ==================== RESPONSIVE / MOTION BRANCHES ==================== */
  var mm = gsap.matchMedia();

  // ---------- DESKTOP: smoother + pins ----------
  mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', function () {
    var splitStore = [];

    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,
      effects: true,
      normalizeScroll: true
    });

    buildReveals(splitStore);
    buildAboutIntroDesktop();
    buildHeaderAnims(splitStore);

    // ----- Coursework carousel spin (pinned, scrubbed) -----
    if (carousel && courseTotal) {
      carousel.style.transition = 'none';
      ScrollTrigger.create({
        trigger: '#coursework',
        start: 'top top',
        end: '+=' + (window.innerHeight * 2.2),
        pin: '#courseworkPin',
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var angle = -self.progress * courseTheta * courseTotal;
          setCarouselAngle(angle);
          setCarouselActive(Math.round((-angle) / courseTheta));
        }
      });
    }

    // ----- Projects: staggered reveal + cursor-reactive 3D tilt -----
    revealProjects();
    var tilt = initProjectTilt();

    ScrollTrigger.refresh();

    return function cleanup() {
      if (smoother) { smoother.kill(); smoother = null; }
      if (carousel) carousel.style.transition = '';
      if (tilt) tilt.destroy();
      splitStore.forEach(function (s) { if (s && s.revert) s.revert(); });
      // Reset the About Me line so the mobile/reduced layout starts clean.
      var descEl = document.getElementById('aboutIntroDesc');
      if (descEl) descEl.style.fontSize = '';
      gsap.set('#aboutIntroLine', { clearProps: 'transform' });
    };
  });

  // ---------- MOBILE: no pins, simple fades ----------
  mm.add('(max-width: 768px) and (prefers-reduced-motion: no-preference)', function () {
    var splitStore = [];
    buildReveals(splitStore);
    buildAboutIntroStacked();
    buildHeaderAnims(splitStore);

    // Project cards fade in stacked (no tilt on touch)
    revealProjects();

    ScrollTrigger.refresh();

    return function cleanup() {
      splitStore.forEach(function (s) { if (s && s.revert) s.revert(); });
    };
  });

  // ---------- REDUCED MOTION: everything visible, no scroll effects ----------
  mm.add('(prefers-reduced-motion: reduce)', function () {
    gsap.set([
      '#aboutIntroTitle', '#aboutIntroDesc', '.timeline-item', '.reveal-line',
      '.hero-sub', '.hero-scroll-hint', '.section-title', '.section-index',
      '.project-card', '#timelineSpine'
    ], { clearProps: 'all', opacity: 1 });
    var spine = document.getElementById('timelineSpine');
    if (spine) gsap.set(spine, { scaleY: 1 });
  });

  /* ==================== PROJECTS: detail modal + image zoom ==================== */
  (function initProjectModals() {
    var modal = document.getElementById('projectModal');
    var titleEl = document.getElementById('projectModalTitle');
    var galleryEl = document.getElementById('projectGallery');
    var closeBtn = document.getElementById('projectModalClose');
    var zoom = document.getElementById('zoomModal');
    var zoomImg = document.getElementById('zoomModalImg');
    var zoomCap = document.getElementById('zoomModalCaption');
    var zoomClose = document.getElementById('zoomModalClose');
    if (!modal || !galleryEl || !zoom) return;

    var A = 'assets/projects/';
    var PROJECTS = {
      nokia: {
        title: 'Nokia Bell Labs',
        photos: [
          { src: A + 'nokia-rf.jpg', caption: 'Repairing a broken RF waveform splitter pack on the optics bench at Nokia Bell Labs.' }
        ]
      },
      beehive: {
        title: 'Beehive Acoustic Anomaly Detection',
        photos: [
          { src: A + 'beehive-sensors.jpg', caption: 'Arduino sensor array built to capture beehive acoustics.' },
          { src: A + 'beehive-farm.jpg', caption: 'The field-ready acoustic monitoring device, packed up before deployment at the farm.' }
        ]
      },
      pfizer: {
        title: 'Pfizer Software Access Classifier',
        photos: [
          { src: A + 'pfizer-nyc.jpg', caption: "On-site at Pfizer's New York City branch." },
          { src: A + 'pfizer-interns.jpg', caption: 'With the Pfizer summer intern cohort.' }
        ]
      },
      airquality: {
        title: 'Urban Air Quality \u2014 Deep Learning',
        photos: [
          { src: A + 'airquality-fair.jpg', caption: 'Presenting the research at the Delaware Valley Science & Engineering Fair.' }
        ],
        poster: {
          src: A + 'poster-full.png',
          caption: 'AJAS 2025 poster \u2014 Optimizing Air Quality: A Deep Learning Approach. Click a figure to enlarge.',
          hotspots: [
            { left: 26.89, top: 24.66, w: 22.65, h: 14.28, src: A + 'fig-cloud-pressure.png', label: 'Fig 2 \u00b7 Cloud-top pressure', caption: 'Average cloud-top pressure, Jan\u2013Feb 2024 (NASA MERRA-2).' },
            { left: 50.36, top: 41.47, w: 10.26, h: 14.67, src: A + 'fig-heatmap.png', label: 'Fig 3 \u00b7 Heatmap', caption: 'Feature-selection correlation heatmap.' },
            { left: 61.54, top: 41.47, w: 11.01, h: 14.67, src: A + 'fig-pairplot.png', label: 'Fig 4 \u00b7 Pairplot', caption: 'Feature-selection pairplot.' },
            { left: 27.18, top: 73.37, w: 22.10, h: 23.03, src: A + 'fig-lstm-regression.png', label: 'Fig 5 \u00b7 LSTM regression', caption: 'LSTM sample regression \u2014 Mumbai 2023.' },
            { left: 50.28, top: 75.77, w: 22.10, h: 18.22, src: A + 'fig-rmse.png', label: 'Fig 6 \u00b7 Model RMSE', caption: 'Model RMSE comparison \u2014 LSTM vs. baselines (Mumbai 2019\u20132023).' }
          ]
        }
      }
    };

    var projectOpen = false, zoomOpen = false, lastFocus = null;

    function lockScroll(on) {
      if (smoother) smoother.paused(on);
      document.body.classList.toggle('modal-locked', on);
    }

    function figure(src, caption, cls) {
      var fig = document.createElement('figure');
      fig.className = cls || 'gallery-item';
      var img = document.createElement('img');
      img.src = src; img.alt = caption || ''; img.loading = 'lazy';
      fig.appendChild(img);
      if (caption) {
        var cap = document.createElement('figcaption');
        cap.textContent = caption;
        fig.appendChild(cap);
      }
      fig.addEventListener('click', function () { openZoom(src, caption); });
      return fig;
    }

    function buildPoster(poster) {
      var wrap = document.createElement('div');
      wrap.className = 'poster-block';

      var stage = document.createElement('div');
      stage.className = 'poster-figure';
      var img = document.createElement('img');
      img.src = poster.src; img.alt = 'AJAS 2025 research poster'; img.loading = 'lazy';
      img.addEventListener('click', function () { openZoom(poster.src, poster.caption); });
      stage.appendChild(img);

      poster.hotspots.forEach(function (h) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'poster-hotspot';
        b.style.left = h.left + '%';
        b.style.top = h.top + '%';
        b.style.width = h.w + '%';
        b.style.height = h.h + '%';
        b.setAttribute('aria-label', h.label);
        b.innerHTML = '<span>' + h.label + '</span>';
        b.addEventListener('click', function (e) { e.stopPropagation(); openZoom(h.src, h.caption); });
        stage.appendChild(b);
      });
      wrap.appendChild(stage);

      var cap = document.createElement('p');
      cap.className = 'poster-caption';
      cap.textContent = poster.caption;
      wrap.appendChild(cap);

      // Always-tappable figure strip (primary path on touch / no-hover).
      var strip = document.createElement('div');
      strip.className = 'poster-thumbs';
      var label = document.createElement('span');
      label.className = 'poster-thumbs-label';
      label.textContent = 'Key figures';
      strip.appendChild(label);
      var row = document.createElement('div');
      row.className = 'poster-thumbs-row';
      poster.hotspots.forEach(function (h) {
        var t = document.createElement('button');
        t.type = 'button';
        t.className = 'poster-thumb';
        t.innerHTML = '<img src="' + h.src + '" alt="" loading="lazy"><span>' + h.label + '</span>';
        t.addEventListener('click', function () { openZoom(h.src, h.caption); });
        row.appendChild(t);
      });
      strip.appendChild(row);
      wrap.appendChild(strip);
      return wrap;
    }

    function openProject(key) {
      var data = PROJECTS[key];
      if (!data) return;
      lastFocus = document.activeElement;
      titleEl.textContent = data.title;
      galleryEl.innerHTML = '';
      galleryEl.scrollTop = 0;

      var photos = document.createElement('div');
      photos.className = 'gallery-photos';
      (data.photos || []).forEach(function (p) { photos.appendChild(figure(p.src, p.caption)); });
      galleryEl.appendChild(photos);

      if (data.poster) galleryEl.appendChild(buildPoster(data.poster));

      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      projectOpen = true;
      lockScroll(true);
      if (closeBtn) closeBtn.focus();
    }

    function closeProject() {
      if (!projectOpen) return;
      modal.classList.remove('is-open');
      projectOpen = false;
      if (!zoomOpen) lockScroll(false);
      var done = function () { if (!projectOpen) modal.hidden = true; modal.removeEventListener('transitionend', done); };
      modal.addEventListener('transitionend', done);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function openZoom(src, caption) {
      zoomImg.src = src;
      zoomImg.alt = caption || '';
      zoomCap.textContent = caption || '';
      zoom.hidden = false;
      requestAnimationFrame(function () { zoom.classList.add('is-open'); });
      zoomOpen = true;
      lockScroll(true);
      if (zoomClose) zoomClose.focus();
    }

    function closeZoom() {
      if (!zoomOpen) return;
      zoom.classList.remove('is-open');
      zoomOpen = false;
      if (!projectOpen) lockScroll(false);
      var done = function () { if (!zoomOpen) { zoom.hidden = true; zoomImg.src = ''; } zoom.removeEventListener('transitionend', done); };
      zoom.addEventListener('transitionend', done);
    }

    var cards = document.querySelectorAll('.project-card[data-project]');
    cards.forEach(function (card) {
      var key = card.getAttribute('data-project');
      card.addEventListener('click', function () { openProject(key); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openProject(key);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeProject);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeProject(); });
    if (zoomClose) zoomClose.addEventListener('click', closeZoom);
    zoom.addEventListener('click', function (e) { if (e.target === zoom) closeZoom(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (zoomOpen) closeZoom();
      else if (projectOpen) closeProject();
    });
  })();

  /* ==================== STARTUP: hero ====================
     The hero background is now handled by the hero-backgrounds.js module
     (random ReactBits-style effect per load + shuffle button). Only the
     animated name is initialized here. */
  initName();

  /* ==================== INCOMING HASH (e.g. from resume.html#about) ==================== */
  (function initHashScroll() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    window.scrollTo(0, 0);
    // Wait for layout + ScrollTrigger measurements before jumping.
    window.addEventListener('load', function () {
      gsap.delayedCall(0.35, function () {
        ScrollTrigger.refresh();
        if (smoother) smoother.scrollTo(target, false, 'top top');
        else gsap.set(window, { scrollTo: { y: target } });
      });
    });
  })();

})();
