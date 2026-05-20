const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list')

addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', function(e){
  if (e.key === 'Enter') {
        addTodo();
    }
});


function addTodo() {
    const taskText = todoInput.value.trim(); 

    if (taskText === '') {
        alert('할 일을 입력해주세요!');
        return;
    }


    const li = document.createElement('li');
    li.innerText = taskText;


    li.addEventListener('click', function() {
        li.classList.toggle('completed');
    });


    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '삭제';
    deleteBtn.className = 'delete-btn';
    

    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation(); 
        li.remove(); 
    });


    li.appendChild(deleteBtn);
    todoList.appendChild(li);


    todoInput.value = '';
}