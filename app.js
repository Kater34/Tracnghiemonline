let currentSubject = '';
let currentSubjectTitle = '';
let currentQIndex = 0;
let questions = [];
let userAnswers = []; 
let isQuizFinished = false;
let currentFilter = 'all';
let isTestMode = false;
let timerInterval = null;
let timeLeft = 0;

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function openMenu(subjectId, title) {
    currentSubject = subjectId;
    currentSubjectTitle = title;
    document.getElementById('menu-title-header').innerText = title;
    document.querySelector('#menu-title-center span').innerText = title;
    
    // reset menu state
    document.getElementById('practice-options').style.display = 'none'; 
    document.getElementById('dropdown-icon').classList.remove('open');
    
    // Tự động sinh danh sách chia nhỏ
    const chapterSelect = document.getElementById('chapter-select');
    const chapterLabel = document.getElementById('chapter-select-label');
    const practiceBtn = document.getElementById('practice-btn');
    chapterSelect.innerHTML = ''; 
    const subjectData = questionBank[subjectId];
    
    if (!subjectData) {
        chapterSelect.innerHTML = `<option value="none">Chưa có câu hỏi</option>`;
    } else if (Array.isArray(subjectData)) {
        // KIỂU 1: Cấu trúc Mảng (Tự động chia 50 câu/phần)
        if (chapterLabel) chapterLabel.innerText = "Hoặc ôn tập theo từng phần (50 câu):";
        if (practiceBtn) practiceBtn.innerText = "Bắt đầu phần này";
        chapterSelect.innerHTML += `<option value="all">Toàn bộ (${subjectData.length} câu)</option>`;
        const chunkSize = 50;
        const totalChunks = Math.ceil(subjectData.length / chunkSize);
        
        if (totalChunks > 1) {
            for(let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min((i + 1) * chunkSize, subjectData.length);
                chapterSelect.innerHTML += `<option value="chunk_${i}">Phần ${i + 1}: Câu ${start + 1} đến ${end}</option>`;
            }
        }
    } else {
        // KIỂU 2: Cấu trúc Object (Chia theo Chương định sẵn)
        if (chapterLabel) chapterLabel.innerText = "Hoặc chọn chương để ôn tập:";
        if (practiceBtn) practiceBtn.innerText = "Bắt đầu chương này";
        let totalQ = 0;
        let chapterHTML = '';
        for (const [chapterName, qArr] of Object.entries(subjectData)) {
            totalQ += qArr.length;
            chapterHTML += `<option value="chapter_${chapterName}">${chapterName} (${qArr.length} câu)</option>`;
        }
        chapterSelect.innerHTML = `<option value="all">Toàn bộ (${totalQ} câu)</option>` + chapterHTML;
    }
    
    loadHistory();
    showView('view-menu');
}

function togglePracticeOptions() {
    const opts = document.getElementById('practice-options');
    const icon = document.getElementById('dropdown-icon');
    
    if (opts.style.display === 'none') {
        opts.style.display = 'block';
        icon.classList.add('open');
    } else {
        opts.style.display = 'none';
        icon.classList.remove('open');
    }
}

