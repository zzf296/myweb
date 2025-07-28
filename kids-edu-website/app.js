// 配置你的Airtable API信息
const CONFIG = {
    API_KEY: 'pattgm1ei2NBZXACJ.ba9d1491cb47abd4865dc45261b7bcb7aab05a0041e98930afe3da011fa09f14',
    BASE_ID: 'applP8IInyP6yddZc',
    TABLE_ID: 'tblrrVumcZmyCgySx'
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
        showError('加载视频失败，请刷新重试');
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
        const ageClass = `age-${fields.AgeGroup || '未知'}`;

        return `
        <div class="col">
           <div class="ratio ratio-16x9">
                <iframe src="https://player.bilibili.com/player.html?bvid=${fields.VideoID}"
                        onerror="this.onerror=null;this.innerHTML='<div class=\'video-placeholder\'><i class=\'bi bi-exclamation-triangle\'></i> 视频加载失败</div>';"
                        frameborder="0" 
                        allowfullscreen>
                </iframe>
            </div>
                <div class="card-body">
                    <h5 class="card-title">${fields.Title || '未命名视频'}</h5>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                        <span class="age-badge ${ageClass}">
                            ${fields.AgeGroup || '未分类'}
                        </span>
                        ${fields.Category ? fields.Category.map(theme =>
            `<span class="badge bg-secondary">${theme}</span>`
        ).join('') : ''}
                    </div>
                    <p class="card-text text-muted small">
                        <i class="bi bi-star-fill text-warning"></i> 
                        ${fields.Rating?.toFixed(1) || '暂无评分'}
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
                    (fields.Category && fields.Category.includes(themeFilter));
                const skillMatch = !skillFilter ||
                    (fields.Skills && fields.Skills.includes(skillFilter));

                return ageMatch && themeMatch && skillMatch;
            });

            renderVideos(filteredVideos);
        });
    } catch (error) {
        showError('初始化失败: ' + error.message);
    }
});