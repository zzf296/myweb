

// 全局配置
let config = {
    questionsPerCategory: 3,
    airtable: {
        apiKey: 'patsxj3SsbDy1hoIB.93fa6fb2a6f94825559a2aec7b79f374a9e52acc7068d377e3f771575ac6382f',
        baseId: 'app5EJ7NLnxJWpfXC',
        tables: {
            questions: 'tblgUUajpixKGO1IL',  // 存储问题的表ID
            records: 'tblfZfDZf64H656IK'    // 存储记录的表ID
        }
    }
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initForm();
});

// 加载设置
function loadSettings() {
    const savedConfig = localStorage.getItem('interviewSystemConfig');
    if (savedConfig) {
        try {
            config = JSON.parse(savedConfig);
            applyConfigToUI();
        } catch (e) {
            console.error('加载配置出错：', e);
            resetConfig();
        }
    }
    generateRecordNo();
}

// 重置配置
function resetConfig() {
    config = {
        questionsPerCategory: 3,
        airtable: {
            apiKey: '',
            baseId: '',
            tables: {
                questions: 'questions',
                records: 'records'
            }
        }
    };
    applyConfigToUI();
}

// 应用配置到UI
function applyConfigToUI() {
    document.getElementById('questionsPerCategory').value = config.questionsPerCategory;
    document.getElementById('airtableApiKey').value = config.airtable.apiKey;
    document.getElementById('airtableBaseId').value = config.airtable.baseId;
}

// 保存设置
function saveSettings() {
    config = {
        questionsPerCategory: parseInt(document.getElementById('questionsPerCategory').value) || 3,
        airtable: {
            apiKey: document.getElementById('airtableApiKey').value.trim(),
            baseId: document.getElementById('airtableBaseId').value.trim(),
            tables: {
                questions: 'questions',
                records: 'records'
            }
        }
    };
    
    localStorage.setItem('interviewSystemConfig', JSON.stringify(config));
    alert('配置已保存');
    toggleSettings();
}

// 切换设置面板
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

// 初始化表单
function initForm() {
    const today = new Date();
    document.getElementById('recordDate').value = today.toISOString().substr(0, 10);
}

// 生成记录编号
function generateRecordNo() {
    const today = new Date();
    const randomNo = 'DC' + today.getFullYear() + 
                  (today.getMonth()+1).toString().padStart(2, '0') + 
                  today.getDate().toString().padStart(2, '0') + 
                  Math.floor(Math.random()*900 + 100);
    document.getElementById('recordNo').value = randomNo;
}

// Airtable API 封装
class AirtableAPI {
    constructor(baseId, apiKey) {
        this.baseId = baseId;
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.airtable.com/v0';
    }
    
    async getRecords(table, params = {}) {
        const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(table)}`;
        try {
            const response = await axios.get(url, {
                headers: this._getHeaders(),
                params: params
            });
            return response.data.records;
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }
    
    async createRecord(table, fields) {
        const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(table)}`;
        try {
            const response = await axios.post(url, { fields }, {
                headers: this._getHeaders()
            });
            return response.data;
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }
    
