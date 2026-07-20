const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlB0RBxOBW1BEAQF22i0wTC0QOnb4EeCVv1RxUGfKlVw8f2NE_eQB0a3YOrqVIbuLC/exec";

let activeIndex = 0;
// HTML के countdownTimer डिब्बे से समय (उदा. 55:00) पढ़कर टाइमर सेट करें
const timerElem = document.getElementById('countdownTimer');
const timeParts = timerElem ? timerElem.innerText.trim().split(':') : ["05", "00"];
const parsedMins = parseInt(timeParts[0], 10) || 5;
const parsedSecs = parseInt(timeParts[1], 10) || 0;

const totalDurationSec = (parsedMins * 60) + parsedSecs;
let timeRemainingSec = totalDurationSec;

let countdownTimerId = null;
let studentName = "";
let isReattemptMode = false;

// null = Not Visited (White), -1 = Skipped (Red), -2 = Visited but not answered yet, >=0 = Answered (Green)
let userResponses = [];
let markedMatrix = [];

document.addEventListener('contextmenu', event => event.preventDefault()); 
document.onkeydown = function(e) {
    if (e.keyCode == 123 || e.keyCode == 44) { return false; }
    if (e.ctrlKey && (e.keyCode === 83 || e.keyCode === 80 || e.keyCode === 67 || e.keyCode === 85)) { return false; }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { return false; }
};

window.onload = function() {
    if (localStorage.getItem(QUIZ_KEY) === "true") {
        const savedName = localStorage.getItem(QUIZ_KEY + "_name") || "छात्र";
        const gate = document.getElementById("boxLoginGate");
        if(gate) {
            gate.innerHTML = `
                <h2 style="color:#0b1e47;">📊 परीक्षा पूर्ण हो चुकी है!</h2>
                <p><b>${savedName}</b>, आप यह परीक्षा पहले ही दे चुके हैं।</p>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <button class="btn-main-action" style="background:#16a34a;" onclick="viewSavedResult()">📊 See Previous Result (परिणाम देखें)</button>
                    <button class="btn-main-action" style="background:#ea580c;" onclick="startReattemptQuiz()">🔄 Re-Attempt Test (पुनः प्रयास करें)</button>
                </div>
                <br>
                <a href="../tests.html" style="color:#64748b; font-weight:bold; text-decoration:none;">🔙 विषय चयन पर वापस जाएं</a>
            `;
        }
    }
};

function startReattemptQuiz() {
    isReattemptMode = true;
    const savedName = localStorage.getItem(QUIZ_KEY + "_name") || "";
    document.getElementById("boxLoginGate").innerHTML = `
        <h2>Medhavi Re-Attempt Gate</h2>
        <p>पुनः परीक्षा देने के लिए आपका नाम (Locked):</p>
        <input type="text" id="txtStudentName" value="${savedName}" disabled style="background:#f1f5f9; cursor:not-allowed; color:#475569; font-weight:bold;">
        <button class="btn-main-action" style="background:#ea580c;" onclick="validateAndStartQuiz()">री-अटेंप्ट शुरू करें 🚀</button>
        <br><br>
        <a href="../tests.html" style="color:#64748b; font-weight:600; text-decoration:none;">🔙 वापस जाएं</a>
    `;
}

function validateAndStartQuiz() {
    const inputElem = document.getElementById("txtStudentName");
    studentName = isReattemptMode ? (localStorage.getItem(QUIZ_KEY + "_name") || "") : (inputElem ? inputElem.value.trim() : "");
    
    if(!studentName) {
        alert("कृपया परीक्षा शुरू करने के लिए अपना पूरा नाम भरें!");
        return;
    }
    
    userResponses = new Array(dataset.length);
    markedMatrix = new Array(dataset.length);
    for(let i = 0; i < dataset.length; i++) {
        userResponses[i] = null;
        markedMatrix[i] = false;
    }
    
    timeRemainingSec = totalDurationSec;
    
    document.getElementById("boxLoginGate").classList.add("hidden");
    document.getElementById("quizWorkspace").classList.remove("hidden");
    initQuiz();
}

function initQuiz() {
    document.getElementById('lblTotalNum').innerText = dataset.length;
    displayQuestionCard(0);
    initiateCountdown();
}

