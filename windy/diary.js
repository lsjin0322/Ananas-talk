
function openDiaryModal() {
    const textarea = document.getElementById('modal-note-area');
    if (textarea) textarea.value = ""; 
    document.getElementById('diary-modal').classList.add('open');
}

function closeDiaryModal() {
    document.getElementById('diary-modal').classList.remove('open');
}

function saveDiaryNote() {
    const textarea = document.getElementById('modal-note-area');
    if (!textarea) return;

    const noteText = textarea.value.trim();
    if (!noteText) {
        alert("내용이 비어 있어 일기를 보관할 수 없어요. 마음을 한 글자라도 적어주세요. 📝");
        return;
    }
    
    let savedNotes = [];
    try {
        savedNotes = JSON.parse(localStorage.getItem('moodweather_notes') || "[]");
    } catch (e) {
        savedNotes = [];
    }
    
    const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
        associatedQuote: typeof activeQuoteGlobal !== 'undefined' ? activeQuoteGlobal : "선택된 격언 없음",
        content: noteText
    };
    
    savedNotes.push(newRecord);
    localStorage.setItem('moodweather_notes', JSON.stringify(savedNotes));
    
    alert("💖 다이어리 보관함에 일기가 포근하게 저장되었습니다.");
    closeDiaryModal();
}

/**
 * [독립창 동적 연동] LocalStorage 배열을 판독하여 물리 카드 컴포넌트 렌더링
 */
function renderDiaryList() {
    const renderZone = document.getElementById('diary-list-render-zone');
    if (!renderZone) return;

    renderZone.innerHTML = ""; 

    let savedNotes = [];
    try {
        savedNotes = JSON.parse(localStorage.getItem('moodweather_notes') || "[]");
    } catch (e) {
        savedNotes = [];
    }

    if (savedNotes.length === 0) {
        renderZone.innerHTML = `
            <div class="empty-diary-msg">
                <p>아직 보관된 마음 조각이 없어요. ☁️</p>
                <p style="font-size:12px; margin-top:6px; opacity:0.5;">메인 화면에서 감정을 고르고 일기를 작성해 보세요.</p>
            </div>
        `;
        return;
    }


    savedNotes.reverse().forEach((note) => {
        const card = document.createElement('div');
        card.className = 'diary-history-card';
        card.innerHTML = `
            <div class="diary-card-header">
                <span class="diary-card-date">📅 ${note.date}</span>
                <button class="diary-card-delete-btn" onclick="deleteDiaryCard(${note.id})">
                    <i class="fa-solid fa-trash-can"></i> 삭제
                </button>
            </div>
            <div class="diary-card-quote">💬 ${note.associatedQuote}</div>
            <div class="diary-card-content">${escapeHtml(note.content)}</div>
        `;
        renderZone.appendChild(card);
    });
}

function deleteDiaryCard(noteId) {
    if (!confirm("이 마음 기록을 보관함에서 정말 삭제할까요? 🥺")) return;

    let savedNotes = [];
    try {
        savedNotes = JSON.parse(localStorage.getItem('moodweather_notes') || "[]");
    } catch (e) {
        savedNotes = [];
    }

    savedNotes = savedNotes.filter(note => note.id !== noteId);
    localStorage.setItem('moodweather_notes', JSON.stringify(savedNotes));

    renderDiaryList(); 
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
