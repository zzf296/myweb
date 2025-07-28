// 配置你的Airtable API信息
const CONFIG = {
    API_KEY: 'pattgm1ei2NBZXACJ.ba9d1491cb47abd4865dc45261b7bcb7aab05a0041e98930afe3da011fa09f14',
    BASE_ID: 'applP8IInyP6yddZc',
    TABLE_ID: 'tblrrVumcZmyCgySx',
    FIELD_MAP: {
        videoID: 'VideoID',  // 确保这里的键名与代码中使用的一致
        episodes: "videoEpisodes" // 前端字段名: Airtable字段名
    }
};
const FORM_MESSAGES = {
    success: '<div class="alert alert-success">视频添加成功！页面将自动刷新...</div>',
    error: '<div class="alert alert-danger">提交失败: {message}</div>',
    validating: '<div class="alert alert-info">正在验证视频ID...</div>'
};

// DOM元素
const loadingIndicator = document.getElementById('loading-indicator');
const videoContainer = document.getElementById('videoContainer');
const filterBtn = document.getElementById('filterBtn');

// 辅助函数：格式化时长
function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
}

// 创建视频加载失败的备用内容
function createVideoFallback() {
    const div = document.createElement('div');
    div.className = 'video-fallback';
    div.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill text-warning fs-1 mb-2"></i>
        <p class="text-muted text-center mb-0">视频加载失败</p>
        <small class="text-muted">请检查网络或稍后重试</small>
    `;
    return div;
}

// 生成选集按钮
function generateEpisodeButtons(videoID, episodes = 1) { // 默认改为1集
    const buttons = [];
    const maxEpisodes = Math.min(episodes, 200); // 限制最大200集
    
    for (let i = 1; i <= maxEpisodes; i++) {
        buttons.push(`
            <button class="btn btn-sm ${i === 1 ? 'btn-primary' : 'btn-outline-primary'} episode-btn" 
                    data-bvid="${videoID}" 
                    data-page="${i}">
                第${i}集
            </button>
        `);
    }
    return buttons.join('');
}

// 显示错误信息
function showError(message) {
    videoContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">${message}</div>
        </div>
    `;
}

// 获取视频数据
async function fetchVideos() {
    const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${CONFIG.TABLE_ID}?maxRecords=100`;

    try {
        loadingIndicator.style.display = 'block';
        videoContainer.style.opacity = '0.5';

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取视频数据失败:', error);
        showError('加载视频失败，请刷新重试: ' + error.message);
        return { records: [] };
    } finally {
        loadingIndicator.style.display = 'none';
        videoContainer.style.opacity = '1';
    }
}

// 渲染视频卡片
function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        videoContainer.innerHTML = '<div class="col-12 text-center py-5"><h5>没有找到匹配的视频</h5></div>';
        return;
    }

    videoContainer.innerHTML = videos.map(video => {
        const fields = video.fields;
        const videoID = fields[CONFIG.FIELD_MAP.videoID]; // 使用配置中的字段名获取视频ID
        const episodes = fields[CONFIG.FIELD_MAP.episodes] || 1;
        const ageClass = fields.AgeGroup ? `age-${fields.AgeGroup.replace('岁', '')}` : '';

        // 生成选集按钮
        const episodeButtons = generateEpisodeButtons(videoID, episodes);

        return `
        <div class="col">
            <div class="card h-100 video-card">
                <div class="ratio ratio-16x9 bg-light position-relative">
                    ${videoID ? `
                    <iframe 
                        src="https://player.bilibili.com/player.html?bvid=${videoID}&p=1&high_quality=1&autoplay=0"
                        scrolling="no"
                        border="0"
                        frameborder="no"
                        framespacing="0"
                        allowfullscreen="true"
                        class="w-100 h-100"
                        sandbox="allow-same-origin allow-scripts allow-popups"
                        onerror="this.onerror=null;this.replaceWith(createVideoFallback())">
                    </iframe>
                    ` : createVideoFallback().outerHTML}
                </div>
                <div class="card-body">
                    <h5 class="card-title">${fields.Title || '未命名视频'}</h5>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                        <span class="age-badge ${ageClass}">
                            ${fields.AgeGroup || '未分类'}
                        </span>
                        ${fields.Category ? (Array.isArray(fields.Category)) ?
                fields.Category.map(theme => `<span class="badge bg-secondary">${theme}</span>`).join('') :
                `<span class="badge bg-secondary">${fields.Category}</span>` : ''}
                    </div>
                    <div class="episode-scroll mb-2">
                        <div class="episode-buttons">
                            ${episodeButtons}
                        </div>
                    </div>
                    <p class="card-text text-muted small">
                        <i class="bi bi-star-fill text-warning"></i> 
                        ${fields.Rating ? fields.Rating.toFixed(1) : '暂无评分'}
                        <span class="ms-3">
                            <i class="bi bi-clock"></i> 
                            ${formatDuration(fields.Duration)}
                        </span>
                    </p>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // 添加选集按钮事件监听
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const bvid = this.getAttribute('data-bvid');
            const page = this.getAttribute('data-page');
            const card = this.closest('.card');
            const iframe = card.querySelector('iframe');

            if (iframe) {
                iframe.src = `https://player.bilibili.com/player.html?bvid=${bvid}&p=${page}&high_quality=1`;

                // 更新按钮状态
                card.querySelectorAll('.episode-btn').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline-primary');
                });
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-primary');

                // 滚动到选中的按钮
                this.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        });
    });
}

