// 全局变量
let settings = {
    questionsPerCategory: 3,
    airtableApiKey: 'patsxj3SsbDy1hoIB.ed65241a21019abde819cfbbc7c94fe5d7c1ff15f7901da8063929aae6640d32',
    airtableBaseId: 'app5EJ7NLnxJWpfXC',
    airtableTableName: 'Questions'
};

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 加载设置
    loadSettings();
    
    // 设置当前日期
    const today = new Date();
    const dateStr = today.toISOString().substr(0, 10);
    document.getElementById('recordDate').value = dateStr;
    
    // 生成记录编号
    generateRecordNo();
});

// 生成记录编号
function generateRecordNo() {
    const today = new Date();
    const randomNo = 'DC' + today.getFullYear() + 
                  (today.getMonth()+1).toString().padStart(2, '0') + 
                  today.getDate().toString().padStart(2, '0') + 
                  Math.floor(Math.random()*900 + 100);
    document.getElementById('recordNo').value = randomNo;
}

// 切换设置面板显示
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

// 加载设置
function loadSettings() {
    const savedSettings = localStorage.getItem('interviewSystemSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        document.getElementById('questionsPerCategory').value = settings.questionsPerCategory;
        document.getElementById('airtableApiKey').value = settings.airtableApiKey;
        document.getElementById('airtableBaseId').value = settings.airtableBaseId;
        document.getElementById('airtableTableName').value = settings.airtableTableName;
    }
}

// 保存设置
function saveSettings() {
    settings.questionsPerCategory = parseInt(document.getElementById('questionsPerCategory').value) || 3;
    settings.airtableApiKey = document.getElementById('airtableApiKey').value.trim();
    settings.airtableBaseId = document.getElementById('airtableBaseId').value.trim();
    settings.airtableTableName = document.getElementById('airtableTableName').value.trim() || 'Questions';
    
    localStorage.setItem('interviewSystemSettings', JSON.stringify(settings));
    alert('设置已保存');
    toggleSettings();
}

// 生成问题
async function generateQuestions() {
    const candidateName = document.getElementById('candidateName').value || '[考察对象]';
    const questionsPerCategory = settings.questionsPerCategory || 3;
    
    // 检查Airtable配置
    if (!settings.airtableApiKey || !settings.airtableBaseId) {
        alert('请先在设置中配置Airtable API信息');
        toggleSettings();
        return;
    }
    
    try {
        // 从Airtable获取问题
        const questions = await fetchQuestionsFromAirtable();
        
        // 替换所有问题中的占位符
        const replaceName = (q) => q.replace(/\[考察对象\]/g, candidateName);
        
        // 从每个类别中随机选择问题
        document.getElementById('politicalQuestions').innerHTML = 
            getRandomQuestions(questions.political, questionsPerCategory).map(q => createQuestionItem(replaceName(q))).join('');
        
        document.getElementById('abilityQuestions').innerHTML = 
            getRandomQuestions(questions.ability, questionsPerCategory).map(q => createQuestionItem(replaceName(q))).join('');
        
        document.getElementById('styleQuestions').innerHTML = 
            getRandomQuestions(questions.style, questionsPerCategory).map(q => createQuestionItem(replaceName(q))).join('');
        
        document.getElementById('personalityQuestions').innerHTML = 
            getRandomQuestions(questions.personality, questionsPerCategory).map(q => createQuestionItem(replaceName(q))).join('');
        
        document.getElementById('lifeQuestions').innerHTML = 
            getRandomQuestions(questions.life, questionsPerCategory).map(q => createQuestionItem(replaceName(q))).join('');
        
        document.getElementById('overallQuestions').innerHTML = 
            getRandomQuestions(questions.overall, Math.max(2, Math.floor(questionsPerCategory/2))).map(q => createQuestionItem(replaceName(q))).join('');
        
    } catch (error) {
        console.error('获取问题失败:', error);
        alert('获取问题失败，请检查Airtable配置和网络连接');
    }
}

// 从Airtable获取问题
async function fetchQuestionsFromAirtable() {
    const url = `https://api.airtable.com/v0/${settings.airtableBaseId}/${settings.airtableTableName}`;
    
    const response = await axios.get(url, {
        headers: {
            'Authorization': `Bearer ${settings.airtableApiKey}`
        }
    });
    
    const questions = {
        political: [],
        ability: [],
        style: [],
        personality: [],
        life: [],
        overall: []
    };
    
    response.data.records.forEach(record => {
        const category = record.fields.Category;
        const text = record.fields.Text;
        const id = record.id;
        
        if (questions[category]) {
            questions[category].push({text, id});
        }
    });
    
    return questions;
}

// 创建问题项
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
        return ['暂无相关问题，请先在问题库中添加'];
    }
    
    // 如果是字符串数组（默认问题），直接处理
    if (typeof questions[0] === 'string') {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, questions.length));
    }
    
    // 如果是对象数组（来自Airtable），提取text属性
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, questions.length)).map(q => q.text);
}

