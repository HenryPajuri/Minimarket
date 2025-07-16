export function highlightCurrentPage() {

  document.querySelectorAll('.nav-bar a').forEach(link => {
    link.classList.remove('active');
  });

  const currentPath = window.location.pathname;
  
  const navMap = {
    '/html/index.html': '.nav-bar a[href="/html/index.html"]',
    '/': '.nav-bar a[href="/html/index.html"]',
    '/html/messages.html': '.nav-bar a[href="/html/messages.html"]',
    '/html/useritems.html': '.nav-bar a[href="/html/useritems.html"]', 
    '/html/about.html': '.nav-bar a[href="/html/about.html"]',
    '/html/item.html': '.nav-bar a[href="/html/index.html"]'
  };

  const selector = navMap[currentPath];
  if (selector) {
    const activeLink = document.querySelector(selector);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
}

export function initNavigation() {
  highlightCurrentPage();
  
  setTimeout(highlightCurrentPage, 10);
}