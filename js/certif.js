/* ==========================================================================
   certif.js — Navigation de la présentation plein écran.
   Flèches / espace, points de pagination, swipe tactile, et une URL par
   diapositive (#3) pour pouvoir partager un point précis.
   ========================================================================== */
(function () {
    'use strict';

    var track = document.getElementById('slidesTrack');
    if (!track) return;

    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    var total = slides.length;
    if (!total) return;

    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var counter = document.getElementById('slideCounter');
    var progress = document.getElementById('progressFill');
    var dotsWrap = document.getElementById('dotsContainer');
    var liveRegion = document.getElementById('slideLive');

    var current = 0;
    var barsAnimated = false;

    function pad2(n) { return String(n).padStart(2, '0'); }

    /* ---------- Points de pagination ---------- */
    var dots = [];
    for (var i = 0; i < total; i++) {
        (function (index) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'dot' + (index === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Aller à la diapositive ' + (index + 1) + ' sur ' + total);
            dot.addEventListener('click', function () { goTo(index); });
            dotsWrap.appendChild(dot);
            dots.push(dot);
        })(i);
    }

    /* ---------- Navigation ---------- */
    function goTo(n, options) {
        options = options || {};
        if (n < 0 || n >= total || n === current) return;

        slides[current].classList.remove('active');
        current = n;
        slides[current].classList.add('active');

        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        counter.textContent = pad2(current + 1) + ' / ' + pad2(total);
        progress.style.width = (((current + 1) / total) * 100) + '%';

        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
        dots.forEach(function (dot, index) {
            dot.classList.toggle('active', index === current);
            if (index === current) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });

        if (liveRegion) {
            var heading = slides[current].querySelector('.slide-h1, .slide-h2');
            liveRegion.textContent = 'Diapositive ' + (current + 1) + ' sur ' + total +
                (heading ? ' — ' + heading.textContent.trim() : '');
        }

        if (options.push !== false) {
            var url = current === 0
                ? window.location.pathname + window.location.search
                : '#' + (current + 1);
            window.history.replaceState(null, '', url);
        }

        // Les jauges de scores ne s'animent qu'à la première arrivée sur la diapo.
        if (slides[current].hasAttribute('data-animate-scores') && !barsAnimated) {
            barsAnimated = true;
            window.setTimeout(animateBars, 350);
        }
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });

    /* ---------- Jauges de scores ---------- */
    function countUp(el, target) {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) { el.textContent = target; return; }

        var value = 0;
        var step = target / 40;
        var timer = window.setInterval(function () {
            value = Math.min(value + step, target);
            el.textContent = Math.round(value);
            if (value >= target) window.clearInterval(timer);
        }, 18);
    }

    function animateBars() {
        var cards = Array.prototype.slice.call(document.querySelectorAll('.result-card'));
        var sum = 0;
        var count = 0;

        cards.forEach(function (card) {
            var score = parseInt(card.getAttribute('data-score'), 10);
            if (isNaN(score)) return;

            sum += score;
            count++;

            var bar = card.querySelector('.result-bar');
            var val = card.querySelector('.score-val');
            if (bar) bar.style.width = score + '%';
            if (val) countUp(val, score);
        });

        if (!count) return;

        var average = Math.round(sum / count);
        var avgEl = document.getElementById('avgValue');
        var avgWrap = document.getElementById('resultsAverage');
        if (avgWrap) avgWrap.classList.add('visible');
        if (avgEl) countUp(avgEl, average);
    }

    /* ---------- Clavier ---------- */
    document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
            event.preventDefault();
            goTo(current + 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            goTo(current - 1);
        } else if (event.key === 'Home') {
            event.preventDefault();
            goTo(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            goTo(total - 1);
        } else if (event.key === 'Escape') {
            // Le raccourci annoncé en bas de page : retour au portfolio.
            window.location.href = 'index.html';
        }
    });

    /* ---------- Swipe tactile ---------- */
    var touchStartX = 0;
    var touchStartY = 0;

    document.addEventListener('touchstart', function (event) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (event) {
        var dx = event.changedTouches[0].clientX - touchStartX;
        var dy = event.changedTouches[0].clientY - touchStartY;
        // On ignore les gestes principalement verticaux (défilement mobile).
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            goTo(current + (dx < 0 ? 1 : -1));
        }
    }, { passive: true });

    /* ---------- Hash modifié à la main ---------- */
    window.addEventListener('hashchange', function () {
        var n = parseInt((window.location.hash || '').replace('#', ''), 10);
        if (isNaN(n)) n = 1;
        if (n >= 1 && n <= total) goTo(n - 1, { push: false });
    });

    /* ---------- Amorçage ---------- */
    var fromHash = parseInt((window.location.hash || '').replace('#', ''), 10);
    counter.textContent = pad2(1) + ' / ' + pad2(total);
    progress.style.width = (100 / total) + '%';
    prevBtn.disabled = true;
    nextBtn.disabled = total <= 1;

    if (!isNaN(fromHash) && fromHash > 1 && fromHash <= total) {
        goTo(fromHash - 1, { push: false });
    } else if (slides[0].hasAttribute('data-animate-scores')) {
        barsAnimated = true;
        window.setTimeout(animateBars, 350);
    }
})();
