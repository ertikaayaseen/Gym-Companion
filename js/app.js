document.addEventListener('DOMContentLoaded', () => {
  function setupToggle(buttonId, navId){
    const btn = document.getElementById(buttonId);
    const nav = document.getElementById(navId);
    if(!btn || !nav) return;
    btn.addEventListener('click', ()=>{
      const open = nav.style.display === 'block';
      nav.style.display = open ? 'none' : 'block';
    });
  }
  setupToggle('menuToggle','mainNav');
  setupToggle('menuToggle2','mainNav2');
});

// small helper for pages that include dynamic week/day storage (keeps file focused)
// Week-specific logic lives in-page (week1.html) to avoid coupling.

