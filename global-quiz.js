const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB0RBxOBW1BEAQF22i0wTC0QOnb4EeCVv1RxUGfKlVw8f2NE_eQB0a3YOrqVIbuLC/exec";

let activeIndex = 0;
const totalDurationSec = 5 * 60; 
let timeRemainingSec = totalDurationSec;
let countdownTimerId = null;
let studentName = "";

// शुरू में सभी रिस्पॉन्स खाली (null) रहेंगे
const userResponses = new Array(dataset.length).fill(null);
const markedMatrix = new Array(dataset.length).fill(false);

document.addEventListener('contextmenu', event => event.preventDefault()); 
document.onkeydown = function(e) {
    if (e.keyCode == 123 || e.keyCode == 44) { return false; }
    if (e.ctrlKey && (e.keyCode === 83 || e.keyCode === 80 || e.keyCode === 67 || e.keyCode === 85)) { return false; }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { return false; }
};

window.onload = function() {
    if (localStorage.getItem(QUIZ_KEY) === "true") {
        document.getElementById("boxLoginGate").innerHTML = `
            <h2 style="color:#ef4444;">🚫 एक्सेस ब्लॉक!</h2>
            <p>आप यह परीक्षा पहले ही दे चुके हैं। एक छात्र को केवल एक बार टेस्ट देने की अनुमति है।</p>
            <a href="../tests.html" style="color:#0b1e47; font-weight:bold; text-decoration:none;">🔙 वापस जाएं</a>
        `;
    }
};

function validateAndStartQuiz() {
    studentName = document.getElementById("txtStudentName").value.trim();
    if(!studentName) {
        alert("कृपया परीक्षा शुरू करने के लिए अपना पूरा नाम भरें!");
        return;
    }
    document.getElementById("boxLoginGate").classList.add("hidden");
    document.getElementById("quizWorkspace").classList.remove("hidden");
    initQuiz();
}

function initQuiz() {
    document.getElementById('lblTotalNum').innerText = dataset.length;
    // केवल पहले प्रश्न को विज़िटेड (-1) मार्क करेंगे
    userResponses[0] = -1; 
    buildPaletteGrid();
    displayQuestionCard(0);
    initiateCountdown();
}

function initiateCountdown() {
    countdownTimerId = setInterval(() => {
        if (timeRemainingSec <= 0) {
            clearInterval(countdownTimerId);
            forceAutomaticSubmission();
        } else {
            timeRemainingSec--;
            renderTimerString();
        }
    }, 1000);
}

