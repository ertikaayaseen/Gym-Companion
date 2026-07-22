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
