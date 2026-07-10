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