---
title: "博客统计"
date: 2025-06-18T00:00:00+08:00
draft: false
type: "statistics"
---

<div class="statistics-page">
  <div class="page-header">
    <h1>博客统计</h1>
    <p>实时显示博客文章和评论的统计数据</p>
  </div>

  <div class="statistics-cards">
    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-file-alt"></i>
      </div>
      <div class="stat-content">
        <h3>文章总数</h3>
        <div class="stat-number" id="posts-count">加载中...</div>
        <div class="stat-description">已发布的文章数量</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-comments"></i>
      </div>
      <div class="stat-content">
        <h3>评论总数</h3>
        <div class="stat-number" id="comments-count">加载中...</div>
        <div class="stat-description">所有文章的评论数量</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-chart-line"></i>
      </div>
      <div class="stat-content">
        <h3>平均评论数</h3>
        <div class="stat-number" id="avg-comments">加载中...</div>
        <div class="stat-description">每篇文章的平均评论数</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="stat-content">
        <h3>最后更新</h3>
        <div class="stat-number" id="last-updated">加载中...</div>
        <div class="stat-description">数据最后更新时间</div>
      </div>
    </div>
  </div>

  <div class="status-message" id="status-message">
    <div class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <span>正在加载统计数据...</span>
    </div>
  </div>
</div>

<style>
.statistics-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.page-header p {
  font-size: 1.1rem;
  color: var(--secondary-text-color);
}

.statistics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-background);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
  margin-right: 1rem;
  color: var(--primary-color);
  width: 60px;
  text-align: center;
}

.stat-content h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.stat-description {
  font-size: 0.9rem;
  color: var(--secondary-text-color);
}

.status-message {
  text-align: center;
  padding: 1rem;
  margin-top: 1rem;
  border-radius: 4px;
  background: var(--card-background);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--secondary-text-color);
}

.loading-indicator i {
  margin-right: 0.5rem;
}

.error-message {
  color: #e74c3c;
}

.success-message {
  color: #2ecc71;
}

@media (max-width: 768px) {
  .statistics-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .statistics-cards {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
  }
  
  .stat-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }
}
</style>

<script>
// 数据缓存
let cachedData = {
  postsCount: 0,
  commentsCount: 0,
  lastUpdated: null,
  isLoading: false,
  error: null
};

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化统计数据
  loadStatistics();
  
  // 设置定时刷新，每5分钟更新一次
  setInterval(loadStatistics, 5 * 60 * 1000);
});

// 加载统计数据
async function loadStatistics() {
  // 如果正在加载，则不重复请求
  if (cachedData.isLoading) return;
  
  const statusElement = document.getElementById('status-message');
  const postsCountElement = document.getElementById('posts-count');
  const commentsCountElement = document.getElementById('comments-count');
  const avgCommentsElement = document.getElementById('avg-comments');
  const lastUpdatedElement = document.getElementById('last-updated');
  
  // 显示加载状态
  cachedData.isLoading = true;
  statusElement.innerHTML = `
    <div class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <span>正在加载统计数据...</span>
    </div>
  `;
  
  try {
    // 获取文章总数
    const postsResponse = await fetch('/api/posts-count');
    if (!postsResponse.ok) throw new Error('获取文章数量失败');
    const postsData = await postsResponse.json();
    
    // 获取评论总数
    const commentsResponse = await fetch('/api/comments-count');
    if (!commentsResponse.ok) throw new Error('获取评论数量失败');
    const commentsData = await commentsResponse.json();
    
    // 计算平均评论数
    const avgComments = postsData.count > 0 ? (commentsData.count / postsData.count).toFixed(2) : 0;
    
    // 更新缓存数据
    cachedData = {
      postsCount: postsData.count,
      commentsCount: commentsData.count,
      lastUpdated: new Date(),
      isLoading: false,
      error: null
    };
    
    // 更新UI
    postsCountElement.textContent = postsData.count;
    commentsCountElement.textContent = commentsData.count;
    avgCommentsElement.textContent = avgComments;
    lastUpdatedElement.textContent = formatDateTime(cachedData.lastUpdated);
    
    // 显示成功状态
    statusElement.innerHTML = `
      <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <span>数据更新成功</span>
      </div>
    `;
    
    // 3秒后隐藏状态消息
    setTimeout(() => {
      statusElement.innerHTML = '';
    }, 3000);
    
  } catch (error) {
    console.error('加载统计数据失败:', error);
    
    // 更新错误状态
    cachedData.isLoading = false;
    cachedData.error = error.message;
    
    // 如果有缓存数据，显示缓存数据
    if (cachedData.postsCount > 0 || cachedData.commentsCount > 0) {
      postsCountElement.textContent = cachedData.postsCount;
      commentsCountElement.textContent = cachedData.commentsCount;
      const avgComments = cachedData.postsCount > 0 ? (cachedData.commentsCount / cachedData.postsCount).toFixed(2) : 0;
      avgCommentsElement.textContent = avgComments;
      lastUpdatedElement.textContent = cachedData.lastUpdated ? formatDateTime(cachedData.lastUpdated) : '未知';
      
      statusElement.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <span>无法获取最新数据，显示缓存数据 (最后更新: ${cachedData.lastUpdated ? formatDateTime(cachedData.lastUpdated) : '未知'})</span>
        </div>
      `;
    } else {
      // 没有缓存数据，显示错误
      postsCountElement.textContent = '无法获取';
      commentsCountElement.textContent = '无法获取';
      avgCommentsElement.textContent = '无法获取';
      lastUpdatedElement.textContent = '无法获取';
      
      statusElement.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <span>加载数据失败: ${error.message}</span>
        </div>
      `;
    }
  }
}

// 格式化日期时间
function formatDateTime(date) {
  if (!date) return '未知';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleString('zh-CN', options);
}
</script>