function renderTimerString() {
    const m = Math.floor(timeRemainingSec / 60);
    const s = timeRemainingSec % 60;
    document.getElementById('countdownTimer').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function displayQuestionCard(idx) {
    activeIndex = idx;
    const item = dataset[idx];
    
    document.getElementById('lblCurrentNum').innerText = idx + 1;
    document.getElementById('boxQuestionText').innerText = item.question;
    
    const optionsWrapper = document.getElementById('boxOptionsList');
    optionsWrapper.innerHTML = '';
    
    const badges = ['A', 'B', 'C', 'D'];
    item.options.forEach((txt, oIdx) => {
        const row = document.createElement('div');
        row.className = 'option-item';
        // अगर छात्र ने पहले से कोई विकल्प चुना हुआ है (यानी >= 0)
        if (userResponses[idx] === oIdx) row.classList.add('selected');
        
        row.onclick = () => assignSelection(oIdx);
        row.innerHTML = `<div class="option-circle">${badges[oIdx]}</div><div class="option-label">${txt}</div>`;
        optionsWrapper.appendChild(row);
    });
    
    const mainNavBtn = document.getElementById('btnMainNav');
    if (idx === dataset.length - 1) {
        mainNavBtn.innerText = '✔ सबमिट करें';
        mainNavBtn.className = 'btn-main-action submit-state';
    } else {
        mainNavBtn.innerText = 'अगला ▶';
        mainNavBtn.className = 'btn-main-action';
    }
    
    // अगर पहली बार इस प्रश्न पर आए हैं, तो इसे विज़िटेड (-1) सेट करें
    if (userResponses[idx] === null) {
        userResponses[idx] = -1; 
    }
    buildPaletteGrid();
}

function assignSelection(oIdx) {
    userResponses[activeIndex] = oIdx;
    document.querySelectorAll('.option-item').forEach((row, i) => {
        if (i === oIdx) row.classList.add('selected');
        else row.classList.remove('selected');
    });
    buildPaletteGrid();
}

function doClearAnswer() {
    userResponses[activeIndex] = -1;
    markedMatrix[activeIndex] = false;
    displayQuestionCard(activeIndex);
}

function doToggleMark() {
    markedMatrix[activeIndex] = !markedMatrix[activeIndex];
    buildPaletteGrid();
}

function doNavigatePrev() {
    if (activeIndex > 0) {
        if (userResponses[activeIndex - 1] === null) userResponses[activeIndex - 1] = -1;
        displayQuestionCard(activeIndex - 1);
    }
}

function handleMainAction() {
    if (activeIndex === dataset.length - 1) {
        triggerTestSubmission();
    } else {
        if (userResponses[activeIndex + 1] === null) userResponses[activeIndex + 1] = -1;
        displayQuestionCard(activeIndex + 1);
    }
}

function jumpToTargetIdx(idx) {
    if (userResponses[idx] === null) userResponses[idx] = -1;
    displayQuestionCard(idx);
}

function buildPaletteGrid() {
    const container = document.getElementById('boxPaletteGrid');
    if(!container) return;
    container.innerHTML = '';
    
    for (let i = 0; i < dataset.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'palette-cell ';
        
        if (markedMatrix[i]) {
            cell.classList.add('pal-marked');
        } else if (userResponses[i] >= 0) {
            cell.classList.add('pal-answered'); // उत्तर देने पर ही हरा होगा
        } else if (userResponses[i] === -1) {
            cell.classList.add('pal-visited'); // देखने पर लाल बॉर्डर
        } else {
            cell.classList.add('pal-unvisited'); // नहीं देखने पर सफेद डिब्बा
        }
        
        cell.innerText = i + 1;
        cell.onclick = () => jumpToTargetIdx(i);
        container.appendChild(cell);
    }
}

function forceAutomaticSubmission() {
    alert("समय समाप्त! आपका टेस्ट अपने आप सबमिट हो रहा है।");
    processFinalCalculation();
}

function triggerTestSubmission() {
    if (confirm("क्या आप वाकई अपना test सबमिट करना चाहते हैं?")) {
        clearInterval(countdownTimerId);
        processFinalCalculation();
    }
}

function processFinalCalculation() {
    document.getElementById('quizWorkspace').classList.add('hidden');
    
    const dashboard = document.getElementById('boxReportDashboard');
    if(dashboard) dashboard.style.display = 'block';
    
    const studentNameLbl = document.getElementById('lblReportStudentName');
    if(studentNameLbl) studentNameLbl.innerText = "परीक्षार्थी: " + studentName;
    
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    
    const reviewWrapper = document.getElementById('boxReviewAnswersList');
    if(reviewWrapper) reviewWrapper.innerHTML = '';
    
    dataset.forEach((item, idx) => {
        const userAns = userResponses[idx];
        const isCorrect = (userAns === item.correct);
        
        let cardClass = 'review-card-item ';
        let statusText = '';
        
        if (userAns === null || userAns === -1) {
            skipped++;
            cardClass += 'skipped-left';
            statusText = '<span class="review-status-mark status-skipped">⚪ छोड़ा गया</span>';
        } else if (isCorrect) {
            correct++;
            cardClass += 'correct-left';
            statusText = '<span class="review-status-mark status-correct">✅ सही</span>';
        } else {
            incorrect++;
            cardClass += 'incorrect-left';
            statusText = '<span class="review-status-mark status-incorrect">❌ गलत</span>';
        }
        
        if(reviewWrapper) {
            const rCard = document.createElement('div');
            rCard.className = cardClass;
            rCard.innerHTML = `
                <div class="review-question-row">${statusText} ${item.question}</div>
                <div class="review-data-line"><b>आपका उत्तर:</b> ${userAns >= 0 ? item.options[userAns] : 'अनांसरित'}</div>
                <div class="review-data-line"><b>सही उत्तर:</b> ${item.options[item.correct]}</div>
            `;
            reviewWrapper.appendChild(rCard);
        }
    });
    
    const timeConsumedSec = totalDurationSec - timeRemainingSec;
    const minStr = Math.floor(timeConsumedSec / 60).toString().padStart(2, '0');
    const secStr = (timeConsumedSec % 60).toString().padStart(2, '0');
    const timeStr = `${minStr}:${secStr}`;
    
    // डेटा को रिपोर्ट कार्ड में डालना
    if(document.getElementById('valNetScore')) document.getElementById('valNetScore').innerText = `${correct} / ${dataset.length}`;
    if(document.getElementById('valCorrectCount')) document.getElementById('valCorrectCount').innerText = correct;
    if(document.getElementById('valIncorrectCount')) document.getElementById('valIncorrectCount').innerText = incorrect;
    if(document.getElementById('valSkippedCount')) document.getElementById('valSkippedCount').innerText = skipped;
    if(document.getElementById('valTimeConsumed')) document.getElementById('valTimeConsumed').innerText = timeStr;
    
    // ऑटो-डाउनलोड रिजल्ट कार्ड इमेज
    setTimeout(() => {
        const target = document.getElementById('captureTarget');
        if(target) {
            html2canvas(target, { scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = studentName + '_Result_Card.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    }, 1000);

    let postData = {
        studentName: studentName,
        studentMobile: "Not Provided",
        score: correct, 
        correct: correct,
        incorrect: incorrect,
        timeUsed: `${minStr} मिनट ${secStr} सेकंड`
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
    }).then(() => {
        localStorage.setItem(QUIZ_KEY, "true");
        console.log("गूगल शीट सिंक सक्सेस!");
    }).catch(err => console.error("शीट एरर:", err));
}

function captureCardAndOpenGroup() {
    const target = document.getElementById('captureTarget');
    if(!target) return;
    html2canvas(target, { scale: 2 }).then(canvas => {
        canvas.toBlob(blob => {
            if (navigator.clipboard && navigator.clipboard.write) {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    alert("रिजल्ट कार्ड इमेज कॉपी हो गई है! टेलीग्राम पर पेस्ट करें।");
                    window.open("https://t.me/Medhavi_Study_Point");
                }).catch(err => alert("कॉपी विफल: " + err));
            } else {
                alert("ब्राउज़र सपोर्ट नहीं करता।");
            }
        }, "image/png");
    });
                           }
