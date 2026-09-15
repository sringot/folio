/* ==========================================================================
   portfolio.js — Logique de la page principale.

   Sommaire :
     1. Utilitaires
     2. Repli des images absentes
     3. Repli des icônes Devicon
     4. Vignettes de la certification CNIL
     5. Navigation SPA (avec URL partageables)
     6. Timeline SVG
     7. Rejeu des animations
     8. Filtres des réalisations
     9. Modales (documents + articles)
    10. Menu mobile
    11. Clavier
    12. Révélation au défilement
    13. Amorçage
   ========================================================================== */
(function () {
    'use strict';

    /* ======================================================================
       1. UTILITAIRES
       ====================================================================== */

    var VIEWS = ['home', 'parcours', 'missions', 'veille', 'contact'];
    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])';

    function $(selector, scope) { return (scope || document).querySelector(selector); }
    function $$(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    /** Piège le focus dans un conteneur pendant qu'une modale est ouverte. */
    function trapFocus(container, event) {
        var nodes = $$(FOCUSABLE, container).filter(function (el) {
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
        });
        if (!nodes.length) return;

        var first = nodes[0];
        var last = nodes[nodes.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /* ======================================================================
       2. REPLI DES IMAGES ABSENTES
       Tant qu'un visuel n'a pas été déposé dans assets/, le navigateur
       afficherait une icône « image cassée ». On la remplace par un cadre
       neutre qui reprend le texte alternatif.
       ====================================================================== */

    var PICTURE_ICON =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
        '<circle cx="8.5" cy="8.5" r="1.5"/>' +
        '<polyline points="21 15 16 10 5 21"/></svg>';

    function replaceWithFallback(img) {
        // Certaines images ont leur propre repli (vignettes CNIL) : on n'y touche pas.
        if (img.hasAttribute('data-own-fallback')) return;
        if (!img.parentNode || img.dataset.fallbackDone === '1') return;
        img.dataset.fallbackDone = '1';

        var box = document.createElement('div');
        box.className = 'img-fallback';
        if (img.classList.contains('mission-card-img')) box.classList.add('mission-card-img');
        box.innerHTML = PICTURE_ICON + '<span></span>';
        box.querySelector('span').textContent = img.getAttribute('alt') || 'Visuel à venir';

        img.parentNode.replaceChild(box, img);
    }

    // Les événements « error » des images ne remontent pas : on écoute en capture.
    document.addEventListener('error', function (event) {
        var target = event.target;
        if (target && target.tagName === 'IMG') replaceWithFallback(target);
    }, true);

    /* ======================================================================
       3. REPLI DES ICÔNES DEVICON
       Si la feuille de style du CDN ne se charge pas (hors-ligne, réseau
       filtré), les icônes techno deviennent invisibles. On bascule alors sur
       le nom de la techno, porté par l'attribut data-label.
       ====================================================================== */

    function watchDeviconStylesheet() {
        var link = $('link[data-devicon]');
        if (!link) return;
        link.addEventListener('error', function () {
            document.documentElement.classList.add('no-devicon');
        });
    }

    /* ======================================================================
       4. VIGNETTES DE LA CERTIFICATION CNIL
       Source unique de vérité pour les 6 modules : les scores affichés ici
       sont les mêmes que ceux de certif-cnil.html.
       ====================================================================== */

    var CNIL_MODULES = [
        { num: 1, name: 'Le RGPD et ses notions clés',                 score: 93 },
        { num: 2, name: 'Les principes de la protection des données',  score: 91 },
        { num: 3, name: 'Les responsabilités des acteurs',             score: 93 },
        { num: 4, name: 'Le DPO et les outils de la conformité',       score: 80 },
        { num: 5, name: 'Les collectivités territoriales',             score: 98 },
        { num: 6, name: 'Travail et données personnelles',             score: 80 }
    ];

    function pad2(n) { return String(n).padStart(2, '0'); }

    /**
     * Construit les 6 vignettes. Chacune tente d'afficher l'attestation
     * (assets/cnil/module-N.png) ; à défaut, elle affiche le score obtenu.
     */
    function renderCnilModules() {
        var grid = $('#cnilModulesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        CNIL_MODULES.forEach(function (mod) {
            var cell = document.createElement('div');
            cell.className = 'certif-module';

            var img = document.createElement('img');
            img.src = 'assets/cnil/module-' + mod.num + '.png';
            img.alt = 'Attestation CNIL — module ' + pad2(mod.num) + ' : ' + mod.name;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.setAttribute('data-own-fallback', '');

            // Pas d'attestation déposée : on affiche le score à la place.
            img.addEventListener('error', function () {
                if (img.dataset.fallbackDone === '1') return;
                img.dataset.fallbackDone = '1';

                var tile = document.createElement('div');
                tile.className = 'certif-module-fallback';
                tile.innerHTML =
                    '<span class="certif-module-num">Module ' + pad2(mod.num) + '</span>' +
                    '<span class="certif-module-score">' + mod.score + '<small>%</small></span>';
                if (img.parentNode) img.parentNode.replaceChild(tile, img);
            });

            var label = document.createElement('p');
            label.className = 'certif-module-label';
            label.textContent = mod.name;

            cell.appendChild(img);
            cell.appendChild(label);
            grid.appendChild(cell);
        });
    }

    /* ======================================================================
       5. NAVIGATION SPA
       Chaque vue possède désormais une URL (#parcours, #missions…) : les
       liens sont partageables et le bouton « retour » du navigateur marche.
       ====================================================================== */

    var currentView = 'home';
    var isTransitioning = false;

    function viewFromHash() {
        var id = (window.location.hash || '').replace(/^#\/?/, '');
        return VIEWS.indexOf(id) !== -1 ? id : 'home';
    }

    function updateNavActive(viewId) {
        $$('.nav-link').forEach(function (link) {
            var isActive = link.getAttribute('data-nav') === viewId;
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        $$('.mobile-menu button').forEach(function (btn) {
            btn.classList.toggle('mobile-active', btn.getAttribute('data-nav') === viewId);
        });
    }

    /** Bascule immédiate, sans animation (amorçage / restauration d'URL). */
    function setViewImmediate(viewId) {
        $$('.view').forEach(function (view) {
            view.classList.remove('active', 'visible');
        });
        var next = document.getElementById('view-' + viewId);
        if (!next) return;
        next.classList.add('active', 'visible');
        currentView = viewId;
        updateNavActive(viewId);
        restartAnimations(next);
    }

    function navigateTo(viewId, options) {
        options = options || {};
        if (VIEWS.indexOf(viewId) === -1) return;
        if (isTransitioning || viewId === currentView) return;

        isTransitioning = true;
        closeMobileMenu();

        if (options.push !== false) {
            var url = viewId === 'home'
                ? window.location.pathname + window.location.search
                : '#' + viewId;
            window.history.pushState({ view: viewId }, '', url);
        }

        var current = document.getElementById('view-' + currentView);
        var next = document.getElementById('view-' + viewId);
        if (!current || !next) { isTransitioning = false; return; }

        current.classList.remove('visible');

        window.setTimeout(function () {
            current.classList.remove('active');
            window.scrollTo({ top: 0, behavior: 'instant' });

            next.classList.add('active');
            void next.offsetWidth;
            restartAnimations(next);
            updateNavActive(viewId);

            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    next.classList.add('visible');
                    currentView = viewId;

                    // Le lecteur d'écran doit repartir du début de la vue.
                    if (options.focus !== false) {
                        try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); }
                    }

                    window.setTimeout(function () { isTransitioning = false; }, 350);
                });
            });
        }, 250);
    }

    window.addEventListener('popstate', function () {
        navigateTo(viewFromHash(), { push: false });
    });

    // Hash modifié à la main dans la barre d'adresse (pas toujours un popstate).
    window.addEventListener('hashchange', function () {
        navigateTo(viewFromHash(), { push: false });
    });

    document.addEventListener('click', function (event) {
        var trigger = event.target.closest('[data-nav]');
        if (!trigger) return;
        event.preventDefault();
        navigateTo(trigger.getAttribute('data-nav'));
    });

    /* ======================================================================
       6. TIMELINE SVG
       Relie les pastilles de la formation par une courbe, en desktop.
       ====================================================================== */

    function buildTimelinePath() {
        var timeline = $('.timeline');
        if (!timeline) return;

        var existing = $('.timeline-svg-path', timeline);
        if (existing) existing.remove();
        if (window.innerWidth < 700) return;

        var dots = $$('.timeline-dot', timeline);
        if (dots.length < 2) return;

        var containerRect = timeline.getBoundingClientRect();
        var points = dots.map(function (dot) {
            var r = dot.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - containerRect.left,
                y: r.top + r.height / 2 - containerRect.top
            };
        });

        var d = 'M ' + points[0].x + ' ' + points[0].y;
        for (var i = 1; i < points.length; i++) {
            var p = points[i - 1];
            var c = points[i];
            var midY = (p.y + c.y) / 2;
            d += ' C ' + p.x + ',' + midY + ' ' + c.x + ',' + midY + ' ' + c.x + ',' + c.y;
        }

        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.classList.add('timeline-svg-path');
        svg.setAttribute('aria-hidden', 'true');

        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue('--timeline-line').trim());
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-linecap', 'round');

        svg.appendChild(path);
        timeline.insertBefore(svg, timeline.firstChild);

        var length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                path.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s';
                path.style.strokeDashoffset = '0';
            });
        });
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(buildTimelinePath, 200);
    });
    document.documentElement.addEventListener('themechange', function () {
        window.setTimeout(buildTimelinePath, 50);
    });

    /* ======================================================================
       7. REJEU DES ANIMATIONS À CHAQUE CHANGEMENT DE VUE
       ====================================================================== */

    function restartAnimations(container) {
        $$('.timeline-item, .mission-card, .veille-lab-block, .contact-wrapper, .about-me-block, .cv-card-inline, .synthesis-card-bottom, .home-content', container)
            .forEach(function (el) {
                el.style.animation = 'none';
                void el.offsetWidth;
                el.style.animation = '';
            });

        $$('.certif-card, .certif-section-header', container).forEach(function (el) {
            el.classList.remove('reveal-visible');
        });
        setupScrollReveal(container);

        if ($('.timeline', container)) window.setTimeout(buildTimelinePath, 820);
        if ($('.filter-toggle-wrapper', container)) resetFilters(container);
    }

    /* ======================================================================
       8. FILTRES DES RÉALISATIONS
       Catégorie (un choix) + compétences BTS (choix multiple, en « OU »).
       ====================================================================== */

    var activeCategory = 'all';
    var activeSkills = [];

    function toggleFilterDropdown(force) {
        var btn = $('#filterToggleBtn');
        var dropdown = $('#filterDropdown');
        if (!btn || !dropdown) return;

        var open = typeof force === 'boolean' ? force : !dropdown.classList.contains('open');
        dropdown.classList.toggle('open', open);
        btn.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
    }

    function handleFilterChip(chip) {
        var type = chip.getAttribute('data-type');
        var value = chip.getAttribute('data-filter');

        if (type === 'category') {
            $$('.filter-chip[data-type="category"]').forEach(function (c) {
                c.classList.remove('active');
                c.setAttribute('aria-pressed', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-pressed', 'true');
            activeCategory = value;

            // « Tous » remet aussi les compétences à zéro.
            if (value === 'all') {
                $$('.filter-chip-skill').forEach(function (c) {
                    c.classList.remove('active');
                    c.setAttribute('aria-pressed', 'false');
                });
                activeSkills = [];
            }
        } else if (type === 'skill') {
            var isActive = chip.classList.toggle('active');
            chip.setAttribute('aria-pressed', String(isActive));
            if (isActive) {
                if (activeSkills.indexOf(value) === -1) activeSkills.push(value);
            } else {
                activeSkills = activeSkills.filter(function (s) { return s !== value; });
            }
        } else {
            return;
        }

        applyFilters();
        updateFilterCount();
    }

    function applyFilters() {
        var visibleIndex = 0;
        var matching = 0;

        $$('.mission-card').forEach(function (card) {
            var category = card.getAttribute('data-category');
            var skills = (card.getAttribute('data-skills') || '').split(',').map(function (s) {
                return s.trim();
            });

            var categoryMatch = activeCategory === 'all' || category === activeCategory;
            var skillMatch = activeSkills.length === 0 || skills.some(function (skill) {
                return activeSkills.indexOf(skill) !== -1;
            });

            if (categoryMatch && skillMatch) {
                matching++;
                card.classList.remove('card-hidden');
                card.style.transitionDelay = (visibleIndex * 0.06) + 's';
                window.requestAnimationFrame(function () { card.classList.add('card-visible'); });
                visibleIndex++;
            } else {
                card.classList.remove('card-visible');
                card.style.transitionDelay = '0s';
                window.setTimeout(function () {
                    if (!card.classList.contains('card-visible')) card.classList.add('card-hidden');
                }, 350);
            }
        });

        var empty = $('#missionsEmpty');
        if (empty) empty.hidden = matching !== 0;
    }

    function updateFilterCount() {
        var countEl = $('#filterActiveCount');
        if (!countEl) return;

        var count = (activeCategory !== 'all' ? 1 : 0) + activeSkills.length;
        countEl.textContent = count;
        countEl.classList.toggle('visible', count > 0);
    }

    function resetFilters(container) {
        toggleFilterDropdown(false);

        $$('.filter-chip', container).forEach(function (chip) {
            var isAll = chip.getAttribute('data-filter') === 'all';
            chip.classList.toggle('active', isAll);
            chip.setAttribute('aria-pressed', String(isAll));
        });
        $$('.filter-chip-skill', container).forEach(function (chip) {
            chip.classList.remove('active');
            chip.setAttribute('aria-pressed', 'false');
        });
        $$('.mission-card', container).forEach(function (card, i) {
            card.classList.remove('card-hidden');
            card.classList.add('card-visible');
            card.style.transitionDelay = (i * 0.06) + 's';
        });

        activeCategory = 'all';
        activeSkills = [];
        updateFilterCount();

        var empty = $('#missionsEmpty');
        if (empty) empty.hidden = true;
    }

    document.addEventListener('click', function (event) {
        if (event.target.closest('#filterToggleBtn')) {
            toggleFilterDropdown();
            return;
        }

        var chip = event.target.closest('.filter-chip, .filter-chip-skill');
        if (chip) {
            handleFilterChip(chip);
            return;
        }

        // Clic à l'extérieur : on referme le panneau de filtres.
        if (!event.target.closest('#filterToggleWrapper')) toggleFilterDropdown(false);
    });

    /* ======================================================================
       9. MODALES
       ====================================================================== */

    var lastFocused = null;

    function openModal(modal, firstFocus) {
        lastFocused = document.activeElement;
        modal.classList.add('active');
        modal.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        if (firstFocus) window.setTimeout(function () { firstFocus.focus(); }, 30);
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        lastFocused = null;
    }

    /* ---------- Modale documents (PDF / image) ---------- */

    var mediaModal = $('#mediaModal');
    var modalPdf = $('#modalPdf');
    var modalImg = $('#modalImg');
    var modalDownloadBtn = $('#modalDownloadBtn');
    var modalTitle = $('#mediaModalTitle');

    function openPdfModal(href, label) {
        if (!mediaModal) return;
        modalImg.hidden = true;
        modalImg.removeAttribute('src');
        modalPdf.hidden = false;
        modalPdf.src = href + '#toolbar=0&navpanes=0';
        modalPdf.title = label || 'Document';
        modalDownloadBtn.href = href;
        if (modalTitle) modalTitle.textContent = label || 'Document';
        openModal(mediaModal, $('.media-modal-close', mediaModal));
    }

    function openImageModal(src, label) {
        if (!mediaModal) return;
        modalPdf.hidden = true;
        modalPdf.removeAttribute('src');
        modalImg.hidden = false;
        modalImg.src = src;
        modalImg.alt = label || '';
        modalDownloadBtn.href = src;
        if (modalTitle) modalTitle.textContent = label || 'Image';
        openModal(mediaModal, $('.media-modal-close', mediaModal));
    }

    function closeMediaModal() {
        if (!mediaModal) return;
        closeModal(mediaModal);
        // On vide les sources après la transition pour éviter un saut visuel.
        window.setTimeout(function () {
            modalPdf.removeAttribute('src');
            modalImg.removeAttribute('src');
        }, 300);
    }

    /* ---------- Modale articles (veille & lab) ---------- */

    var articleModal = $('#articleModal');

    function openArticleModal(contentId) {
        if (!articleModal) return;
        $$('.article-body', articleModal).forEach(function (el) { el.hidden = true; });

        var target = document.getElementById(contentId);
        if (target) {
            target.hidden = false;
            articleModal.setAttribute('aria-labelledby', contentId + '-title');
        }
        $('.article-modal-content', articleModal).scrollTop = 0;
        openModal(articleModal, $('.article-close-btn', articleModal));
    }

    document.addEventListener('click', function (event) {
        var pdfTrigger = event.target.closest('[data-open-pdf]');
        if (pdfTrigger) {
            event.preventDefault();
            openPdfModal(pdfTrigger.getAttribute('data-open-pdf'), pdfTrigger.getAttribute('data-doc-label'));
            return;
        }

        var imgTrigger = event.target.closest('[data-open-image]');
        if (imgTrigger) {
            event.preventDefault();
            openImageModal(imgTrigger.getAttribute('data-open-image'), imgTrigger.getAttribute('data-doc-label'));
            return;
        }

        var articleTrigger = event.target.closest('[data-open-article]');
        if (articleTrigger) {
            event.preventDefault();
            openArticleModal(articleTrigger.getAttribute('data-open-article'));
            return;
        }

        // Bouton de fermeture, ou clic sur le fond (et non sur le contenu).
        var onBackdrop = event.target === mediaModal || event.target === articleModal;
        if (event.target.closest('[data-close-modal]') || onBackdrop) {
            event.preventDefault();
            if (mediaModal && mediaModal.classList.contains('active')) closeMediaModal();
            else if (articleModal && articleModal.classList.contains('active')) closeModal(articleModal);
        }
    });

    /* ======================================================================
       10. MENU MOBILE
       ====================================================================== */

    var burger = $('#burger');
    var mobileMenu = $('#mobileMenu');

    function closeMobileMenu() {
        if (!burger || !mobileMenu) return;
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        if (!isModalOpen()) document.body.style.overflow = '';
    }

    function openMobileMenu() {
        burger.classList.add('active');
        burger.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    if (burger) {
        burger.addEventListener('click', function () {
            if (burger.classList.contains('active')) closeMobileMenu();
            else openMobileMenu();
        });
    }

    function isModalOpen() {
        return (mediaModal && mediaModal.classList.contains('active')) ||
               (articleModal && articleModal.classList.contains('active'));
    }

    /* ======================================================================
       11. CLAVIER
       ====================================================================== */

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') {
            if (mediaModal && mediaModal.classList.contains('active')) {
                trapFocus($('.media-modal-content', mediaModal), event);
            } else if (articleModal && articleModal.classList.contains('active')) {
                trapFocus($('.article-modal-content', articleModal), event);
            }
            return;
        }

        if (event.key !== 'Escape') return;

        if (mediaModal && mediaModal.classList.contains('active')) { closeMediaModal(); return; }
        if (articleModal && articleModal.classList.contains('active')) { closeModal(articleModal); return; }

        var dropdown = $('#filterDropdown');
        if (dropdown && dropdown.classList.contains('open')) {
            toggleFilterDropdown(false);
            var btn = $('#filterToggleBtn');
            if (btn) btn.focus();
            return;
        }

        if (mobileMenu && mobileMenu.classList.contains('active')) { closeMobileMenu(); return; }
        if (currentView !== 'home') navigateTo('home');
    });

    /* ======================================================================
       12. RÉVÉLATION AU DÉFILEMENT
       ====================================================================== */

    function setupScrollReveal(container) {
        var targets = $$('.certif-card, .certif-section-header', container);
        if (!targets.length) return;

        // Sans IntersectionObserver, on affiche tout directement.
        if (!('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('reveal-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                window.setTimeout(function () {
                    el.classList.add('reveal-visible');
                }, Number(el.dataset.revealDelay) || 0);
                observer.unobserve(el);
            });
        }, { threshold: 0.12 });

        targets.forEach(function (el, i) {
            el.dataset.revealDelay = i * 80;
            observer.observe(el);
        });
    }

    /* ======================================================================
       13. AMORÇAGE
       ====================================================================== */

    function init() {
        watchDeviconStylesheet();
        renderCnilModules();

        $$('[data-current-year]').forEach(function (el) {
            el.textContent = String(new Date().getFullYear());
        });

        var initialView = viewFromHash();
        if (initialView !== 'home') setViewImmediate(initialView);
        else {
            updateNavActive('home');
            setupScrollReveal(document);
        }

        window.setTimeout(buildTimelinePath, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
