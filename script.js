// ============================================
// Volix Tech — Landing Page Scripts
// ============================================

(function () {
    'use strict';

    // Cursor glow effect (desktop only)
    var glow = document.getElementById('cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', function (e) {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            glow.style.opacity = '1';
        });
        document.addEventListener('mouseleave', function () {
            glow.style.opacity = '0';
        });
    }

    // Mobile nav toggle
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            links.classList.toggle('active');
        });
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                links.classList.remove('active');
            });
        });
    }

    // Stat counter animation
    function animateCounters() {
        document.querySelectorAll('[data-count]').forEach(function (el) {
            if (el.dataset.animated) return;

            var rect = el.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            el.dataset.animated = 'true';
            var target = parseInt(el.dataset.count, 10);
            var duration = 1200;
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

    // Intersection observer for scroll animations
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.project-card, .expertise-group, .team-card, .client-card, .contact-card').forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add visible class handler
    var style = document.createElement('style');
    style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);

    // Run counter animation on scroll
    window.addEventListener('scroll', animateCounters, { passive: true });
    animateCounters();

    // Nav background on scroll
    var nav = document.getElementById('nav');
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            nav.style.borderBottomColor = 'rgba(30, 30, 34, 0.8)';
        } else {
            nav.style.borderBottomColor = 'var(--border)';
        }
    }, { passive: true });
})();