// 保存记录到Airtable
async function saveRecord() {
    const candidateName = document.getElementById('candidateName').value;
    if (!candidateName) {
        alert('请先填写考察对象姓名');
        return;
    }
    
    // 检查Airtable配置
    if (!settings.airtableApiKey || !settings.airtableBaseId) {
        alert('请先在设置中配置Airtable API信息');
        toggleSettings();
        return;
    }
    
    // 收集记录数据
    const recordData = {
        fields: {
            'RecordNo': document.getElementById('recordNo').value,
            'Date': document.getElementById('recordDate').value,
            'CandidateName': candidateName,
            'Position': document.getElementById('candidatePosition').value,
            'Interviewer': document.getElementById('interviewer').value,
            'Method': document.getElementById('interviewMethod').value,
            'Interviewee': document.getElementById('interviewee').value,
            'Relationship': document.getElementById('relationship').value,
            'PoliticalAnswers': collectAnswers('politicalQuestions'),
            'AbilityAnswers': collectAnswers('abilityQuestions'),
            'StyleAnswers': collectAnswers('styleQuestions'),
            'PersonalityAnswers': collectAnswers('personalityQuestions'),
            'LifeAnswers': collectAnswers('lifeQuestions'),
            'OverallAnswers': collectAnswers('overallQuestions')
        }
    };
    
    try {
        // 在实际应用中，这里需要创建一个新的Airtable来存储记录
        // 以下代码仅为示例，需要根据实际Airtable结构调整
        alert('记录保存功能需要配置Airtable的记录表，当前为演示状态');
        console.log('记录数据:', recordData);
        
        // 生成新的记录编号
        generateRecordNo();
        
    } catch (error) {
        console.error('保存记录失败:', error);
        alert('保存记录失败，请检查网络连接和Airtable配置');
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

// 打开问题管理模态框
function manageQuestions() {
    const modal = document.getElementById('questionModal');
    modal.style.display = 'block';
    openTab('addTab'); // 默认打开添加标签页
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('questionModal');
    modal.style.display = 'none';
}

// 切换标签页
function openTab(tabId) {
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
    event.target.classList.add('active');
    
    // 如果是查看标签，加载问题列表
    if (tabId === 'viewTab') {
        loadQuestionList();
    }
}

// 添加问题到Airtable
async function addQuestion() {
    const category = document.getElementById('questionCategory').value;
    const text = document.getElementById('questionText').value.trim();
    
    if (!text) {
        alert('请输入问题内容');
        return;
    }
    
    // 检查Airtable配置
    if (!settings.airtableApiKey || !settings.airtableBaseId) {
        alert('请先在设置中配置Airtable API信息');
        toggleSettings();
        return;
    }
    
    try {
        const url = `https://api.airtable.com/v0/${settings.airtableBaseId}/${settings.airtableTableName}`;
        
        const response = await axios.post(url, {
            fields: {
                'Category': category,
                'Text': text
            }
        }, {
            headers: {
                'Authorization': `Bearer ${settings.airtableApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        alert('问题添加成功');
        document.getElementById('questionText').value = '';
        loadQuestionList(); // 刷新问题列表
        
    } catch (error) {
        console.error('添加问题失败:', error);
        alert('添加问题失败，请检查网络连接和Airtable配置');
    }
}

// 加载问题列表
async function loadQuestionList() {
    const filter = document.getElementById('filterCategory').value;
    const questionList = document.getElementById('questionList');
    questionList.innerHTML = '<p>加载中...</p>';
    
    try {
        const questions = await fetchQuestionsFromAirtable();
        let allQuestions = [];
        
        // 将问题从对象转换为数组
        for (const category in questions) {
            questions[category].forEach(q => {
                allQuestions.push({
                    id: q.id,
                    category: category,
                    text: q.text
                });
            });
        }
        
        // 过滤问题
        if (filter !== 'all') {
            allQuestions = allQuestions.filter(q => q.category === filter);
        }
        
        // 显示问题
        if (allQuestions.length === 0) {
            questionList.innerHTML = '<p>暂无问题</p>';
            return;
        }
        
        questionList.innerHTML = '';
        allQuestions.forEach(q => {
            const categoryName = getCategoryName(q.category);
            const item = document.createElement('div');
            item.className = 'question-list-item';
            item.innerHTML = `
                <div>
                    <span class="question-category">${categoryName}</span>
                    ${q.text}
                </div>
                <button class="delete-btn" onclick="deleteQuestion('${q.id}')">删除</button>
            `;
            questionList.appendChild(item);
        });
        
    } catch (error) {
        console.error('加载问题列表失败:', error);
        questionList.innerHTML = '<p>加载失败，请检查Airtable配置</p>';
    }
}

// 获取类别名称
function getCategoryName(category) {
    const names = {
        political: '政治素质',
        ability: '工作能力',
        style: '工作作风',
        personality: '性格特点',
        life: '生活作风',
        overall: '综合评价'
    };
    return names[category] || category;
}

// 过滤问题列表
function filterQuestions() {
    loadQuestionList();
}

// 删除问题
async function deleteQuestion(questionId) {
    if (!confirm('确定要删除这个问题吗？')) {
        return;
    }
    
    try {
        const url = `https://api.airtable.com/v0/${settings.airtableBaseId}/${settings.airtableTableName}/${questionId}`;
        
        await axios.delete(url, {
            headers: {
                'Authorization': `Bearer ${settings.airtableApiKey}`
            }
        });
        
        alert('问题删除成功');
        loadQuestionList(); // 刷新问题列表
        
    } catch (error) {
        console.error('删除问题失败:', error);
        alert('删除问题失败，请检查网络连接和Airtable配置');
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('questionModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};