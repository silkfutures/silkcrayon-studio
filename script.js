const header=document.querySelector('[data-header]');
const toggle=document.querySelector('[data-menu-toggle]');
const mobile=document.querySelector('[data-mobile-menu]');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>24));
toggle?.addEventListener('click',()=>{const open=mobile.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
mobile?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mobile.classList.remove('open')));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
