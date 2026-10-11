(() => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');
  function closeMenu() { nav.dataset.open = 'false'; menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.dataset.open = String(open); menu.setAttribute('aria-expanded', String(open)); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  const toast = document.querySelector('.toast'); let timer;
  document.querySelector('[data-login]').addEventListener('click', () => { toast.textContent = 'Sign-in will be connected when we implement the final design.'; clearTimeout(timer); timer = setTimeout(() => toast.textContent = '', 4500); });
  document.querySelectorAll('[data-notice]').forEach(button => button.addEventListener('click', () => { toast.textContent = button.dataset.notice; clearTimeout(timer); timer = setTimeout(() => toast.textContent = '', 4500); }));

  const art = document.querySelector('.hero-art');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  art.addEventListener('pointermove', event => { if (reduceMotion.matches || event.pointerType !== 'mouse') return; const rect = art.getBoundingClientRect(); art.style.setProperty('--drift', `${((event.clientY - rect.top) / rect.height - .5) * 12}px`); });
  art.addEventListener('pointerleave', () => art.style.setProperty('--drift', '0px'));
})();
