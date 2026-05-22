document.addEventListener('DOMContentLoaded', () => {
    // [컬러 실시간 전면 연동 엔진] 설정창에서 지정한 파스텔 테마 불러오기
    const savedGlobalTheme = localStorage.getItem('app-custom-theme') || 'orange';
    document.body.setAttribute('data-theme', savedGlobalTheme);

    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const tabBtns = document.querySelectorAll('.tab-container .tab-btn');
    const navDetailTrigger = document.getElementById('nav-detail-trigger');

    let todos = JSON.parse(localStorage.getItem('my-todo-items')) || [];
    let currentFilter = 'all';

    function renderTodos() {
        if (!todoList) return;
        todoList.innerHTML = '';

        const filteredTodos = todos.filter(todo => {
            if (currentFilter === 'today') return todo.isToday;
            if (currentFilter === 'important') return todo.isImportant;
            if (currentFilter === 'completed') return todo.isCompleted;
            return true;
        });

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.isCompleted ? 'done' : ''}`;
            
            li.innerHTML = `
                <div class="todo-left">
                    <div class="todo-icon ${todo.bgClass || 'bg-yellow'}">${todo.icon || '🍀'}</div>
                    <div>
                        <div class="todo-title">${todo.title}</div>
                        <div class="todo-time">${todo.selectedDate || todo.time}</div>
                    </div>
                </div>
                <div class="todo-right-buttons">
                    <div class="check-circle ${todo.isCompleted ? 'checked' : ''}">
                        ${todo.isCompleted ? '✓' : ''}
                    </div>
                    <button class="delete-todo-btn">삭제</button>
                </div>
            `;

            li.querySelector('.check-circle').addEventListener('click', (e) => {
                e.stopPropagation();
                todo.isCompleted = !todo.isCompleted;
                saveData();
                renderTodos();
            });

            li.querySelector('.delete-todo-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                todos = todos.filter(t => t.id !== todo.id);
                saveData();
                renderTodos();
            });

            li.addEventListener('click', () => {
                localStorage.setItem('current-edit-id', todo.id);
                location.href = 'detail.html';
            });

            todoList.appendChild(li);
        });
    }

    function saveData() {
        localStorage.setItem('my-todo-items', JSON.stringify(todos));
    }

    function routeToDetailNew() {
        localStorage.removeItem('current-edit-id');
        localStorage.setItem('temp-quick-text', todoInput.value.trim());
        location.href = 'detail.html';
    }

    if (addBtn) addBtn.addEventListener('click', routeToDetailNew);
    if (todoInput) {
        todoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') routeToDetailNew();
        });
    }
    if (navDetailTrigger) navDetailTrigger.addEventListener('click', routeToDetailNew);

    tabBtns.forEach((btn, index) => {
        const filterMap = ['all', 'today', 'important', 'completed'];
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = filterMap[index];
            renderTodos();
        });
    });

    renderTodos();
});