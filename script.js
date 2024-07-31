let currentWeek = new Date();
let tasks = {};
let weeklyGoals = {};
let weeklyHabits = {};
let selectedColor = '#e6f3ff';
let selectedCell = null;

const colorPalette = ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD29F', '#E0BBE4'];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadData();
    createSchedule();
    updateWeekDisplay();
    createColorPalette();
    initializeHabitRows();
    loadHabits();
    addEventListeners();
}

function loadData() {
    tasks = JSON.parse(localStorage.getItem('scheduleTasks')) || {};
    weeklyGoals = JSON.parse(localStorage.getItem('weeklyGoals')) || {};
    weeklyHabits = JSON.parse(localStorage.getItem('weeklyHabits')) || {};
}

function addEventListeners() {
    document.getElementById('addTask').addEventListener('click', addNewTask);
    document.getElementById('prevWeek').addEventListener('click', () => changeWeek(-1));
    document.getElementById('nextWeek').addEventListener('click', () => changeWeek(1));
    document.getElementById('setWeeklyGoal').addEventListener('click', setWeeklyGoal);
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('exportImage').addEventListener('click', exportToImage);
    document.getElementById('saveHabits').addEventListener('click', saveHabits);

    const schedule = document.getElementById('schedule');
    schedule.addEventListener('click', handleScheduleClick);

    // const closeModal = document.getElementsByClassName('close')[0];
    // closeModal.onclick = closeModal;

    const closeButton = document.querySelector('.close');
    closeButton.addEventListener('click', closeModal);
    
    window.onclick = function(event) {
        if (event.target == document.getElementById('taskModal')) {
            closeModal();
        }
    }
}

function handleScheduleClick(e) {
    if (e.target.tagName === 'TD' && e.target.getAttribute('data-day') !== null) {
        selectedCell = e.target;
        openModal();
    } else if (e.target.classList.contains('task')) {
        if (confirm('이 일정을 삭제하시겠습니까?')) {
            deleteTask(e.target);
        }
    }
}

function openModal() {
    document.getElementById('taskModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function addNewTask() {
    if (!selectedCell) return;

    const day = selectedCell.getAttribute('data-day');
    const hour = selectedCell.getAttribute('data-hour');
    const minute = selectedCell.getAttribute('data-minute');
    const duration = document.getElementById('durationInput').value;
    const text = document.getElementById('taskInput').value;

    if (!duration || !text) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    const weekKey = getWeekKey(currentWeek);
    if (!tasks[weekKey]) tasks[weekKey] = [];

    tasks[weekKey].push({ day, hour, minute, duration, text, color: selectedColor });
    saveTasks();
    renderTasks();
    closeModal();

    document.getElementById('durationInput').value = '';
    document.getElementById('taskInput').value = '';
}

function createSchedule() {
    const tbody = document.querySelector('#schedule tbody');
    tbody.innerHTML = '';

    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const row = createScheduleRow(hour, minute);
            tbody.appendChild(row);
        }
    }

    renderTasks();
}

function createScheduleRow(hour, minute) {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    timeCell.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    row.appendChild(timeCell);

    if (minute === 30) {
        row.classList.add('half-hour');
    }

    for (let day = 0; day < 7; day++) {
        const cell = document.createElement('td');
        cell.setAttribute('data-hour', hour);
        cell.setAttribute('data-minute', minute);
        cell.setAttribute('data-day', day);
        cell.style.cursor = 'pointer';
        row.appendChild(cell);
    }

    return row;
}

function renderTasks() {
    const weekKey = getWeekKey(currentWeek);
    const weekTasks = tasks[weekKey] || [];

    clearExistingTasks();

    weekTasks.forEach(task => {
        const startCell = document.querySelector(`td[data-day="${task.day}"][data-hour="${task.hour}"][data-minute="${task.minute}"]`);
        if (startCell) {
            renderTask(startCell, task);
        }
    });
}

function clearExistingTasks() {
    document.querySelectorAll('.task').forEach(el => el.remove());
    document.querySelectorAll('td[data-day]').forEach(el => {
        el.style.display = '';
        el.removeAttribute('rowspan');
        el.style.backgroundColor = '';
        el.style.border = '';
    });
}

function renderTask(startCell, task) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task';
    taskEl.textContent = task.text;
    taskEl.style.backgroundColor = task.color;

    const durationInHalfHours = Math.round(task.duration * 2);
    taskEl.style.height = `${durationInHalfHours * 15 - 2}px`;

    startCell.appendChild(taskEl);

    let rowspan = 1;
    let currentCell = startCell;

    for (let i = 1; i < durationInHalfHours; i++) {
        const nextRow = currentCell.parentElement.nextElementSibling;
        if (nextRow) {
            const nextCell = nextRow.querySelector(`td[data-day="${task.day}"]`);
            if (nextCell) {
                nextCell.style.display = 'none';
                rowspan++;
                currentCell = nextCell;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    startCell.setAttribute('rowspan', rowspan);
    startCell.style.backgroundColor = task.color;
    startCell.style.border = '1px solid black';
}

function deleteTask(taskElement) {
    const weekKey = getWeekKey(currentWeek);
    const day = taskElement.parentElement.getAttribute('data-day');
    const hour = taskElement.parentElement.getAttribute('data-hour');
    const minute = taskElement.parentElement.getAttribute('data-minute');
    const text = taskElement.textContent;

    tasks[weekKey] = tasks[weekKey].filter(task => 
        !(task.day == day && task.hour == hour && task.minute == minute && task.text === text)
    );

    saveTasks();
    renderTasks();
}

function changeWeek(direction) {
    currentWeek.setDate(currentWeek.getDate() + direction * 7);
    updateWeekDisplay();
    renderTasks();
    displayWeeklyGoal();
    loadHabits();
}

function updateWeekDisplay() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    document.getElementById('currentWeek').textContent = 
        `${startOfWeek.toLocaleDateString('ko-KR', options)} - ${endOfWeek.toLocaleDateString('ko-KR', options)}`;
}

function getWeekKey(date) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toISOString().split('T')[0];
}