function startPractice(mode) {
    const subjectData = questionBank[currentSubject];
    if (!subjectData) {
        alert("Môn này chưa có câu hỏi!"); return;
    }
    
    let allQ = [];
    if (Array.isArray(subjectData)) {
        allQ = subjectData;
    } else {
        for (const qArr of Object.values(subjectData)) {
            allQ = allQ.concat(qArr);
        }
    }

    if (allQ.length === 0) {
        alert("Môn này chưa có câu hỏi!"); return;
    }
    
    if (mode === 'test' || mode === 40 || mode === 60) {
        let count = mode === 'test' ? 40 : mode;
        let shuffled = [...allQ].sort(() => 0.5 - Math.random());
        questions = shuffled.slice(0, count); 
    } else if (mode === 'chunk') {
        const selectVal = document.getElementById('chapter-select').value;
        if (selectVal === 'all') {
            questions = allQ;
        } else if (selectVal.startsWith('chunk_')) {
            const chunkIndex = parseInt(selectVal.replace('chunk_', ''));
            const chunkSize = 50; 
            const start = chunkIndex * chunkSize;
            const end = start + chunkSize;
            questions = allQ.slice(start, end);
        } else if (selectVal.startsWith('chapter_')) {
            const chapterName = selectVal.replace('chapter_', '');
            questions = subjectData[chapterName];
        } else {
            return;
        }
    } else {
        questions = allQ;
    }

    isTestMode = (mode === 'test');
    currentQIndex = 0;
    userAnswers = new Array(questions.length).fill(null); 
    isQuizFinished = false;
    currentFilter = 'all';
    
    // Reset UI
    document.getElementById('sidebar-tabs').style.display = 'none';
    document.getElementById('sidebar-legend').style.display = 'flex';
    document.getElementById('sidebar-legend-finished').style.display = 'none';
    document.getElementById('finish-btn-desktop').innerText = 'Xong';
    document.getElementById('finish-btn-sidebar').innerText = 'Nộp bài thi';
    
    // Reset tab buttons active state
    const tabs = document.querySelectorAll('.tab-btn');
    if(tabs.length) {
        tabs.forEach(t => t.classList.remove('active'));
        tabs[0].classList.add('active');
    }
    
    document.getElementById('quiz-header-title').innerText = isTestMode ? "Đang thi thử" : currentSubjectTitle;
    
    if (isTestMode) {
        timeLeft = 3600; // 60 minutes
        document.getElementById('timer-display').innerText = formatTime(timeLeft);
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer-display').innerText = formatTime(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert("Hết thời gian làm bài! Hệ thống tự động nộp bài.");
                finishQuiz();
            }
        }, 1000);
    } else {
        if (timerInterval) clearInterval(timerInterval);
        document.getElementById('timer-display').innerText = '∞';
    }
    
    showView('view-quiz');
    buildQuestionGrid();
    loadQuestion();
}

function buildQuestionGrid() {
    const grid = document.getElementById('question-grid');
    grid.innerHTML = '';
    for(let i = 0; i < questions.length; i++) {
        const box = document.createElement('div');
        box.className = 'q-box';
        box.id = 'qbox-' + i;
        box.innerText = i + 1;
        box.onclick = () => goToQuestion(i);
        grid.appendChild(box);
    }
    updateGridCounter();
}

function updateGridStyles() {
    for(let i = 0; i < questions.length; i++) {
        const box = document.getElementById('qbox-' + i);
        if(!box) continue;
        box.className = 'q-box'; 
        
        if (isQuizFinished) {
            if (userAnswers[i] === questions[i].correct) {
                box.classList.add('correct-box');
            } else {
                box.classList.add('wrong-box');
            }
        } else {
            if (userAnswers[i] !== null) {
                box.classList.add('done');
            }
        }
        
        if (i === currentQIndex) {
            box.classList.add('viewing');
        }
    }
}

function filterGrid(type) {
    currentFilter = type;
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    if(type === 'all') tabs[0].classList.add('active');
    if(type === 'correct') tabs[1].classList.add('active');
    if(type === 'wrong') tabs[2].classList.add('active');
    
    for(let i = 0; i < questions.length; i++) {
        const box = document.getElementById('qbox-' + i);
        if (!box) continue;
        
        let isCorrect = (userAnswers[i] === questions[i].correct);
        
        if (type === 'all') {
            box.style.display = 'flex';
        } else if (type === 'correct') {
            box.style.display = isCorrect ? 'flex' : 'none';
        } else if (type === 'wrong') {
            box.style.display = !isCorrect ? 'flex' : 'none';
        }
    }
}

function updateGridCounter() {
    const doneCount = userAnswers.filter(ans => ans !== null).length;
    document.getElementById('grid-counter').innerText = `${doneCount}/${questions.length}`;
}

