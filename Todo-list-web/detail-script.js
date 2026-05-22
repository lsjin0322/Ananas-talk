document.addEventListener('DOMContentLoaded', () => {
    // [컬러 실시간 전면 연동 엔진] 설정창에서 지정한 파스텔 테마 불러오기
    const savedGlobalTheme = localStorage.getItem('app-custom-theme') || 'orange';
    document.body.setAttribute('data-theme', savedGlobalTheme);

    const deleteBtn = document.getElementById('delete-btn');
    const saveBtn = document.getElementById('save-btn');
    const memoInput = document.getElementById('memo-input');
    const titleInput = document.getElementById('detail-task-title-input');
    const dateInput = document.getElementById('visible-date-input');
    
    const importanceButtons = document.querySelectorAll('#importance-group .chip-btn');
    const statusButtons = document.querySelectorAll('#status-group .status-btn');

    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    if (dateInput && !dateInput.value) {
        dateInput.value = now.toISOString().substring(0, 10);
    }

    let todos = JSON.parse(localStorage.getItem('my-todo-items')) || [];
    let targetId = localStorage.getItem('current-edit-id');
    let currentTodo = todos.find(t => t.id == targetId);

    if (currentTodo) {
        titleInput.value = currentTodo.title.replace(' ⭐️', '').trim();
        memoInput.value = currentTodo.memo || '';
        if (currentTodo.selectedDate) {
            const match = currentTodo.selectedDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);
            if (match) dateInput.value = `${match[1]}-${match[2]}-${match[3]}`;
        }

        importanceButtons.forEach(btn => {
            if (currentTodo.importanceLevel === btn.getAttribute('data-level')) btn.classList.add('active-orange');
        });

        statusButtons.forEach(btn => {
            if (currentTodo.isCompleted && btn.getAttribute('data-status') === 'complete') btn.classList.add('active-dark-brown');
            if (!currentTodo.isCompleted && btn.getAttribute('data-status') === 'progress') btn.classList.add('active-dark-brown');
        });
    } else {
        const quickText = localStorage.getItem('temp-quick-text');
        if (quickText) titleInput.value = quickText;
        localStorage.removeItem('temp-quick-text');

        document.querySelector('#importance-group [data-level="normal"]').classList.add('active-orange');
        document.querySelector('#status-group [data-status="progress"]').classList.add('active-dark-brown');
        if (deleteBtn) deleteBtn.style.display = 'none';
    }

    importanceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            importanceButtons.forEach(b => b.classList.remove('active-orange'));
            btn.classList.add('active-orange');
        });
    });

    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statusButtons.forEach(b => b.classList.remove('active-dark-brown'));
            btn.classList.add('active-dark-brown');
        });
    });

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (!confirm('이 일정을 삭제하시겠습니까?')) return;
            todos = todos.filter(t => t.id !== currentTodo.id);
            localStorage.setItem('my-todo-items', JSON.stringify(todos));
            location.href = 'index.html';
        });
    }

    saveBtn.addEventListener('click', () => {
        const titleText = titleInput.value.trim();
        if (!titleText) {
            alert('할 일 내용을 입력해주세요.');
            return;
        }

        const dateVal = dateInput.value;
        const selectedDateObj = new Date(dateVal);
        const formattedDate = `${selectedDateObj.getFullYear()}.${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}.${String(selectedDateObj.getDate()).padStart(2, '0')} (${days[selectedDateObj.getDay()]})`;

        const activeLevel = document.querySelector('#importance-group .active-orange').getAttribute('data-level');
        const activeStatus = document.querySelector('#status-group .active-dark-brown').getAttribute('data-status');

        let isCompleted = (activeStatus === 'complete');
        let isImportant = (activeLevel === 'high');
        let finalTitle = titleText;

        if (isImportant) finalTitle += ' ⭐️';

        const todayStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
        const targetStr = `${selectedDateObj.getFullYear()}.${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}.${String(selectedDateObj.getDate()).padStart(2, '0')}`;
        let isToday = (todayStr === targetStr);

        if (currentTodo) {
            currentTodo.title = finalTitle;
            currentTodo.selectedDate = formattedDate;
            currentTodo.memo = memoInput.value;
            currentTodo.importanceLevel = activeLevel;
            currentTodo.isImportant = isImportant;
            currentTodo.isCompleted = isCompleted;
            currentTodo.isToday = isToday;
        } else {
            const bgClasses = ['bg-yellow', 'bg-blue', 'bg-orange', 'bg-red'];
            const icons = ['🍀', '☀️', '🦋', '💥', '🧸'];
            const newTodo = {
                id: Date.now(),
                title: finalTitle,
                selectedDate: formattedDate,
                memo: memoInput.value,
                importanceLevel: activeLevel,
                isImportant: isImportant,
                isCompleted: isCompleted,
                isToday: isToday,
                bgClass: bgClasses[Math.floor(Math.random() * bgClasses.length)],
                icon: icons[Math.floor(Math.random() * icons.length)]
            };
            todos.unshift(newTodo);
        }

        localStorage.setItem('my-todo-items', JSON.stringify(todos));
        location.href = 'index.html';
    });
});