// Mobile menu toggle (instant, no animation, for performance)
  function toggleMobileMenu(){
    const nav = document.getElementById('mobileNav');
    const icon = document.getElementById('mobileMenuIcon');
    const isOpen = nav.classList.toggle('open');
    icon.innerHTML = isOpen
      ? '<path d="M6 6l12 12M18 6L6 18"/>'
      : '<path d="M4 7h16M4 12h16M4 17h16"/>';
  }

// Hero request bar: rotating placeholder examples reinforce
  // "write your request" (not "search") within the first seconds.
  const requestPlaceholders = [
    'مثال: محتاج سيارة تويوتا كورولا موديل 2022',
    'مثال: محتاج شقة للإيجار في القاهرة',
    'مثال: محتاج سباك في القاهرة'
  ];
  (function rotateRequestPlaceholder(){
    const input = document.getElementById('requestInput');
    if(!input) return;
    let i = 0;
    setInterval(function(){
      if(document.activeElement === input || input.value) return;
      i = (i + 1) % requestPlaceholders.length;
      input.setAttribute('placeholder', requestPlaceholders[i]);
    }, 3200);
  })();

  // Category dropdown — Categories module completion. Populated
  // server-side with real active categories (see CMS:HERO_CATEGORY_OPTIONS
  // markers in homepage-body.html / getPublicCategories). Selecting an
  // option just updates the visible label text, which
  // goToCreateRequest() below already reads as-is — no change needed
  // there.
  function toggleCategoryDropdown(){
    const menu = document.getElementById('heroCategoryDropdown');
    if(!menu) return;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
  function selectHeroCategory(btn){
    const label = document.getElementById('categorySelectLabel');
    if(label) label.textContent = btn.textContent;
    const menu = document.getElementById('heroCategoryDropdown');
    if(menu) menu.style.display = 'none';
  }
  document.addEventListener('click', function(e){
    const select = document.getElementById('categorySelect');
    const menu = document.getElementById('heroCategoryDropdown');
    if(!select || !menu || menu.style.display === 'none') return;
    if(!select.contains(e.target)) menu.style.display = 'none';
  });

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

  // Pressing the CTA transfers the written request straight into the
  // Create Request flow instead of "searching" existing listings.
  function goToCreateRequest(){
    const input = document.getElementById('requestInput');
    const category = document.getElementById('categorySelect');
    const text = input ? input.value.trim() : '';
    const cat = category ? category.textContent.trim() : '';
    const params = new URLSearchParams();
    if(text) params.set('text', text);
    if(cat && cat !== 'اختر التصنيف') params.set('category', cat);
    const query = params.toString();
    window.location.href = '/create-request' + (query ? ('?' + query) : '');
  }

// Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, {threshold:.15});
  revealEls.forEach(el=>io.observe(el));

  // Animated counters
  const counters = document.querySelectorAll('.stat-num[data-count]');
  const countIO = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'),10);
        const duration = 1600;
        const start = performance.now();
        function tick(now){
          const p = Math.min((now-start)/duration,1);
          const eased = 1 - Math.pow(1-p,3);
          const val = Math.floor(eased*target);
          el.textContent = '+' + val.toLocaleString('en-US');
          if(p<1) requestAnimationFrame(tick);
          else el.textContent = '+' + target.toLocaleString('en-US');
        }
        requestAnimationFrame(tick);
        countIO.unobserve(el);
      }
    });
  }, {threshold:.5});
  counters.forEach(el=>countIO.observe(el));