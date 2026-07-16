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

    var hoverEls = document.querySelectorAll('a, button, .project-row, .carousel-card, .timeline-trigger');
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
    var links = document.querySelectorAll('.site-nav [data-target], .skip-link[data-target]');
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

    ['about', 'experience', 'coursework', 'projects', 'contact'].forEach(function (id) {
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
  // Prime the hero sub/hint to their hidden pre-intro state (or reveal them
  // outright under reduced motion). The actual scramble + reveal is triggered
  // by the intro handoff (or immediately when there's no intro).
  function initName() {
    if (prefersReduced) {
      gsap.set(['.hero-sub', '.hero-scroll-hint'], { opacity: 1 });
      return;
    }
    gsap.set(['.hero-sub', '.hero-scroll-hint'], { opacity: 0, y: 16 });
  }

  // Scramble the name in, reveal the sub/hint, then start the idle letter motion.
  function playHeroIntro() {
    var el = document.getElementById('heroNameText');
    if (!el) return;

    if (prefersReduced) {
      gsap.set(['.hero-sub', '.hero-scroll-hint'], { opacity: 1 });
      return;
    }

    var finalText = el.textContent;

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

    var tl = gsap.timeline();
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
  // Text Pressure (reactbits.dev/text-animations/text-pressure), weight axis only:
  // each letter's variable-font weight tracks how close the cursor is. Runs only
  // while the pointer is inside the section, then eases back to base and stops.
  var titlePressure = null;
  var contactPressure = null;
  function initTitlePressure(area, titleEl, chars, opts) {
    opts = opts || {};
    var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hoverCapable || !area || !titleEl || !chars || !chars.length) return null;

    // Resting weight sits mid-range so letters can bulge heavier toward the
    // cursor (up to WGHT_MAX) and thin out away from it (down to WGHT_MIN).
    var WGHT_MIN = opts.min != null ? opts.min : 300;
    var WGHT_MAX = opts.max != null ? opts.max : 700;
    var BASE = opts.base != null ? opts.base : 500;
    var distFactor = opts.distFactor != null ? opts.distFactor : 0.5;
    var lerp = opts.lerp != null ? opts.lerp : 0.2;
    var cursor = { x: -1e5, y: -1e5 };
    var mouse = { x: -1e5, y: -1e5 };
    var state = chars.map(function () { return BASE; });
    var active = false, raf = null;

    chars.forEach(function (ch) {
      ch.style.display = 'inline-block';
      ch.style.fontVariationSettings = "'wght' " + BASE;
      ch.style.willChange = 'font-variation-settings';
    });

    function onMove(e) { cursor.x = e.clientX; cursor.y = e.clientY; }
    function onEnter(e) {
      cursor.x = mouse.x = e.clientX;
      cursor.y = mouse.y = e.clientY;
      active = true;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function onLeave() { active = false; } // frame() eases to BASE, then stops

    function frame() {
      mouse.x += (cursor.x - mouse.x) / 6;
      mouse.y += (cursor.y - mouse.y) / 6;
      var maxDist = Math.max(1, titleEl.getBoundingClientRect().width * distFactor);
      var settled = true;
      for (var i = 0; i < chars.length; i++) {
        var r = chars[i].getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var target = BASE;
        if (active) {
          var dx = mouse.x - cx, dy = mouse.y - cy;
          var t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxDist);
          target = WGHT_MAX - (WGHT_MAX - WGHT_MIN) * t;
        }
        state[i] += (target - state[i]) * lerp;
        if (Math.abs(target - state[i]) > 0.6) settled = false;
        chars[i].style.fontVariationSettings = "'wght' " + Math.round(state[i]);
      }
      if (!active && settled) {
        for (var j = 0; j < chars.length; j++) chars[j].style.fontVariationSettings = "'wght' " + BASE;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener('mousemove', onMove);
    area.addEventListener('mouseenter', onEnter);
    area.addEventListener('mouseleave', onLeave);

    return {
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        window.removeEventListener('mousemove', onMove);
        area.removeEventListener('mouseenter', onEnter);
        area.removeEventListener('mouseleave', onLeave);
        chars.forEach(function (ch) { ch.style.fontVariationSettings = ''; ch.style.willChange = ''; });
      }
    };
  }

  function buildAboutIntroDesktop(splitStore) {
    var line = document.getElementById('aboutIntroLine');
    var title = document.getElementById('aboutIntroTitle');
    var desc = document.getElementById('aboutIntroDesc');
    if (!line || !title || !desc) return;

    // "About Me" is visible and centered at rest; the tagline stays fully hidden
    // until the horizontal scrub begins (so none of the sentence peeks out).
    gsap.set(title, { opacity: 1 });
    gsap.set(desc, { opacity: 0 });

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

    // Char-by-char reveal for "About Me" as the section rises into view.
    if (window.SplitText) {
      var titleSplit = new SplitText(title, { type: 'chars' });
      if (splitStore) splitStore.push(titleSplit);
      gsap.set(titleSplit.chars, { opacity: 0, yPercent: 120, rotationX: -50, transformOrigin: '50% 100%', transformPerspective: 500 });
      gsap.to(titleSplit.chars, {
        opacity: 1, yPercent: 0, rotationX: 0,
        duration: 0.75, ease: 'back.out(1.6)', stagger: 0.07,
        scrollTrigger: { trigger: '#about-intro', start: 'top 55%', once: true }
      });
      // Cursor-proximity weight "pressure" on the "About Me" letters.
      titlePressure = initTitlePressure(document.getElementById('about-intro'), title, titleSplit.chars);
    }

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
      // Tagline fades in only as the horizontal scrub starts, then the line slides.
      .fromTo(desc, { opacity: 0 }, { opacity: 1, ease: 'power1.out', duration: 0.2 }, 0.03)
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
    applyHeaderAnim('#contact', 'mask-rise', splitStore);
  }

  /* ==================== CONTACT: heading reveal + email hover roll ==================== */
  function initContact(splitStore) {
    // Oversized heading rises in per-character on scroll (mask-rise pattern).
    var heading = document.getElementById('contactHeading');
    if (heading && window.SplitText) {
      var split = new SplitText(heading, { type: 'chars' });
      splitStore.push(split);
      heading.style.display = 'inline-block';
      heading.style.overflow = 'hidden';
      gsap.set(split.chars, { yPercent: 115 });
      gsap.to(split.chars, {
        yPercent: 0, duration: 0.85, ease: 'power4.out', stagger: 0.03,
        scrollTrigger: { trigger: '#contact', start: 'top 80%' }
      });
      // Dramatic cursor-proximity weight on the CTA heading (thinner at rest,
      // much bolder as the cursor sweeps across).
      contactPressure = initTitlePressure(
        document.getElementById('contact'),
        heading,
        split.chars,
        { min: 200, max: 700, base: 280, distFactor: 0.22, lerp: 0.38 }
      );
    }

    // Email centerpiece: wrap each character so it can roll up to a duplicate
    // on hover (CSS drives the motion). Hover-capable pointers only; touch and
    // reduced-motion keep the plain, selectable email text.
    var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var emailText = document.querySelector('#contactEmail .contact-email-text');
    if (hoverCapable && emailText && !emailText.dataset.rollBuilt) {
      var text = emailText.textContent;
      emailText.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var outer = document.createElement('span');
        outer.className = 'ce-char';
        var inner = document.createElement('span');
        inner.className = 'ce-char-inner';
        inner.setAttribute('data-ch', ch);
        inner.textContent = ch;
        inner.style.transitionDelay = (i * 0.012) + 's';
        outer.appendChild(inner);
        emailText.appendChild(outer);
      }
      emailText.dataset.rollBuilt = '1';
    }
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

  /* ==================== PROJECTS: staggered row reveal ==================== */
  function showProjectRowsIfInView() {
    var projects = document.getElementById('projects');
    var rows = document.querySelectorAll('.project-row');
    if (!projects || !rows.length) return;
    var rect = projects.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.78) {
      gsap.set(rows, { opacity: 1, y: 0 });
    }
  }

  function revealProjects() {
    var rows = document.querySelectorAll('.project-row');
    if (!rows.length) return;
    gsap.set(rows, { opacity: 0, y: 40 });
    gsap.to(rows, {
      opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.14,
      scrollTrigger: {
        trigger: '#projects',
        start: 'top 72%',
        once: true
      }
    });
    showProjectRowsIfInView();
  }

  /* ==================== RESPONSIVE / MOTION BRANCHES ==================== */
  var mm = gsap.matchMedia();

  // ---------- DESKTOP: smoother + pins ----------
  mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', function () {
    var splitStore = [];

    // normalizeScroll is only needed for touch (iOS address-bar/scroll quirks);
    // on desktop it intercepts the wheel and adds jank, so gate it to touch.
    var isTouch = window.matchMedia('(hover: none)').matches;
    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1,
      effects: false,
      normalizeScroll: isTouch
    });

    buildReveals(splitStore);
    buildAboutIntroDesktop(splitStore);
    buildHeaderAnims(splitStore);
    initContact(splitStore);

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

    // ----- Projects: staggered row reveal -----
    revealProjects();

    ScrollTrigger.refresh();
    showProjectRowsIfInView();

    return function cleanup() {
      if (smoother) { smoother.kill(); smoother = null; }
      if (carousel) carousel.style.transition = '';
      if (titlePressure) { titlePressure.destroy(); titlePressure = null; }
      if (contactPressure) { contactPressure.destroy(); contactPressure = null; }
      splitStore.forEach(function (s) { if (s && s.revert) s.revert(); });
      // Reset the About Me line so the mobile/reduced layout starts clean.
      var descEl = document.getElementById('aboutIntroDesc');
      if (descEl) descEl.style.fontSize = '';
      gsap.set('#aboutIntroLine', { clearProps: 'transform' });
      gsap.set(['#aboutIntroTitle', '#aboutIntroDesc'], { clearProps: 'opacity,transform' });
      // SplitText.revert() restores the heading text but not the inline styles
      // we set for the mask-rise, so clear them explicitly.
      var contactHeading = document.getElementById('contactHeading');
      if (contactHeading) { contactHeading.style.display = ''; contactHeading.style.overflow = ''; }
    };
  });

  // ---------- MOBILE: no pins, simple fades ----------
  mm.add('(max-width: 768px) and (prefers-reduced-motion: no-preference)', function () {
    var splitStore = [];
    buildReveals(splitStore);
    buildAboutIntroStacked();
    buildHeaderAnims(splitStore);
    initContact(splitStore);

    // Project cards fade in stacked (no tilt on touch)
    revealProjects();

    ScrollTrigger.refresh();
    showProjectRowsIfInView();

    return function cleanup() {
      splitStore.forEach(function (s) { if (s && s.revert) s.revert(); });
      if (contactPressure) { contactPressure.destroy(); contactPressure = null; }
      var contactHeading = document.getElementById('contactHeading');
      if (contactHeading) { contactHeading.style.display = ''; contactHeading.style.overflow = ''; }
    };
  });

  // ---------- REDUCED MOTION: everything visible, no scroll effects ----------
  mm.add('(prefers-reduced-motion: reduce)', function () {
    gsap.set([
      '#aboutIntroTitle', '#aboutIntroDesc', '.timeline-item', '.reveal-line',
      '.hero-sub', '.hero-scroll-hint', '.section-title', '.section-index',
      '.project-row', '#timelineSpine'
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
      g34l: {
        title: 'G34L Midplane Voltage Drop',
        story: {
          lead: 'I set out to measure DC voltage drop (\u0394V) and temperature rise (\u0394T) across a Nokia G34L midplane under increasing load. I built a worst-case single-PSU test bench, staged current to 150 A, and logged sense points at both ends of the board. The goal was a clear read on whether IR drop stays in spec\u2014or whether the midplane needs a bus bar.',
          sections: [
            {
              heading: 'Will the midplane need a bus bar?',
              body: [
                'The question was direct: under heavy load on a single PSU, does voltage at the far end of the midplane stay within tolerance?',
                'I needed to stress the power distribution network in the worst realistic configuration and quantify both electrical drop and thermal rise along the board.'
              ]
            },
            {
              heading: 'How we simulated worst-case delivery',
              body: [
                'A 12 V backplane fed two PSUs, with only one active on 208 V input\u2014the absolute worst case for delivery. Cooling stayed fixed at 50% fan duty.',
                'A four-channel electronic load drew current at midplane positions B1, C1, B2, and C2. Four DMM sense points (A1, D1 near the PSU; C4, D4 at the far end) and two temperature probes (T1 near PSU, T2 at the far end) captured electrical and thermal gradients along the board.'
              ]
            },
            {
              heading: 'Building the high-current harness',
              body: [
                'The experiment required custom high-current wiring and careful mechanical integration. I fabricated 6 AWG harnesses with crimped ring terminals and heat-shrink insulation to route load current from the electronic load to the backplane.',
                'Loads were placed to maximize \u0394V between sense points while keeping cable routing compatible with the chassis envelope. Four low-duty 24 AWG sense leads with banana jacks fed the DMMs, and digital thermometer probes tracked thermal rise at both ends of the midplane.',
                'I sealed the chassis top with tape and beeswax cable ties to approximate production airflow during the run.'
              ]
            },
            {
              heading: 'How we stepped load and logged data',
              body: [
                'Measurements started at 0 A baseline, then continued at each programmed load step.',
                'I also captured readings at intermediate totals (4 A, 16 A, 40 A, 80 A, 100 A, and 150 A) to map how IR drop and dissipation evolved across the midplane.'
              ]
            }
          ],
          specs: [
            'Backplane voltage: 12 V',
            'Power supplies: 2 installed; 1 active on 208 V input (worst case)',
            'Fan speed: fixed at 50%',
            'Electronic load: 1 unit, 4 channels (CH1\u2013CH2: 300 W max; CH3\u2013CH4: 600 W max)',
            'Load positions: B1, C1, B2, C2',
            'DMM sense points: A1, D1 (PSU end), C4, D4 (far end)',
            'Temperature probes: T1 (PSU end), T2 (far end)'
          ],
          loadTable: {
            headers: ['Step', 'CH1', 'CH2', 'CH3', 'CH4', 'Total'],
            rows: [
              ['1', '1 A', '1 A', '1 A', '1 A', '4 A / 48 W'],
              ['2', '10 A', '10 A', '10 A', '10 A', '40 A / 480 W'],
              ['3', '20 A', '20 A', '20 A', '20 A', '80 A / 960 W'],
              ['4', '25 A', '25 A', '25 A', '25 A', '100 A / 1200 W'],
              ['5', '25 A', '25 A', '50 A', '50 A', '150 A / 1800 W']
            ]
          }
        },
        photos: [
          { src: A + 'g34l-backplane.jpg', caption: 'G34L midplane on the bench before harnessing \u2014 the PCB that distributes 12 V across the chassis.' },
          { src: A + 'g34l-wiring.jpg', caption: '6 AWG load cables with crimped ring terminals and heat-shrink insulation for high-current delivery to the backplane.' },
          { src: A + 'g34l-loads.jpg', caption: 'Load placement and cable routing tuned to maximize IR drop between sense points while preserving chassis fit.' },
          { src: A + 'g34l-chassis.jpg', caption: 'Midplane seated in the chassis with harness routed through the top opening.' },
          { src: A + 'g34l-sealed.jpg', caption: 'Chassis top sealed and cables secured with beeswax ties to mimic production airflow conditions.' },
          { src: A + 'g34l-programming.jpg?v=4', caption: 'Programming the four-channel electronic load for the staged current steps.' },
          { src: A + 'g34l-setup.jpg', caption: 'Full bench setup: PSU, electronic load, DMMs, and temperature instrumentation ready for characterization.' }
        ]
      },
      das: {
        title: 'Fiber DAS Vehicle Detection',
        story: {
          lead: 'Roadside fiber can sense vibration for kilometers\u2014but can a cabinet at the cable head detect passing vehicles in real time, without a data-center power budget? I helped build and downscale a CPU detection pipeline from an RTX workstation to Marvell network silicon, keeping 48/48 detection parity at every platform.',
          sections: [
            {
              heading: 'Can a roadside box detect cars from fiber vibrations?',
              body: [
                'Most infrastructure already has fiber in the ground. Distributed Acoustic Sensing (DAS) turns that cable into a continuous line of vibration sensors\u2014laser pulses scatter back from every point, and mechanical disturbances modulate the returning optical signal.',
                'The research team\u2019s goal was on-site, real-time vehicle detection at the cable head: process the stream as it arrives, flag moving vehicles with enough confidence to act on, and do it without a rack of servers or a data-center power budget in a roadside cabinet.'
              ]
            },
            {
              heading: 'What each acquisition window looks like',
              body: [
                'Each acquisition produces a strain-rate matrix: roughly fourteen thousand spatial channels sampled at about 238 Hz, forming a grid on the order of fourteen thousand channels by nine thousand time samples per window.',
                'That is about thirty-eight seconds of sensing over roughly seventy kilometers, with points spaced about five meters apart. Raw optical phase is unwrapped and differentiated to strain-rate, then bandpass filtered (2\u201340 Hz) to isolate vehicle energy.',
                'On a waterfall plot, stationary sources appear as horizontal bands. A moving vehicle leaves a diagonal streak whose slope encodes apparent speed along the fiber.'
              ]
            },
            {
              heading: 'How we find diagonal vehicle tracks',
              body: [
                'We explored three architectures before settling on one that could run in real time on CPU. A full-fiber envelope detector worked in the lab but wanted GPU-scale FFTs.',
                'A classical CV pipeline (Sobel, Hough, DBSCAN) was fragile and lacked physics-grounded confidence. The active system uses slant-stack moveout search: find energy seeds in the road-adjacent region, cut local patches, and scan a fan of apparent velocities\u2014where the trial slope matches a real vehicle, energy stacks coherently.',
                'A physics gate then confirms stripe contrast, vehicle-like speed (8\u201345 m/s), and spatial persistence. A small CNN was trained but rarely fired confidently; the decision stayed with the physics gate.'
              ]
            },
            {
              heading: 'Meeting the real-time deadline',
              body: [
                'Real time meant a concrete budget: each window covers about thirty-eight seconds of stream time, and processing must finish before the next window needs the same compute.',
                'A rolling buffer lives in shared memory. Each core owns a channel slab, runs bandpass and slant-stack seeding, applies the physics gate with correct global indexing, and returns fused detections.',
                'A tripwire gate at a configured channel projects vehicle tracks into directional counts. Scheduling adapts to recent compute times rather than a naive fixed timer.'
              ]
            },
            {
              heading: 'Stepping down from GPU to field silicon',
              body: [
                'We did not start at the edge. Development began on an RTX Pro 6000 workstation for fast iteration, then stepped down platform by platform, measuring real-time margin and detection parity at every stage.',
                'Jetson Thor became the reference edge node (~18.8 s per file, ~50% headroom, ~25 W). DGX Spark and Jetson Orin supported batch validation. A deliberately minimal 6-vCPU VM proved GPU was unnecessary at two workers (~29.9 s, 48/48 parity).',
                'The field-oriented target was Marvell\u2019s CN10624\u2014a 24-core Arm Neoverse-N2 network processor\u2014where I rebuilt Python from standalone binaries (no compiler on board) and validated the full chain over serial console.',
                'On Neoverse-N2 the bottleneck flipped from preprocessing to slant-stack, a reminder that platform optimization is not one-size-fits-all.'
              ]
            },
            {
              heading: 'Did parity hold across platforms?',
              body: [
                'On a twelve-file batch against hand-checked ground truth, the pipeline produced forty-eight raw candidates and sixteen high-confidence vehicles after the physics gate.',
                'The confirmed set was stable across every platform profiled\u201448/48 detection parity between Jetson, VM, and CN10624 runs. Faster or slower was acceptable; different answers were not.'
              ]
            }
          ],
          specsTitle: 'Key parameters',
          specs: [
            'Strain-rate grid: ~14k channels \u00d7 ~9k samples/window @ ~238 Hz',
            'Sensing span: ~70 km fiber, ~5 m channel spacing',
            'DSP: 4th-order Butterworth bandpass 2\u201340 Hz',
            'Real-time budget: 38 s per processing window',
            'Jetson Thor: ~18.8 s/file, ~25 W, ~50% headroom',
            'VM (2 workers): ~29.9 s/file, ~11 GB RSS, 48/48 parity',
            'Marvell CN10624 (2 workers): ~27.6 s/file, ~27% headroom, 48/48 parity'
          ],
          loadTable: {
            title: 'Hardware profiling arc',
            headers: ['Stage', 'Platform', 'Role'],
            rows: [
              ['Lab development', 'RTX Pro 6000', 'Fast iteration, early GPU-heavy pipelines'],
              ['Primary edge target', 'Jetson Thor', '~50% headroom, ~25 W'],
              ['Team benchmarking', 'DGX Spark', 'Batch validation / regression'],
              ['Edge baseline', 'Jetson Orin', 'Generational comparison'],
              ['Minimum compute', '6-vCPU VM (2 workers)', 'Proved GPU unnecessary'],
              ['Field selection', 'Marvell CN10624', '48/48 parity, infrastructure-grade']
            ]
          }
        },
        photos: [
          { src: A + 'das-principle.png', caption: 'Distributed Acoustic Sensing: a Silixa iDAS unit sends laser pulses through the fiber; acoustic fields modulate backscattered light returned for processing.' }
        ],
        hardwarePhotos: [
          { src: A + 'das-hw-rtx.jpg', caption: 'RTX Pro 6000 workstation \u2014 lab development and early GPU-heavy pipeline iteration.' },
          { src: A + 'das-hw-thor.jpg', caption: 'Jetson Thor \u2014 reference edge platform (~18.8 s/file, ~50% real-time headroom, ~25 W).' },
          { src: A + 'das-hw-dgx-spark.jpg', caption: 'NVIDIA DGX Spark \u2014 team benchmarking and batch regression runs.' },
          { src: A + 'das-hw-orin.jpg', caption: 'Jetson AGX Orin \u2014 generational edge baseline and CPU/GPU decoupling checks.' },
          { src: A + 'das-hw-marvell.jpg', caption: 'Marvell CN10624 (OCTEON 10-class Arm board) \u2014 field-oriented target with 48/48 detection parity.' }
        ]
      },
      beehive: {
        title: 'Beehive Acoustic Anomaly Detection',
        story: {
          lead: 'I partnered with an IIT professor to monitor honeybee colonies through in-hive sensing\u2014first in his lab, then remotely from a US apiary five minutes from home. I built a battery-powered sensor node and streamed weeks of synchronized audio, temperature, humidity, light, and hive mass for cross-climate anomaly detection.',
          sections: [
            {
              heading: 'What we were trying to learn across two continents',
              body: [
                'An ECE professor at IIT had an ongoing program to monitor honeybee colonies through in-hive sensing. My role was to replicate and extend that work for Apis mellifera\u2014the Western honey bee common in the United States\u2014and compare how different environmental conditions shape colony behavior.',
                'The cross-site goal was straightforward: pair acoustic signatures with temperature, humidity, light, and hive mass on both sides of the ocean and see whether the same anomalies appear under different climates.'
              ]
            },
            {
              heading: 'Learning the reference setup in person',
              body: [
                'I visited his lab at the start of summer to study the reference setup: where sensors sit relative to the brood nest, how audio is sampled without drowning in fan noise, and how his team labels events in the recordings.',
                'After returning home, we continued the collaboration remotely\u2014me building and deploying the US node while he provided baselines and feedback on the data streams.'
              ]
            },
            {
              heading: 'Why a healthy hive has a signature hum',
              body: [
                'A healthy colony sounds like a low, continuous hum: thousands of wing beats, fanning, and thoracic vibrations stacking into a dense buzz roughly between 100 and 1000 Hz, often strongest around 200\u2013500 Hz.',
                'Researchers use those sounds as a non-invasive vital sign. Queenlessness tends to make the hive noisier at lower frequencies; pre-swarm agitation shows up as rising amplitude and a shift toward 300\u2013600 Hz as workers prepare to leave.',
                'A weakening colony can slowly lose acoustic energy altogether. Audio alone is ambiguous\u2014the same frequency band can mean different things\u2014which is why we paired the microphone with environmental and mechanical sensors.'
              ]
            },
            {
              heading: 'What went on the perfboard',
              body: [
                'I built a battery-powered field logger on perfboard around an Arduino for acquisition and an ESP8266 NodeMCU for Wi-Fi upload. Power came from Li-ion cells through a TP4056 charger module, an LDO, and a step-down converter to feed the mixed 3.3 V / 5 V rails.',
                'A DHT22 tracked temperature and humidity, a TSL2561 measured ambient light, and a DGZZI water-level sensor monitored the hive\u2019s feeder reservoir. Hive mass trends came from a 10 kg load cell with an HX711 front-end to boost the microvolt-level signal.',
                'A DEVMO electret microphone captured in-hive audio. The stack was deliberately modular so I could swap boards during bring-up without rewiring the whole hive.'
              ]
            },
            {
              heading: 'Finding a host apiary close enough to iterate',
              body: [
                'Once the prototype ran reliably on the bench, I presented it to the NJ Beekeepers Association to find a host apiary. Several members were interested; I ended up working with Lew Goldberg, whose hives were only about five minutes from home.',
                'That proximity mattered\u2014beekeeping is hands-on, and I needed to iterate on mounting, cable routing, and power without long travel every time something needed adjustment.'
              ]
            },
            {
              heading: 'How data flowed back for comparison',
              body: [
                'In the field the node logged continuously and pushed files to an FTP server I hosted at home, giving me a steady stream of synchronized environmental readings and audio segments to compare against the professor\u2019s India-side dataset.',
                'The long-running capture is what made cross-climate comparison possible: you need weeks of baseline hum before a queen event or weather swing stands out in the features we used for anomaly detection.'
              ]
            }
          ],
          specsTitle: 'Sensor node BOM',
          specs: [
            'Power: Li-ion cells, TP4056 charging module, LDO on perfboard, step-down converter',
            'MCU / connectivity: Arduino (acquisition), ESP8266 NodeMCU v1 (Wi-Fi upload)',
            'Environment: DHT22 (temperature + relative humidity), TSL2561 (ambient light), DGZZI water-level sensor',
            'Mechanics: 10 kg load cell + HX711 amplifier (hive mass trend)',
            'Audio: DEVMO electret microphone module',
            'Field: battery-powered standalone enclosure, FTP upload to home server'
          ]
        },
        photos: [
          { src: A + 'beehive-farm.jpg', caption: 'Field visit in beekeeper gear before deploying the monitoring node at Lew Goldberg\u2019s apiary.' },
          { src: A + 'beehive-sensors.jpg', caption: 'Perfboard sensor stack: load-cell front-end, environmental sensors, microphone, and power/charging path.' }
        ]
      },
      pfizer: {
        title: 'Pfizer Software Access Classifier',
        story: {
          lead: 'Pfizer employees request software access through free-text tickets\u2014and reviewers have to judge each one against role and project context. Our summer team built a classifier that recommends grant, deny, or escalate without keyword shortcuts, trained entirely on-prem with human review still in the loop.',
          sections: [
            {
              heading: 'Why a ticket queue needs a consistent first pass',
              body: [
                'Employees request access to software and hardware through internal ticketing\u2014free-text messages describing what they need, why they need it, and how urgently. Reviewers must decide whether each request is appropriate for the requester\u2019s role and project context.',
                'At enterprise scale that queue is slow, inconsistent, and hard to staff uniformly. The goal of our summer project was a model that could read a request message and recommend whether access should be granted, denied, or escalated for human review\u2014not to replace judgment, but to give reviewers a consistent first pass.'
              ]
            },
            {
              heading: 'How we framed and evaluated the problem',
              body: [
                'We framed the task as supervised text classification on historical tickets paired with reviewer outcomes. After exploratory analysis we found the usual enterprise skew: far more legitimate requests than clear rejects, so class imbalance had to be handled explicitly in training and evaluation.',
                'We used a stratified train\u2013validation split, held out recent tickets to approximate production drift, and built a lightweight evaluation harness that tracked precision and recall separately for grant vs. deny recommendations\u2014because a false approval and a false rejection carry very different risk.'
              ]
            },
            {
              heading: 'Why we banned keyword auto-accept rules',
              body: [
                'A hard constraint from day one: no keyword-based auto-accept or auto-reject rules. Allowlists and blocklists are trivially gameable\u2014add the right product name or business justification and the ticket bypasses scrutiny.',
                'Instead we used TF-IDF character and word n-grams feeding a calibrated linear classifier, with features derived from the full message rather than brittle phrase gates. We later compared against a small fine-tuned text encoder; both learned distributed patterns of role-appropriate need vs. weak or mismatched justification.',
                'High-confidence predictions could pre-sort the queue, but binding grants still flowed through human review. We biased thresholds toward precision on auto-approvals: when the model was unsure, it routed to a person rather than guessing.'
              ]
            },
            {
              heading: 'Working inside sensitive-data boundaries',
              body: [
                'Request text sits next to employee identity, org structure, and system inventories\u2014data we could not treat casually. All development stayed on VPN-connected, approved workstations inside the corporate boundary.',
                'No external LLM or cloud APIs touched raw ticket content; no copying datasets to personal machines; minimal logging of message bodies during experimentation. Aggregated metrics and anonymized examples went through security review before they left the project sandbox.',
                'Model artifacts and notebooks lived in internal stores with access scoped to the team. Those limits shaped what we could iterate on quickly, but they were non-negotiable.'
              ]
            },
            {
              heading: 'How three interns shipped it',
              body: [
                'Three interns\u2014me (Rohit), Om, and Kriti\u2014built the pipeline under Lenny Grinberg\u2019s guidance. We split labeling review, feature experiments, and the evaluation harness; paired on code review so no single person owned the whole path from raw text to recommended action.',
                'At the end of the summer we presented the final model, its failure modes, and deployment recommendations to Pfizer executives: where automation helped, where humans had to stay in the loop, and why keyword shortcuts were the wrong tradeoff for access control.'
              ]
            }
          ],
          specsTitle: 'Stack & data handling',
          specs: [
            'Python, pandas, scikit-learn; optional small transformer baseline for comparison',
            'TF-IDF n-gram features + calibrated linear classifier (no keyword allow/block lists)',
            'Stratified train\u2013validation split with class-imbalance-aware evaluation',
            'On-prem / VPN-only development; no external APIs on raw request text',
            'Security-reviewed handling; minimal content logging; internal artifact storage',
            'Human-in-the-loop routing for low-confidence and high-risk grant decisions'
          ]
        },
        photos: [
          { src: A + 'pfizer-nyc.jpg', caption: "On-site at Pfizer's New York City branch." },
          { src: A + 'pfizer-interns.jpg', caption: 'With the Pfizer summer intern cohort.' }
        ]
      },
      airquality: {
        title: 'Urban Air Quality \u2014 Deep Learning',
        story: {
          lead: 'Over 91% of the world breathes air above WHO limits\u2014but the AQI alone does not tell you whether a policy will actually help. I built an LSTM that fuses EPA pollutants, traffic data, and NASA meteorology to forecast AQI and score countermeasures before cities commit resources.',
          sections: [
            {
              heading: 'Why AQI alone is not enough for policy decisions',
              body: [
                'Over 91% of the global population lives where air quality exceeds WHO limits. Fine particulate matter (PM2.5) drives much of the health burden\u2014respiratory disease, cardiovascular stress, premature mortality\u2014alongside criteria gases such as NO\u2082, SO\u2082, O\u2083, and CO.',
                'The Air Quality Index standardizes pollutant concentrations into a single score, but that score treats chemistry in isolation: it does not fold in meteorology (temperature, humidity, wind), traffic flow, or urban activity patterns that jointly set how pollution accumulates and disperses.',
                'There was also no practical way to quantify whether a proposed countermeasure\u2014transit promotion, dust controls, industrial caps\u2014would actually move the needle before committing resources.'
              ]
            },
            {
              heading: 'Pulling EPA, DOT, and NASA into one training set',
              body: [
                'The model pulls from three families of sources. Pollutant and AQI history came from the U.S. EPA (criteria gases, particulates, toxics).',
                'Traffic context used the U.S. DOT Open Data Catalog\u2014active work zones, site analytics, peak-hour counts, and high-density corridors\u2014with equivalent ministry or vendor feeds for cities outside the U.S.',
                'Meteorology came from NASA Giovanni MERRA-2 reanalysis. I wrote a pipeline that queries Giovanni by time window and coordinates, converts the returned heatmaps into tabular features, and lands everything in aligned CSV frames ready for training.'
              ]
            },
            {
              heading: 'Which features mattered, and how the LSTM fits',
              body: [
                'Before training, an Extra Trees Regressor ranked feature importance and surfaced the top ten drivers\u2014among them average wind speed, average relative humidity, maximum sustained wind speed, and average visibility (see the correlation heatmap and pairplot on the poster).',
                'The predictor is a single-layer LSTM with 100 units: it ingests a sequence of past observations and regresses the AQI at the next timestep.',
                'Training ran 500 epochs with batch size 32 (eight optimizer steps per epoch, ~4 ms each), completing a full fit in about 32 seconds\u2014fast enough to iterate on countermeasure what-if scenarios without waiting on heavier classical regressors.'
              ]
            },
            {
              heading: 'Scoring real countermeasures in Mumbai',
              body: [
                'Once the forward model was accurate, I used it to score historical relief actions by perturbing the parameters each policy would touch\u2014traffic peak hours, traffic concentration, criteria-gas levels, visibility\u2014and measuring the percent change in predicted AQI.',
                'Mumbai was the demonstration city: coastal meteorology, persistently poor air, and a string of interventions over the past five years made it a strong test case.',
                'Construction dust controls (2016) showed the largest modeled drop (\u221225.9%); promoting public transport (2019) and industrial emission controls (2019) landed near \u22129% and \u221211%; green initiatives (2022) were modest (\u22122.1%); a 2023 electric-vehicle push registered a slight increase (+8.3%), flagging that not every policy moves AQI in the expected direction under local conditions.'
              ]
            },
            {
              heading: 'How accurate was the model on holdout data?',
              body: [
                'On Mumbai 2019\u20132023 holdout data the LSTM reached a test RMSE of 0.266\u2014substantially below the conventional regression baselines plotted in Fig. 6. Sample traces for 2023 track observed AQI closely (Fig. 5).',
                'Forward forecasts for 2025 skew heavily toward unhealthy categories (80.2% unhealthy, 17.7% unhealthy for sensitive groups), underscoring why preemptive countermeasure selection matters.',
                'The runtime budget stays under one minute end-to-end, so analysts can explore parameter tweaks interactively rather than batching overnight jobs.'
              ]
            },
            {
              heading: 'From science fair to AJAS',
              body: [
                'The work advanced from proposal to poster with guidance from Mr. Craig Queenan and Dr. Dina Ellsworth. I presented at the Jersey Shore Science Fair, Delaware Valley Science & Engineering Fair, New Jersey Academy of Science (NJAS), and American Junior Academy of Science (AJAS), earning recognition at each.',
                'The longer-term goal is automated countermeasure recommendations\u2014for a high-traffic corridor like Chicago, the model would suggest which intervention and what deployment window best match the forecast meteorological, traffic, and pollutant state.'
              ]
            }
          ],
          specsTitle: 'Model & data parameters',
          specs: [
            'Pollutants: PM2.5, NO\u2082, SO\u2082, O\u2083, CO, lead + EPA AQI',
            'Meteorology (MERRA-2): temperature, humidity, wind speed, visibility, cloud-top pressure',
            'Traffic: peak hours, corridor concentration, work-zone activity',
            'Feature selection: Extra Trees Regressor \u2192 top 10 influential features',
            'LSTM: 100 units, 500 epochs, batch 32; ~32 s training; test RMSE 0.266 (Mumbai 2019\u20132023)',
            'Countermeasure demo city: Mumbai (2016\u20132023 interventions)'
          ]
        },
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
      var isDiagram = /\.svg$/i.test(src) || /das-principle\.png$/i.test(src);
      fig.className = (cls || 'gallery-item') + (isDiagram ? ' gallery-item--diagram' : '');
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

    function buildStory(story) {
      if (!story) return null;
      var wrap = document.createElement('div');
      wrap.className = 'project-story';

      if (story.lead) {
        var lead = document.createElement('p');
        lead.className = 'project-story-lead';
        lead.textContent = story.lead;
        wrap.appendChild(lead);
      }

      (story.sections || []).forEach(function (sec) {
        var h = document.createElement('h3');
        h.className = 'project-story-heading';
        h.textContent = sec.heading;
        wrap.appendChild(h);
        var bodies = Array.isArray(sec.body) ? sec.body : [sec.body];
        bodies.forEach(function (text) {
          if (!text) return;
          var p = document.createElement('p');
          p.textContent = text;
          wrap.appendChild(p);
        });
      });

      if (story.specs && story.specs.length) {
        var hSpecs = document.createElement('h4');
        hSpecs.textContent = story.specsTitle || 'Instrumentation & setup';
        wrap.appendChild(hSpecs);
        var ul = document.createElement('ul');
        ul.className = 'project-specs';
        story.specs.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }

      if (story.loadTable) {
        var hTable = document.createElement('h4');
        hTable.textContent = story.loadTable.title || 'Load schedule';
        wrap.appendChild(hTable);
        var tableWrap = document.createElement('div');
        tableWrap.className = 'project-table-wrap';
        var table = document.createElement('table');
        table.className = 'project-table';
        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        story.loadTable.headers.forEach(function (label) {
          var th = document.createElement('th');
          th.textContent = label;
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        story.loadTable.rows.forEach(function (row) {
          var tr = document.createElement('tr');
          row.forEach(function (cell) {
            var td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        wrap.appendChild(tableWrap);
      }

      return wrap;
    }

    function openProject(key) {
      var data = PROJECTS[key];
      if (!data) return;
      lastFocus = document.activeElement;
      titleEl.textContent = data.title;
      galleryEl.innerHTML = '';
      galleryEl.scrollTop = 0;

      var storyEl = buildStory(data.story);
      if (storyEl) galleryEl.appendChild(storyEl);

      var photos = document.createElement('div');
      photos.className = 'gallery-photos';
      (data.photos || []).forEach(function (p) { photos.appendChild(figure(p.src, p.caption)); });
      galleryEl.appendChild(photos);

      if (data.hardwarePhotos && data.hardwarePhotos.length) {
        var hHw = document.createElement('h4');
        hHw.className = 'gallery-hardware-heading';
        hHw.textContent = 'Profiling platforms';
        galleryEl.appendChild(hHw);
        var hw = document.createElement('div');
        hw.className = 'gallery-photos gallery-photos--hardware';
        data.hardwarePhotos.forEach(function (p) { hw.appendChild(figure(p.src, p.caption)); });
        galleryEl.appendChild(hw);
      }

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

    var cards = document.querySelectorAll('.project-row[data-project]');
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
     The hero background is handled by the hero-backgrounds.js module.
     Prime hidden sub/hint, then run the name scramble + idle motion. */
  initName();
  playHeroIntro();

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
        showProjectRowsIfInView();
        if (smoother) smoother.scrollTo(target, false, 'top top');
        else gsap.set(window, { scrollTo: { y: target } });
        gsap.delayedCall(0.5, showProjectRowsIfInView);
      });
    });
  })();

})();
