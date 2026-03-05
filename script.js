/* ========== PAGE NAVIGATION ========== */

function navigateTo(pageId) {
  const currentPage = document.querySelector('.page.active');
  const targetPage = document.getElementById('page-' + pageId);
  if (!targetPage || currentPage === targetPage) return;

  // Switch nav context
  document.querySelectorAll('.nav-context').forEach(n => n.classList.remove('active'));
  const navCtx = document.getElementById('nav-' + pageId);
  if (navCtx) navCtx.classList.add('active');

  // Animate out current page
  currentPage.classList.add('exiting');
  currentPage.classList.remove('active');

  setTimeout(() => {
    currentPage.classList.remove('exiting');
    targetPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Re-observe reveals on new page
    observeReveals();

    // Re-init torch cards if navigating to home
    if (pageId === 'home') {
      initTorchCards();
    }

    // Init particles for the new page
    initParticles();
  }, 400);
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ========== SCROLL REVEAL ========== */

function observeReveals() {
  const reveals = document.querySelectorAll('.page.active .reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => {
    // Reset for re-observation
    if (!el.classList.contains('visible')) {
      observer.observe(el);
    }
  });
}


/* ========== PARTICLES ========== */

function initParticles() {
  document.querySelectorAll('.page.active .particles').forEach(container => {
    if (container.children.length > 0) return;
    const count = 33;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const isLarge = Math.random() < 0.3;
      p.className = 'particle' + (isLarge ? ' particle--large' : '');
      const size = isLarge ? (Math.random() * 4 + 4) : (Math.random() * 3 + 1.5);
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const duration = Math.random() * 5.2 + 3.9;
      const delay = -(Math.random() * duration);
      const drift = (Math.random() - 0.5) * 120;
      const rise = -(Math.random() * 300 + 150);
      const opacity = isLarge ? (Math.random() * 0.18 + 0.14) : (Math.random() * 0.22 + 0.12);

      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${left}%; top: ${top}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        --p-drift: ${drift}px;
        --p-rise: ${rise}px;
        --p-opacity: ${opacity};
      `;
      container.appendChild(p);
    }
  });
}


/* ========== TORCH CARD EFFECT ========== */

function initTorchCards() {
  if (window.matchMedia('(hover: none)').matches) return;
  const cards = document.querySelectorAll('.page.active .project-card');

  cards.forEach(card => {
    // Prevent duplicate listeners
    if (card._torchInit) return;
    card._torchInit = true;

    const canvas = card.querySelector('.card-fx');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = -200, mouseY = -200;
    let isHovering = false;
    let animId = null;

    function resize() {
      const rect = card.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    class Mote {
      constructor(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 40 + 10;
        this.x = x + Math.cos(angle) * dist;
        this.y = y + Math.sin(angle) * dist;
        this.size = Math.random() * 1.2 + 0.3;
        this.life = 1;
        this.decay = Math.random() * 0.006 + 0.003;
        this.vy = -(Math.random() * 0.35 + 0.1);
        this.vx = (Math.random() - 0.5) * 0.15;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += (Math.random() - 0.5) * 0.008;
        this.life -= this.decay;
      }
      draw(ctx) {
        if (this.life <= 0) return;
        const alpha = this.life * 0.18;
        if (alpha < 0.01) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.5 + this.life * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 230, 222, ${alpha})`;
        ctx.fill();
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isHovering && Math.random() < 0.3) {
        particles.push(new Mote(mouseX, mouseY));
      }
      particles.forEach(p => { p.update(); p.draw(ctx); });
      particles = particles.filter(p => p.life > 0);
      animId = requestAnimationFrame(animate);
    }

    card.addEventListener('mouseenter', () => {
      isHovering = true;
      resize();
      if (!animId) animate();
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      card.style.setProperty('--mx', mouseX + 'px');
      card.style.setProperty('--my', mouseY + 'px');
    });

    card.addEventListener('mouseleave', () => {
      isHovering = false;
      mouseX = -200;
      mouseY = -200;
      card.style.setProperty('--mx', '-100px');
      card.style.setProperty('--my', '-100px');
      setTimeout(() => {
        if (!isHovering && particles.length === 0) {
          cancelAnimationFrame(animId);
          animId = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 2500);
    });

    window.addEventListener('resize', resize);
  });
}


/* ========== INIT ========== */

document.addEventListener('DOMContentLoaded', () => {
  observeReveals();
  initParticles();
  initTorchCards();
});
