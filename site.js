function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-links a').forEach(function(a) {
    a.classList.remove('active');
  });

  var page = document.getElementById(id);
  if (page) page.classList.add('active');

  var navLink = document.getElementById('nav-' + id);
  if (navLink) navLink.classList.add('active');

  window.scrollTo({ top: 0 });
}
