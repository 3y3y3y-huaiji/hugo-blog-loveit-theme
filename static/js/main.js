// 主要JavaScript功能

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化所有功能
  initThemeToggle();
  initScrollToTop();
  initSearch();
});

// 主题切换功能
function initThemeToggle() {
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;
  
  themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  });
  
  // 从本地存储加载主题设置
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

// 返回顶部功能
function initScrollToTop() {
  const scrollToTopButton = document.querySelector('.scroll-to-top');
  if (!scrollToTopButton) return;
  
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      scrollToTopButton.classList.add('show');
    } else {
      scrollToTopButton.classList.remove('show');
    }
  });
  
  scrollToTopButton.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// 搜索功能
function initSearch() {
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');
  
  if (!searchInput || !searchResults) return;
  
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    if (query.length < 2) {
      searchResults.innerHTML = '';
      searchResults.classList.remove('show');
      return;
    }
    
    // 这里可以添加实际的搜索逻辑
    // 暂时显示占位结果
    searchResults.innerHTML = `
      <div class="search-result-item">
        <h4>搜索结果示例</h4>
        <p>这是对 "${query}" 的搜索结果示例。</p>
      </div>
    `;
    searchResults.classList.add('show');
  });
  
  // 点击搜索结果外部关闭搜索结果
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('show');
    }
  });
}