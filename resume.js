/* resume.js — cursor + light polish for resume.html */
(function () {
  'use strict';

  var cursorDot = document.getElementById('cursorDot');
  if (cursorDot && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
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
    document.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursorDot.classList.add('expanded'); });
      el.addEventListener('mouseleave', function () { cursorDot.classList.remove('expanded'); });
    });
  }
})();