function initiateCountdown() {
    if(countdownTimerId) clearInterval(countdownTimerId);
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
    const timerElem = document.getElementById('countdownTimer');
    if(timerElem) timerElem.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function checkAndMarkPreviousVisited(prevIdx) {
    // जब हम किसी प्रश्न को छोड़कर आगे या दूसरे प्रश्न पर जाते हैं,
    // अगर उसका उत्तर नहीं दिया गया है (null या -2), तो उसे Skipped (-1 यानी लाल) कर देंगे।
    if (userResponses[prevIdx] === null || userResponses[prevIdx] === -2) {
        userResponses[prevIdx] = -1;
    }
}

function displayQuestionCard(idx) {
    // पुराने वाले प्रश्न की स्थिति जांचें कि क्या वह स्किप हुआ है
    if (activeIndex !== idx) {
        checkAndMarkPreviousVisited(activeIndex);
    }

    activeIndex = idx;
    const item = dataset[idx];
    
    // वर्तमान प्रश्न अगर बिल्कुल नया है, तो उसे अभी लाल नहीं करेंगे, वह सफेद ही रहेगा (जब तक इससे आगे न जाएं)
    if (userResponses[idx] === null) {
        userResponses[idx] = -2; // -2 मतलब अभी खुला है (Visited but current)
    }

    document.getElementById('lblCurrentNum').innerText = idx + 1;
    document.getElementById('boxQuestionText').innerText = item.question;
    
    const optionsWrapper = document.getElementById('boxOptionsList');
    optionsWrapper.innerHTML = '';
    
    const badges = ['A', 'B', 'C', 'D'];
    item.options.forEach((txt, oIdx) => {
        const row = document.createElement('div');
        row.className = 'option-item';
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
    userResponses[activeIndex] = -2; // वापस वर्तमान खुले हुए स्टेट में लाएं
    markedMatrix[activeIndex] = false;
    displayQuestionCard(activeIndex);
}

function doToggleMark() {
    markedMatrix[activeIndex] = !markedMatrix[activeIndex];
    buildPaletteGrid();
}

function doNavigatePrev() {
    if (activeIndex > 0) {
        displayQuestionCard(activeIndex - 1);
    }
}

function handleMainAction() {
    if (activeIndex === dataset.length - 1) {
        triggerTestSubmission();
    } else {
        displayQuestionCard(activeIndex + 1);
    }
}

function jumpToTargetIdx(idx) {
    displayQuestionCard(idx);
}

function buildPaletteGrid() {
    const container = document.getElementById('boxPaletteGrid');
    if(!container) return;
    container.innerHTML = '';
    
    for (let i = 0; i < dataset.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'palette-cell';
        
        // ग्रिड रंग लॉजिक
        if (markedMatrix[i]) {
            cell.classList.add('pal-marked'); // बैंगनी
        } else if (userResponses[i] !== null && userResponses[i] >= 0) {
            cell.classList.add('pal-answered'); // हरा
        } else if (userResponses[i] === -1) {
            cell.classList.add('pal-visited'); // लाल (Skipped)
        } else {
            cell.classList.add('pal-unvisited'); // सफेद (Unvisited या वर्तमान खुला हुआ)
        }

        // वर्तमान एक्टिव प्रश्न पर लाल बॉर्डर (यह हमेशा सफेद बैकग्राउंड के साथ दिखेगा जब तक उत्तर न दें)
        if (i === activeIndex) {
            cell.classList.add('active-current-q');
        }
        
        cell.innerText = i + 1;
        cell.onclick = () => jumpToTargetIdx(i);
        container.appendChild(cell);
    }
}

function forceAutomaticSubmission() {
    checkAndMarkPreviousVisited(activeIndex);
    alert("समय समाप्त! आपका टेस्ट अपने आप सबमिट हो रहा है।");
    processFinalCalculation();
}

function triggerTestSubmission() {
    if (confirm("क्या आप वाकई अपना test सबमिट करना चाहते हैं?")) {
        checkAndMarkPreviousVisited(activeIndex);
        clearInterval(countdownTimerId);
        processFinalCalculation();
    }
}

function processFinalCalculation() {
    document.getElementById('quizWorkspace').classList.add('hidden');
    
    const dashboard = document.getElementById('boxReportDashboard');
    if(dashboard) dashboard.style.display = 'block';
    
    const tagText = isReattemptMode ? " <span style='color:#ef4444;'>[Re-attempted]</span>" : "";
    const studentNameLbl = document.getElementById('lblReportStudentName');
    if(studentNameLbl) studentNameLbl.innerHTML = "परीक्षार्थी: " + studentName + tagText;
    
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    
    const reviewWrapper = document.getElementById('boxReviewAnswersList');
    if(reviewWrapper) reviewWrapper.innerHTML = '';
    
    let savedReviewHTML = "";
    
    dataset.forEach((item, idx) => {
        const userAns = userResponses[idx];
        const isCorrect = (userAns === item.correct);
        
        let cardClass = 'review-card-item ';
        let statusText = '';
        
        if (userAns === null || userAns === -1 || userAns === -2) {
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
        
        const cardHTML = `
            <div class="${cardClass}">
                <div class="review-question-row">${statusText} ${item.question}</div>
                <div class="review-data-line"><b>आपका उत्तर:</b> ${(userAns !== null && userAns >= 0) ? item.options[userAns] : 'अनांसरित'}</div>
                <div class="review-data-line"><b>सही उत्तर:</b> ${item.options[item.correct]}</div>
            </div>
        `;
        savedReviewHTML += cardHTML;
    });
    
    if(reviewWrapper) reviewWrapper.innerHTML = savedReviewHTML;
    
    const timeConsumedSec = totalDurationSec - timeRemainingSec;
    const minStr = Math.floor(timeConsumedSec / 60).toString().padStart(2, '0');
    const secStr = (timeConsumedSec % 60).toString().padStart(2, '0');
    const timeStr = `${minStr}:${secStr}`;
    
    if(document.getElementById('valNetScore')) document.getElementById('valNetScore').innerText = `${correct} / ${dataset.length}`;
    if(document.getElementById('valCorrectCount')) document.getElementById('valCorrectCount').innerText = correct;
    if(document.getElementById('valIncorrectCount')) document.getElementById('valIncorrectCount').innerText = incorrect;
    if(document.getElementById('valSkippedCount')) document.getElementById('valSkippedCount').innerText = skipped;
    if(document.getElementById('valTimeConsumed')) document.getElementById('valTimeConsumed').innerText = timeStr;
    
    const resultObj = {
        studentName: studentName,
        correct: correct,
        total: dataset.length,
        incorrect: incorrect,
        skipped: skipped,
        timeStr: timeStr,
        isReattempt: isReattemptMode,
        reviewHTML: savedReviewHTML
    };
    localStorage.setItem(QUIZ_KEY, "true");
    localStorage.setItem(QUIZ_KEY + "_name", studentName);
    localStorage.setItem(QUIZ_KEY + "_result", JSON.stringify(resultObj));

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
        studentMobile: isReattemptMode ? "Re-attempt" : "Not Provided",
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
    }).then(() => console.log("गूगल शीट सिंक सक्सेस!"))
      .catch(err => console.error("शीट एरर:", err));
}

function viewSavedResult() {
    const rawData = localStorage.getItem(QUIZ_KEY + "_result");
    if(!rawData) {
        alert("कोई पुराना परिणाम नहीं मिला!");
        return;
    }
    const res = JSON.parse(rawData);
    
    document.getElementById('boxLoginGate').classList.add('hidden');
    const dashboard = document.getElementById('boxReportDashboard');
    if(dashboard) dashboard.style.display = 'block';
    
    const tagText = res.isReattempt ? " <span style='color:#ef4444;'>[Re-attempted]</span>" : "";
    const studentNameLbl = document.getElementById('lblReportStudentName');
    if(studentNameLbl) studentNameLbl.innerHTML = "परीक्षार्थी: " + res.studentName + tagText;
    
    if(document.getElementById('valNetScore')) document.getElementById('valNetScore').innerText = `${res.correct} / ${res.total}`;
    if(document.getElementById('valCorrectCount')) document.getElementById('valCorrectCount').innerText = res.correct;
    if(document.getElementById('valIncorrectCount')) document.getElementById('valIncorrectCount').innerText = res.incorrect;
    if(document.getElementById('valSkippedCount')) document.getElementById('valSkippedCount').innerText = res.skipped;
    if(document.getElementById('valTimeConsumed')) document.getElementById('valTimeConsumed').innerText = res.timeStr;
    
    const reviewWrapper = document.getElementById('boxReviewAnswersList');
    if(reviewWrapper) reviewWrapper.innerHTML = res.reviewHTML;
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
