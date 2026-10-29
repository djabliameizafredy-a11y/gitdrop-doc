(()=>{document.addEventListener('DOMContentLoaded',()=>{
const root=document.documentElement,$=(s)=>[...document.querySelectorAll(s)];
document.querySelector('[data-theme-toggle]')?.addEventListener('click',()=>{const t=root.dataset.bsTheme==='dark'?'light':'dark';root.dataset.bsTheme=t;try{localStorage.setItem('gd-theme',t)}catch(e){}});
$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);const o=b.textContent;b.textContent='Copié ✓';setTimeout(()=>b.textContent=o,1400)}catch(e){}}));
const mark=(id)=>$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===id));mark(document.body.dataset.current);
const links=$('.side a[href^="#"]');
if(links.length){const m=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.remove('active'));m.get(e.target.id)?.classList.add('active')}}),{rootMargin:'-20% 0px -70% 0px'});
m.forEach((_,id)=>{const el=document.getElementById(id);el&&io.observe(el)})}
const pages=$('[data-page]'); // version « un seul fichier » : les 3 pages sont routées par #hash
if(pages.length){const show=()=>{const h=location.hash.slice(1),t=h&&document.getElementById(h);let p=pages.find(x=>x.dataset.page===h)||(t&&t.closest('[data-page]'))||pages[0];
pages.forEach(x=>x.hidden=x!==p);mark(p.dataset.page);t&&!pages.includes(t)?t.scrollIntoView():scrollTo(0,0)};addEventListener('hashchange',show);show()}
})})();