    async deleteRecord(table, recordId) {
        const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(table)}/${recordId}`;
        try {
            const response = await axios.delete(url, {
                headers: this._getHeaders()
            });
            return response.data;
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }
    
    _getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }
    
    _handleError(error) {
        console.error('Airtable API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            config: error.config
        });
        throw new Error(error.response?.data?.error?.message || 'Airtable请求失败');
    }
}

// 获取Airtable客户端
function getAirtableClient() {
    if (!config.airtable.apiKey || !config.airtable.baseId) {
        throw new Error('请先在设置中配置Airtable API信息');
    }
    return new AirtableAPI(config.airtable.baseId, config.airtable.apiKey);
}

// 生成问题
async function generateQuestions() {
    const candidateName = document.getElementById('candidateName').value || '[考察对象]';
    const questionsPerCategory = config.questionsPerCategory || 3;
    
    try {
        const airtable = getAirtableClient();
        const questions = await airtable.getRecords(config.airtable.tables.questions);
        
        // 按类别组织问题
        const questionsByCategory = {
            '政治素质与道德品质': [],
            '工作能力与业务水平': [],
            '工作作风与廉洁自律': [],
            '性格特点与团队协作': [],
            '生活作风与社交关系': [],
            '综合评价': []
        };
        
        questions.forEach(record => {
            const category = record.fields.Category;
            const text = record.fields.Text;
            if (category && text && questionsByCategory[category]) {
                questionsByCategory[category].push(text);
            }
        });
        
        // 渲染问题
        renderQuestions('politicalQuestions', questionsByCategory['政治素质与道德品质'], questionsPerCategory, candidateName);
        renderQuestions('abilityQuestions', questionsByCategory['工作能力与业务水平'], questionsPerCategory, candidateName);
        renderQuestions('styleQuestions', questionsByCategory['工作作风与廉洁自律'], questionsPerCategory, candidateName);
        renderQuestions('personalityQuestions', questionsByCategory['性格特点与团队协作'], questionsPerCategory, candidateName);
        renderQuestions('lifeQuestions', questionsByCategory['生活作风与社交关系'], questionsPerCategory, candidateName);
        renderQuestions('overallQuestions', questionsByCategory['综合评价'], Math.max(2, Math.floor(questionsPerCategory/2)), candidateName);
        
    } catch (error) {
        showError('生成问题失败', error);
    }
}

// 渲染问题到指定容器
function renderQuestions(containerId, questions, count, candidateName) {
    const container = document.getElementById(containerId);
    const replaceName = (q) => q.replace(/\[考察对象\]/g, candidateName);
    
    if (!questions || questions.length === 0) {
        container.innerHTML = createQuestionItem('暂无相关问题');
        return;
    }
    
    const selectedQuestions = getRandomQuestions(questions, count);
    container.innerHTML = selectedQuestions.map(q => createQuestionItem(replaceName(q))).join('');
}

// 创建问题项HTML
function createQuestionItem(questionText) {
    return `
        <div class="question-item">
            <div class="question-text">${questionText}</div>
            <textarea class="answer-area" placeholder="请记录回答内容..."></textarea>
        </div>
    `;
}

// 从数组中获取随机问题
function getRandomQuestions(questions, count) {
    if (!questions || questions.length === 0) {
        return ['暂无相关问题'];
    }
    
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, questions.length));
}

// 保存记录
async function saveRecord() {
    const candidateName = document.getElementById('candidateName').value;
    if (!candidateName) {
        alert('请先填写考察对象姓名');
        return;
    }
    
    try {
        const airtable = getAirtableClient();
        
        const recordData = {
            RecordNo: document.getElementById('recordNo').value,
            Date: document.getElementById('recordDate').value,
            CandidateName: candidateName,
            Position: document.getElementById('candidatePosition').value,
            Interviewer: document.getElementById('interviewer').value,
            Method: document.getElementById('interviewMethod').value,
            Interviewee: document.getElementById('interviewee').value,
            Relationship: document.getElementById('relationship').value,
            PoliticalAnswers: collectAnswers('politicalQuestions'),
            AbilityAnswers: collectAnswers('abilityQuestions'),
            StyleAnswers: collectAnswers('styleQuestions'),
            PersonalityAnswers: collectAnswers('personalityQuestions'),
            LifeAnswers: collectAnswers('lifeQuestions'),
            OverallAnswers: collectAnswers('overallQuestions'),
            Notes: document.getElementById('notes').value
        };
        
        await airtable.createRecord(config.airtable.tables.records, recordData);
        alert('记录保存成功');
        generateRecordNo();
        
    } catch (error) {
        showError('保存记录失败', error);
    }
}

// 收集问题答案
function collectAnswers(sectionId) {
    const section = document.getElementById(sectionId);
    const questions = section.querySelectorAll('.question-item');
    const answers = [];
    
    questions.forEach(q => {
        const text = q.querySelector('.question-text').textContent;
        const answer = q.querySelector('.answer-area').value;
        answers.push(`${text}\n答: ${answer || '无'}`);
    });
    
    return answers.join('\n\n');
}

// 管理问题
function manageQuestions() {
    const modal = document.getElementById('questionModal');
    modal.style.display = 'block';
    openTab(null, 'addTab');
    loadQuestionList();
}

// 关闭模态框
function closeModal() {
    document.getElementById('questionModal').style.display = 'none';
}

// 切换标签页
function openTab(event, tabId) {
    if (event) {
        tabId = event.target.getAttribute('onclick').match(/'([^']+)'/)[1];
    }
    
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active-tab');
    });
    
    // 取消所有标签按钮的活动状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选定的标签内容
    document.getElementById(tabId).classList.add('active-tab');
    
    // 设置活动标签按钮
    if (event) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.tab-btn[onclick*="${tabId}"]`).classList.add('active');
    }
}

// 添加问题
async function addQuestion() {
    const category = document.getElementById('questionCategory').value;
    const name = document.getElementById('questionName').value.trim();
    const text = document.getElementById('questionText').value.trim();
    
    if (!name || !text) {
        alert('请填写问题名称和内容');
        return;
    }
    
    try {
        const airtable = getAirtableClient();
        
        await airtable.createRecord(config.airtable.tables.questions, {
            Name: name,
            Category: category,
            Text: text
        });
        
        alert('问题添加成功');
        document.getElementById('questionName').value = '';
        document.getElementById('questionText').value = '';
        loadQuestionList();
        
    } catch (error) {
        showError('添加问题失败', error);
    }
}

// 加载问题列表
async function loadQuestionList() {
    const filter = document.getElementById('filterCategory').value;
    const questionList = document.getElementById('questionList');
    questionList.innerHTML = '<p>加载中...</p>';
    
    try {
        const airtable = getAirtableClient();
        const questions = await airtable.getRecords(config.airtable.tables.questions);
        
        // 过滤问题
        const filteredQuestions = filter === '全部' 
            ? questions 
            : questions.filter(q => q.fields.Category === filter);
        
        if (filteredQuestions.length === 0) {
            questionList.innerHTML = '<p>暂无问题</p>';
            return;
        }
        
        questionList.innerHTML = '';
        filteredQuestions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'question-list-item';
            item.innerHTML = `
                <div>
                    <span class="question-category">${q.fields.Category}</span>
                    <strong>${q.fields.Name}</strong>: ${q.fields.Text}
                </div>
                <button class="delete-btn" onclick="deleteQuestion('${q.id}')">删除</button>
            `;
            questionList.appendChild(item);
        });
        
    } catch (error) {
        showError('加载问题列表失败', error);
        questionList.innerHTML = '<p>加载失败</p>';
    }
}

// 删除问题
async function deleteQuestion(questionId) {
    if (!confirm('确定要删除这个问题吗？')) {
        return;
    }
    
    try {
        const airtable = getAirtableClient();
        await airtable.deleteRecord(config.airtable.tables.questions, questionId);
        alert('问题删除成功');
        loadQuestionList();
    } catch (error) {
        showError('删除问题失败', error);
    }
}

// 过滤问题列表
function filterQuestions() {
    loadQuestionList();
}

// 显示错误
function showError(message, error) {
    console.error(message, error);
    alert(`${message}: ${error.message}`);
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target === document.getElementById('questionModal')) {
        closeModal();
    }
};