// 初始化加载
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { records } = await fetchVideos();

        // 初始渲染
        renderVideos(records);

        // 筛选功能
        filterBtn.addEventListener('click', () => {
            const ageFilter = document.getElementById('ageSelect').value;
            const themeFilter = document.getElementById('themeSelect').value;
            const skillFilter = document.getElementById('skillSelect').value;

            const filteredVideos = records.filter(video => {
                const fields = video.fields;
                const ageMatch = !ageFilter || fields.AgeGroup === ageFilter;
                const themeMatch = !themeFilter ||
                    (fields.Category &&
                        (Array.isArray(fields.Category) ?
                            fields.Category.includes(themeFilter) :
                            fields.Category === themeFilter));
                const skillMatch = !skillFilter ||
                    (fields.Skills &&
                        (Array.isArray(fields.Skills) ?
                            fields.Skills.includes(skillFilter) :
                            fields.Skills === skillFilter));

                return ageMatch && themeMatch && skillMatch;
            });

            renderVideos(filteredVideos);
        });
    } catch (error) {
        showError('初始化失败: ' + error.message);
    }

    document.getElementById('addVideoForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formMessage = document.getElementById('formMessage');
        const submitBtn = document.getElementById('submitVideoBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');

        // 获取Airtable中Category字段的实际类型
        const categoryValue = document.getElementById('videoCategory').value;
        const categoryField = Array.isArray(categoryValue) ?
            categoryValue :
            [categoryValue]; // 默认按多选字段处理

        const videoData = {
            "Title": document.getElementById('videoTitle').value.trim(),
            "VideoID": document.getElementById('videoBvid').value.trim(),
            "AgeGroup": document.getElementById('videoAge').value,
            "Category": categoryField, // 动态处理字段类型
            "uration": 300, // 修复拼写错误
            "Rating": 5,
            "videoEpisodes": parseInt(document.getElementById('videoEpisodes').value) || 1
        };

        // 显示加载状态
        submitText.textContent = '提交中...';
        submitSpinner.classList.remove('d-none');
        submitBtn.disabled = true;
        formMessage.innerHTML = '<div class="alert alert-info">正在提交数据...</div>';

        try {
            // 验证视频ID格式
            if (!videoData.VideoID.startsWith('BV') || videoData.VideoID.length < 10) {
                throw new Error('视频ID格式不正确，应以BV开头');
            }

            // 调试输出
            console.log("准备提交的数据:", JSON.stringify({ fields: videoData }, null, 2));

            const response = await fetch(`https://api.airtable.com/v0/${CONFIG.BASE_ID}/${CONFIG.TABLE_ID}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields: videoData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || '提交失败');
            }

            formMessage.innerHTML = '<div class="alert alert-success">视频添加成功！3秒后刷新...</div>';
            document.getElementById('addVideoForm').reset();

            setTimeout(() => window.location.reload(), 3000);

        } catch (error) {
            console.error('提交视频失败:', error);
            let errorMsg = error.message;

            if (error.message.includes('Cannot parse value for field')) {
                errorMsg = '分类字段格式错误，请检查Airtable字段类型设置';
            }

            formMessage.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
        } finally {
            submitText.textContent = '提交视频';
            submitSpinner.classList.add('d-none');
            submitBtn.disabled = false;
        }
    });
});
