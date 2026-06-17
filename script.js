// ============================================
// Volix Tech — Landing Page Scripts
// Smooth scroll (Lenis) + intro loader + scroll-spy side-nav + reveals.
// ============================================

(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ----------------------------------------
    // Smooth scroll (Lenis lerp glide)
    // ----------------------------------------
    var lenis = null;
    function initSmoothScroll() {
        if (reduceMotion || typeof window.Lenis === 'undefined') return;
        lenis = new window.Lenis({
            duration: 1.15,
            easing: function (t) { return 1 - Math.pow(1 - t, 3); },
            smoothWheel: true,
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
    }

    function scrollToTarget(target) {
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { offset: 0 });
        else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    // In-page nav links glide
    document.querySelectorAll('[data-nav]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            if (!id || id.charAt(0) !== '#' || id.length < 2) return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            scrollToTarget(target);
        });
    });

    // ----------------------------------------
    // Intro loader (0 -> 100)
    // ----------------------------------------
    function initIntro() {
        var loader = document.getElementById('loader');
        if (!loader) { document.body.classList.add('loaded'); return; }
        if (reduceMotion) {
            loader.style.display = 'none';
            document.body.classList.add('loaded');
            return;
        }
        var count = document.getElementById('loader-count');
        var fill = document.getElementById('loader-fill');
        var status = document.getElementById('loader-status');
        var pct = 0;
        var tick = setInterval(function () {
            pct = Math.min(100, pct + Math.ceil(Math.random() * 8) + 4);
            if (count) count.textContent = pct;
            if (fill) fill.style.width = pct + '%';
            if (pct >= 100) {
                clearInterval(tick);
                if (status) status.textContent = 'Ready to explore';
                setTimeout(function () {
                    loader.classList.add('loader-done');
                    document.body.classList.add('loaded');
                }, 350);
            }
        }, 85);
    }

    // ----------------------------------------
    // Menu toggle (reveals the side-nav on small screens)
    // ----------------------------------------
    var menuToggle = document.getElementById('menu-toggle');
    var sidenav = document.getElementById('sidenav');
    if (menuToggle && sidenav) {
        menuToggle.addEventListener('click', function () {
            sidenav.classList.toggle('sidenav-open');
            menuToggle.classList.toggle('is-active');
        });
        sidenav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                sidenav.classList.remove('sidenav-open');
                menuToggle.classList.remove('is-active');
            });
        });
    }

    // ----------------------------------------
    // Scroll-spy: highlight active section in side-nav
    // ----------------------------------------
    function initScrollSpy() {
        var items = Array.prototype.slice.call(document.querySelectorAll('.sidenav-item'));
        if (!items.length) return;
        var byId = {};
        items.forEach(function (it) { byId[it.getAttribute('data-target')] = it; });

        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    items.forEach(function (it) { it.classList.remove('active'); });
                    var active = byId[entry.target.id];
                    if (active) active.classList.add('active');
                }
            });
        }, { threshold: 0.5, rootMargin: '-20% 0px -30% 0px' });

        ['hero', 'projects', 'expertise', 'team', 'clients', 'contact'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) spy.observe(el);
        });
    }

    // ----------------------------------------
    // Stat counter animation
    // ----------------------------------------
    function animateCounters() {
        document.querySelectorAll('[data-count]').forEach(function (el) {
            if (el.dataset.animated) return;
            var rect = el.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            el.dataset.animated = 'true';
            var target = parseInt(el.dataset.count, 10);
            var duration = 1400;
            var start = performance.now();
            function update(now) {
                var progress = Math.min((now - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }

    // ----------------------------------------
    // Scroll-triggered reveals — slow clip/slide, coordinated stagger
    // ----------------------------------------
    function initReveals() {
        if (reduceMotion) return;
        var revealEls = Array.prototype.slice.call(
            document.querySelectorAll(
                '.project-card, .expertise-group, .team-card, .client-card, .contact-card, .section-header'
            )
        );
        var groupCounters = {};
        revealEls.forEach(function (el) {
            el.classList.add('reveal');
            var key = (el.parentNode && el.parentNode.className) || 'root';
            groupCounters[key] = groupCounters[key] || 0;
            el.style.setProperty('--reveal-delay', (groupCounters[key] * 110) + 'ms');
            groupCounters[key]++;
        });
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
        revealEls.forEach(function (el) { observer.observe(el); });
    }

    // ----------------------------------------
    // Top bar settles on scroll
    // ----------------------------------------
    var topbar = document.getElementById('topbar');
    if (topbar) {
        window.addEventListener('scroll', function () {
            topbar.classList.toggle('topbar-scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    // ----------------------------------------
    // Boot
    // ----------------------------------------
    initSmoothScroll();
    initIntro();
    initScrollSpy();
    initReveals();
    window.addEventListener('scroll', animateCounters, { passive: true });
    animateCounters();
})();