function loadQuestion() {
    const qData = questions[currentQIndex];
    document.getElementById('question-counter').innerText = `${currentQIndex + 1}/${questions.length}`;
    
    document.getElementById('question-number').innerText = `Câu ${currentQIndex + 1}:`;
    const tagEl = document.getElementById('question-result-tag');
    const bannerEl = document.getElementById('unanswered-banner');
    
    if (isQuizFinished) {
        if (userAnswers[currentQIndex] === qData.correct) {
            tagEl.innerHTML = '✔ ĐÚNG';
            tagEl.className = 'tag-correct';
            tagEl.style.display = 'inline-block';
            bannerEl.style.display = 'none';
        } else {
            tagEl.innerHTML = '✘ SAI';
            tagEl.className = 'tag-wrong';
            tagEl.style.display = 'inline-block';
            if (userAnswers[currentQIndex] === null) {
                bannerEl.style.display = 'block';
            } else {
                bannerEl.style.display = 'none';
            }
        }
    } else {
        tagEl.style.display = 'none';
        bannerEl.style.display = 'none';
    }
    
    let formattedQ = qData.question.replace(/([:;])\s*(?=\(\d+\))/g, '$1<br>&nbsp;&nbsp;&nbsp;&nbsp;');
    document.getElementById('question-text').innerHTML = formattedQ;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 

    qData.options.forEach((optText, index) => {
        const btn = document.createElement('div');
        btn.className = 'opt-btn';
        
        btn.innerHTML = `<div class="opt-circle"></div> <div>${optText}</div>`;
        
        if (isQuizFinished || (!isTestMode && userAnswers[currentQIndex] !== null)) {
            if (index === qData.correct) {
                btn.classList.add('correct');
            } else if (index === userAnswers[currentQIndex]) {
                btn.classList.add('wrong');
            }
        } else {
            if (isTestMode && index === userAnswers[currentQIndex]) {
                btn.classList.add('selected-opt');
            }
            btn.onclick = () => checkAnswer(index, qData.correct);
        }

        optionsContainer.appendChild(btn);
    });

    updateGridStyles();
}

function checkAnswer(selectedIndex, correctIndex) {
    if (isQuizFinished) return;
    if (!isTestMode && userAnswers[currentQIndex] !== null) return; 

    userAnswers[currentQIndex] = selectedIndex; 
    
    const buttons = document.querySelectorAll('.opt-btn');
    if (isTestMode) {
        buttons.forEach(btn => btn.classList.remove('selected-opt'));
        buttons[selectedIndex].classList.add('selected-opt');
    } else {
        buttons.forEach(btn => btn.onclick = null);
        if (selectedIndex === correctIndex) {
            buttons[selectedIndex].classList.add('correct');
        } else {
            buttons[selectedIndex].classList.add('wrong');
            buttons[correctIndex].classList.add('correct');
        }
    }
    
    updateGridCounter();
    updateGridStyles();
}

function prevQuestion() {
    if (currentQIndex > 0) {
        currentQIndex--;
        loadQuestion();
    }
}

function nextQuestion() {
    if (currentQIndex < questions.length - 1) {
        currentQIndex++;
        loadQuestion();
    }
}

function goToQuestion(index) {
    currentQIndex = index;
    loadQuestion();
}

