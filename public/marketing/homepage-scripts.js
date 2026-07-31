// Mobile menu toggle (instant, no animation, for performance)
  function toggleMobileMenu(){
    const nav = document.getElementById('mobileNav');
    const icon = document.getElementById('mobileMenuIcon');
    const isOpen = nav.classList.toggle('open');
    icon.innerHTML = isOpen
      ? '<path d="M6 6l12 12M18 6L6 18"/>'
      : '<path d="M4 7h16M4 12h16M4 17h16"/>';
  }

  // Favorites — heart icon on every homepage request card (see
  // CMS:REQUESTS_GRID markers / renderHomepageHtml). Reuses the
  // existing Favorite model via POST /api/favorites (see
  // src/services/favorite.service.ts) — a guest is sent to /login
  // instead of calling the API; a signed-in user's heart updates
  // immediately (optimistic), then confirms/reverts based on the
  // actual server response, without ever reloading the page.
  function toggleFavorite(btn){
    const grid = btn.closest('[data-authenticated]');
    const isAuthenticated = grid && grid.getAttribute('data-authenticated') === 'true';
    if(!isAuthenticated){
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const requestId = btn.getAttribute('data-request-id');
    const wasFavorited = btn.getAttribute('data-favorited') === 'true';
    const nowFavorited = !wasFavorited;

    // Optimistic UI update — instant, no waiting on the network.
    btn.setAttribute('data-favorited', String(nowFavorited));
    btn.classList.toggle('req-bookmark-active', nowFavorited);
    const svgPath = btn.querySelector('svg');
    if(svgPath) svgPath.setAttribute('fill', nowFavorited ? 'currentColor' : 'none');

    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: requestId })
    }).then(function(res){
      if(!res.ok){
        // Revert on failure — keep the UI honest if the request
        // didn't actually succeed (e.g. session expired mid-click).
        btn.setAttribute('data-favorited', String(wasFavorited));
        btn.classList.toggle('req-bookmark-active', wasFavorited);
        if(svgPath) svgPath.setAttribute('fill', wasFavorited ? 'currentColor' : 'none');
      }
    }).catch(function(){
      btn.setAttribute('data-favorited', String(wasFavorited));
      btn.classList.toggle('req-bookmark-active', wasFavorited);
      if(svgPath) svgPath.setAttribute('fill', wasFavorited ? 'currentColor' : 'none');
    });
  }

// Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, {threshold:.15});
  revealEls.forEach(el=>io.observe(el));