function saveTasks() {
    localStorage.setItem('scheduleTasks', JSON.stringify(tasks));
}

function createColorPalette() {
    const palette = document.getElementById('colorPalette');
    colorPalette.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.style.backgroundColor = color;
        colorOption.addEventListener('click', () => {
            selectedColor = color;
            document.querySelectorAll('.color-option').forEach(opt => opt.style.border = 'none');
            colorOption.style.border = '2px solid black';
        });
        palette.appendChild(colorOption);
    });
}

function setWeeklyGoal() {
    const weekKey = getWeekKey(currentWeek);
    const goalInput = document.getElementById('weeklyGoalInput');
    weeklyGoals[weekKey] = goalInput.value;
    localStorage.setItem('weeklyGoals', JSON.stringify(weeklyGoals));
    displayWeeklyGoal();
    goalInput.value = '';
}

function displayWeeklyGoal() {
    const weekKey = getWeekKey(currentWeek);
    const goalDisplay = document.getElementById('weeklyGoalDisplay');
    goalDisplay.textContent = weeklyGoals[weekKey] || '이번 주 목표가 설정되지 않았습니다.';
}

// function displayWeeklyGoal() {
//     const currentWeek = new Date();
//     const weekKey = getWeekKey(currentWeek);
//     const goalInputContainer = document.querySelector('.weeklyGoal_input');
//     const goalInput = document.getElementById('weeklyGoalInput').value;
//     const goalDisplay = document.createElement('div');
//     goalDisplay.id = 'weeklyGoalDisplay';
//     goalDisplay.textContent = weeklyGoals[weekKey] || '이번 주 목표가 설정되지 않았습니다.';
    
//     // 부모 요소에서 기존 input 컨테이너를 goalDisplay로 교체
//     goalInputContainer.parentNode.replaceChild(goalDisplay, goalInputContainer);
// }

function exportToExcel() {
    const weekKey = getWeekKey(currentWeek);
    const weekTasks = tasks[weekKey] || [];
    const weekHabits = weeklyHabits[weekKey] || [];

    const excelData = weekTasks.map(task => ({
        Day: ['일', '월', '화', '수', '목', '금', '토'][task.day],
        Time: `${task.hour}:${task.minute}`,
        Duration: `${task.duration} 시간`,
        Task: task.text
    }));

    const habitData = weekHabits.map(habit => ({
        Habit: habit.name,
        Sunday: habit.days[0] ? '예' : '아니오',
        Monday: habit.days[1] ? '예' : '아니오',
        Tuesday: habit.days[2] ? '예' : '아니오',
        Wednesday: habit.days[3] ? '예' : '아니오',
        Thursday: habit.days[4] ? '예' : '아니오',
        Friday: habit.days[5] ? '예' : '아니오',
        Saturday: habit.days[6] ? '예' : '아니오'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const habitsWs = XLSX.utils.json_to_sheet(habitData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "일정");
    XLSX.utils.book_append_sheet(wb, habitsWs, "습관");

    XLSX.writeFile(wb, `schedule_${weekKey}.xlsx`);
}

function exportToImage() {
    html2canvas(document.querySelector(".container")).then(canvas => {
        const link = document.createElement('a');
        link.download = `schedule_${getWeekKey(currentWeek)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

function createHabitRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="habit-input" placeholder="습관 입력"></td>
        ${Array(7).fill('<td><input type="checkbox" class="checkbox"></td>').join('')}
    `;
    return row;
}

function initializeHabitRows() {
    const habitRows = document.getElementById('habit-rows');
    habitRows.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        habitRows.appendChild(createHabitRow());
    }
}

function saveHabits() {
    const weekKey = getWeekKey(currentWeek);
    const habits = [];
    document.querySelectorAll('#habit-rows tr').forEach(row => {
        const habitInput = row.querySelector('.habit-input');
        const checkboxes = row.querySelectorAll('.checkbox');
        habits.push({
            name: habitInput.value,
            days: Array.from(checkboxes).map(cb => cb.checked)
        });
    });
    weeklyHabits[weekKey] = habits;
    localStorage.setItem('weeklyHabits', JSON.stringify(weeklyHabits));
    alert('성공적으로 저장되었습니다.');
}

function loadHabits() {
    const weekKey = getWeekKey(currentWeek);
    const habitRows = document.getElementById('habit-rows');
    habitRows.innerHTML = '';

    const habits = weeklyHabits[weekKey] || [];
    habits.forEach(habit => {
        const row = createHabitRow();
        row.querySelector('.habit-input').value = habit.name;
        row.querySelectorAll('.checkbox').forEach((cb, i) => {
            cb.checked = habit.days[i];
        });
        habitRows.appendChild(row);
    });

    if (habits.length < 5) {
        for (let i = habits.length; i < 5; i++) {
            habitRows.appendChild(createHabitRow());
        }
    }
}