function finishQuiz() {
    if (isQuizFinished) {
        showView('view-menu');
        return;
    }

    const doneCount = userAnswers.filter(ans => ans !== null).length;
    if (doneCount < questions.length) {
        if(!confirm(`BẠN CHẮC CHẮN MUỐN KẾT THÚC BÀI THI CHỨ!!!!`)) {
            return;
        }
    }
    
    let correctCount = 0;
    for(let i=0; i<questions.length; i++) {
        if(userAnswers[i] === questions[i].correct) correctCount++;
    }
    let wrongCount = questions.length - correctCount;
    
    let score = 10 - (10 / questions.length) * wrongCount;
    score = Math.round(score * 100) / 100;
    
    alert(`Kết quả làm bài:\n\nĐIỂM SỐ: ${score} điểm\n\nSố câu đúng: ${correctCount} câu\nSố câu sai / chưa làm: ${wrongCount} câu`);
    
    isQuizFinished = true;
    document.getElementById('finish-btn-desktop').innerText = 'Thoát';
    document.getElementById('finish-btn-sidebar').innerText = 'Thoát xem lại';
    
    document.getElementById('sidebar-tabs').style.display = 'flex';
    document.getElementById('sidebar-legend').style.display = 'none';
    document.getElementById('sidebar-legend-finished').style.display = 'flex';
    
    if (timerInterval) clearInterval(timerInterval);
    
    // Save history
    let historyStore = JSON.parse(localStorage.getItem('quizHistory')) || {};
    if(!historyStore[currentSubject]) historyStore[currentSubject] = [];
    historyStore[currentSubject].unshift({
        date: new Date().toLocaleString('vi-VN'),
        type: isTestMode ? 'Thi thử' : 'Ôn tập ngẫu nhiên',
        score: score,
        correctCount: correctCount,
        total: questions.length,
        questions: questions,
        userAnswers: userAnswers,
        isTestMode: isTestMode
    });
    localStorage.setItem('quizHistory', JSON.stringify(historyStore));
    
    filterGrid('all');
    loadQuestion();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function backFromQuiz() {
    if (!isQuizFinished) {
        if(!confirm("THOÁT RA SẼ MẤT LỊCH SỬ LÀM BÀI! TIẾP TỤC THOÁT?")) {
            return;
        }
    }
    if (timerInterval) clearInterval(timerInterval);
    loadHistory();
    showView('view-menu');
}

function loadHistory() {
    const histSection = document.getElementById('history-section');
    const histList = document.getElementById('history-list');
    
    let historyStore = JSON.parse(localStorage.getItem('quizHistory')) || {};
    let subjHistory = historyStore[currentSubject] || [];
    
    if (subjHistory.length === 0) {
        histSection.style.display = 'none';
        return;
    }
    
    histSection.style.display = 'block';
    histList.innerHTML = '';
    
    subjHistory.forEach((item, index) => {
        let scoreClass = 'score-medium';
        if (item.score >= 8) scoreClass = 'score-high';
        else if (item.score < 5) scoreClass = 'score-low';
        
        histList.innerHTML += `
            <div class="history-card" onclick="reviewHistory(${index})">
                <div class="history-info">
                    <h4>${item.type} <span style="font-size:12px; color:#888; font-weight:normal;">(Xem chi tiết)</span></h4>
                    <p>${item.date}</p>
                    <div class="stats">Đúng <span style="color:var(--primary); font-weight:bold;">${item.correctCount}/${item.total}</span> câu</div>
                </div>
                <div class="history-score ${scoreClass}">${item.score.toFixed(1)}</div>
            </div>
        `;
    });
}

function clearHistory() {
    if(!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử của môn này?")) return;
    let historyStore = JSON.parse(localStorage.getItem('quizHistory')) || {};
    historyStore[currentSubject] = [];
    localStorage.setItem('quizHistory', JSON.stringify(historyStore));
    loadHistory();
}

function reviewHistory(index) {
    let historyStore = JSON.parse(localStorage.getItem('quizHistory')) || {};
    let subjHistory = historyStore[currentSubject] || [];
    let item = subjHistory[index];
    if(!item) return;
    
    questions = item.questions;
    userAnswers = item.userAnswers;
    isTestMode = item.isTestMode;
    isQuizFinished = true;
    currentFilter = 'all';
    currentQIndex = 0;
    
    document.getElementById('quiz-header-title').innerText = currentSubjectTitle;
    document.getElementById('finish-btn-desktop').innerText = 'Thoát';
    document.getElementById('finish-btn-sidebar').innerText = 'Thoát xem lại';
    document.getElementById('timer-display').innerText = '--:--';
    
    document.getElementById('sidebar-tabs').style.display = 'flex';
    document.getElementById('sidebar-legend').style.display = 'none';
    document.getElementById('sidebar-legend-finished').style.display = 'flex';
    
    showView('view-quiz');
    buildQuestionGrid();
    filterGrid('all');
    loadQuestion();
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('quiz-sidebar');
    if (sidebar.classList.contains('show-mobile')) {
        sidebar.classList.remove('show-mobile');
    } else {
        sidebar.classList.add('show-mobile');
    }
}

// ----------------------------------------
// CHỨC NĂNG: XEM ĐỀ CƯƠNG
// ----------------------------------------
function openStudyGuide() {
    const subjectData = questionBank[currentSubject];
    if (!subjectData) {
        alert("Môn này chưa có câu hỏi!"); return;
    }
    
    document.getElementById('guide-header-title').innerText = currentSubjectTitle;
    document.getElementById('guide-main-title').innerText = "Đề cương: " + currentSubjectTitle;
    
    const listContainer = document.getElementById('guide-content-list');
    listContainer.innerHTML = ''; 

    if (Array.isArray(subjectData)) {
        renderStudyGuideList(subjectData, listContainer, 0);
    } else {
        // In theo từng chương
        let globalIndex = 0;
        for (const [chapterName, qArr] of Object.entries(subjectData)) {
            const chapTitle = document.createElement('h3');
            chapTitle.style.color = 'var(--primary)';
            chapTitle.style.marginTop = '30px';
            chapTitle.innerText = chapterName;
            listContainer.appendChild(chapTitle);
            
            globalIndex = renderStudyGuideList(qArr, listContainer, globalIndex);
        }
    }

    showView('view-study-guide');
}

// ----------------------------------------
// CẬP NHẬT TRUY CẬP
// ----------------------------------------
function updateViewCounters() {
    // Lượt truy cập dựa vào LocalStorage
    let totalViews = localStorage.getItem('total_site_views');
    if (!totalViews) totalViews = 0; // Bắt đầu từ số 0
    totalViews = parseInt(totalViews) + 1;
    localStorage.setItem('total_site_views', totalViews);
    
    const viewsEl = document.getElementById('total-views');
    if(viewsEl) viewsEl.innerText = totalViews.toLocaleString('vi-VN');
}
updateViewCounters();

// ----------------------------------------
// LẮNG NGHE SỰ KIỆN BÀN PHÍM
// ----------------------------------------
document.addEventListener('keydown', function(event) {
    // Chỉ xử lý phím tắt khi đang ở màn hình thi/ôn tập
    const viewQuiz = document.getElementById('view-quiz');
    if (!viewQuiz || !viewQuiz.classList.contains('active')) return;

    // Lùi câu (Mũi tên trái)
    if (event.key === 'ArrowLeft') {
        prevQuestion();
        return;
    }
    
    // Tiến câu (Mũi tên phải)
    if (event.key === 'ArrowRight') {
        nextQuestion();
        return;
    }
    
    // Kết thúc / Thoát (Enter)
    if (event.key === 'Enter') {
        finishQuiz();
        return;
    }

    // Chọn đáp án 1, 2, 3, 4
    if (event.key >= '1' && event.key <= '4') {
        const idx = parseInt(event.key) - 1;
        const options = document.querySelectorAll('.opt-btn');
        if (options && options.length > idx) {
            options[idx].click();
        }
    }
});

function renderStudyGuideList(qArr, container, startIndex) {
    let currentIndex = startIndex;
    qArr.forEach((qData) => {
        const card = document.createElement('div');
        card.className = 'guide-card';
        
        const qTitle = document.createElement('p');
        qTitle.className = 'guide-q';
        let formattedQ = qData.question.replace(/([:;])\s*(?=\(\d+\))/g, '$1<br>&nbsp;&nbsp;&nbsp;&nbsp;');
        qTitle.innerHTML = `<strong>Câu ${currentIndex + 1}:</strong> ${formattedQ}`;
        card.appendChild(qTitle);

        qData.options.forEach((optText, optIndex) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'guide-opt';
            optDiv.innerText = optText;
            
            if (optIndex === qData.correct) {
                optDiv.classList.add('correct-ans');
                optDiv.innerHTML = `✓ &nbsp; ${optText}`; 
            }
            
            card.appendChild(optDiv);
        });

        container.appendChild(card);
        currentIndex++;
    });
    return currentIndex;
}
