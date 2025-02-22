// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskListDiv = document.getElementById('taskList');
const showCompletedCheckbox = document.getElementById('showCompleted');
const groupListDatalist = document.getElementById('groupList');
const categorySettingsDiv = document.getElementById('categorySettings');
const statsMenu = document.getElementById('statsMenu');
const statsContent = document.getElementById('statsContent');
const hamburger = document.getElementById('hamburger');
const saveStateBtn = document.getElementById('saveState');
const loadStateBtn = document.getElementById('loadState');
const fileInput = document.getElementById('fileInput');
const mainContent = document.getElementById('mainContent');

let tasks = [];
const groupColors = {};

// --- Utility Functions ---
function randomColor() {
  const color = Math.floor(Math.random() * 16777215).toString(16);
  return '#' + ("000000" + color).slice(-6);
}

function shadeColor(color, percent) {
  let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = Math.abs(percent),
      R = f >> 16,
      G = f >> 8 & 0x00FF,
      B = f & 0x0000FF;
  return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 +
                (Math.round((t - G) * p) + G) * 0x100 +
                (Math.round((t - B) * p) + B))
                .toString(16).slice(1);
}

// --- Chart Initialization ---
let chart;
function initChart() {
  const ctx = document.getElementById('pieChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        label: 'Completed',
        data: [],
        backgroundColor: [],
        offset: []
      },{
        label: 'Remaining',
        data: [],
        backgroundColor: [],
        offset: []
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => {
              const label = context.dataset.label || '';
              return label + ': ' + context.parsed;
            }
          }
        }
      }
    }
  });
}

// --- Update Chart ---
function updateChart() {
  const completedData = [];
  const remainingData = [];
  const labels = [];
  const completedColors = [];
  const remainingColors = [];
  const completedOffsets = [];
  const remainingOffsets = [];
  const showCompleted = showCompletedCheckbox.checked;
  
  tasks.forEach(task => {
    if (task.progress === 100 && !showCompleted) return;
    labels.push(task.parentGroup + " - " + task.subTask);
    const comp = task.timeRequired * (task.progress / 100);
    const remain = task.timeRequired - comp;
    completedData.push(comp);
    remainingData.push(remain);
    const base = groupColors[task.parentGroup] || '#999999';
    completedColors.push(shadeColor(base, -0.3));
    remainingColors.push(shadeColor(base, 0.3));
    const offsetVal = task.highlight ? 40 : 0;
    completedOffsets.push(offsetVal);
    remainingOffsets.push(offsetVal);
  });
  
  chart.data.labels = labels;
  chart.data.datasets[0].data = completedData;
  chart.data.datasets[0].backgroundColor = completedColors;
  chart.data.datasets[0].offset = completedOffsets;
  chart.data.datasets[1].data = remainingData;
  chart.data.datasets[1].backgroundColor = remainingColors;
  chart.data.datasets[1].offset = remainingOffsets;
  chart.update();
}

// --- Update Task List Visibility ---
function updateTaskVisibility() {
  const showCompleted = showCompletedCheckbox.checked;
  document.querySelectorAll('.task').forEach(taskDiv => {
    if (taskDiv.classList.contains('complete')) {
      taskDiv.style.display = showCompleted ? 'flex' : 'none';
    }
  });
}

// --- Update Category Settings ---
function updateCategorySettings() {
  categorySettingsDiv.innerHTML = '<h2>Customize Category Colors</h2>';
  Object.keys(groupColors).forEach(category => {
    const div = document.createElement('div');
    div.className = 'category-item';
    const label = document.createElement('label');
    label.textContent = category;
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = groupColors[category];
    colorInput.addEventListener('change', function() {
      groupColors[category] = colorInput.value;
      document.querySelectorAll('.task').forEach(taskDiv => {
        if (taskDiv.querySelector('.task-info').textContent.indexOf(category) !== -1) {
          taskDiv.style.borderLeftColor = groupColors[category];
        }
      });
      updateChart();
      autoSave();
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-category';
    delBtn.innerHTML = '<i class="fa fa-trash"></i>';
    delBtn.addEventListener('click', function() {
      if (confirm(`Are you sure you want to delete the category "${category}"? This will delete all tasks in this category.`)) {
        tasks = tasks.filter(task => task.parentGroup !== category);
        delete groupColors[category];
        const options = groupListDatalist.querySelectorAll('option');
        options.forEach(option => {
          if (option.value === category) option.remove();
        });
        taskListDiv.innerHTML = "";
        tasks.forEach(task => renderTask(task));
        updateCategorySettings();
        updateChart();
        autoSave();
      }
    });
    div.appendChild(label);
    div.appendChild(colorInput);
    div.appendChild(delBtn);
    categorySettingsDiv.appendChild(div);
  });
}

// --- Render a Single Task ---
function renderTask(task) {
  const taskDiv = document.createElement('div');
  taskDiv.className = 'task';
  taskDiv.style.borderLeftColor = groupColors[task.parentGroup] || '#999';
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'task-info';
  infoDiv.innerHTML = `<strong>${task.parentGroup} - ${task.subTask}</strong>
                       <span>Time: ${task.timeRequired} minutes</span>`;
  taskDiv.appendChild(infoDiv);
  
  const controlDiv = document.createElement('div');
  controlDiv.className = 'progress-control';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.value = task.progress;
  slider.addEventListener('input', function() {
    task.progress = parseInt(slider.value);
    percentLabel.textContent = slider.value + '%';
    if (task.progress === 100) {
      taskDiv.classList.add('complete');
    } else {
      taskDiv.classList.remove('complete');
    }
    updateChart();
    updateTaskVisibility();
    autoSave();
  });
  controlDiv.appendChild(slider);
  
  const percentLabel = document.createElement('span');
  percentLabel.textContent = task.progress + '%';
  controlDiv.appendChild(percentLabel);
  
  const completeBtn = document.createElement('button');
  completeBtn.textContent = "Complete";
  completeBtn.addEventListener('click', function() {
    slider.value = 100;
    slider.dispatchEvent(new Event('input'));
  });
  controlDiv.appendChild(completeBtn);
  
  const delTaskBtn = document.createElement('button');
  delTaskBtn.className = "delete-task";
  delTaskBtn.innerHTML = '<i class="fa fa-trash"></i>';
  delTaskBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this task?")) {
      tasks = tasks.filter(t => t !== task);
      taskDiv.remove();
      updateChart();
      autoSave();
    }
  });
  controlDiv.appendChild(delTaskBtn);
  
  taskDiv.appendChild(controlDiv);
  
  taskDiv.addEventListener('click', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    if (task.highlight) {
      task.highlight = false;
      taskDiv.classList.remove('selected');
    } else {
      tasks.forEach(t => t.highlight = false);
      document.querySelectorAll('.task').forEach(div => div.classList.remove('selected'));
      task.highlight = true;
      taskDiv.classList.add('selected');
    }
    updateChart();
    autoSave();
  });
  
  taskListDiv.appendChild(taskDiv);
}

// --- Auto-save State to localStorage ---
function autoSave() {
  const state = { tasks, groupColors };
  localStorage.setItem('todoState', JSON.stringify(state));
  updateStats();
}

// --- Load State from localStorage ---
function loadLocalState() {
  const stateStr = localStorage.getItem('todoState');
  if (!stateStr) return;
  const state = JSON.parse(stateStr);
  tasks = state.tasks || [];
  Object.keys(state.groupColors || {}).forEach(cat => {
    groupColors[cat] = state.groupColors[cat];
  });
  taskListDiv.innerHTML = "";
  tasks.forEach(task => renderTask(task));
  updateCategorySettings();
  updateChart();
  updateStats();
}

// --- Save State to File ---
function saveStateToFile() {
  const state = { tasks, groupColors };
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "todoState.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// --- Load State from File ---
function loadStateFromFile(fileContent) {
  try {
    const state = JSON.parse(fileContent);
    tasks = state.tasks || [];
    Object.keys(state.groupColors || {}).forEach(cat => {
      groupColors[cat] = state.groupColors[cat];
    });
    taskListDiv.innerHTML = "";
    tasks.forEach(task => renderTask(task));
    updateCategorySettings();
    updateChart();
    updateStats();
    autoSave();
  } catch (e) {
    alert("Error loading state: " + e.message);
  }
}

// --- Update Stats in Stats Menu ---
function updateStats() {
  let totalTime = 0;
  let completedCount = 0;
  const categoryStats = {};
  tasks.forEach(task => {
    totalTime += task.timeRequired;
    if (task.progress === 100) completedCount++;
    if (!categoryStats[task.parentGroup]) {
      categoryStats[task.parentGroup] = { count: 0, time: 0 };
    }
    categoryStats[task.parentGroup].count++;
    categoryStats[task.parentGroup].time += task.timeRequired;
  });
  let statsHtml = `<div class="stat-item"><strong>Total Tasks:</strong> ${tasks.length}</div>`;
  statsHtml += `<div class="stat-item"><strong>Completed Tasks:</strong> ${completedCount}</div>`;
  statsHtml += `<div class="stat-item"><strong>Total Time:</strong> ${totalTime} minutes</div>`;
  statsHtml += `<hr>`;
  statsHtml += `<div class="stat-item"><strong>By Category:</strong></div>`;
  Object.keys(categoryStats).forEach(cat => {
    statsHtml += `<div class="stat-item">${cat}: ${categoryStats[cat].count} tasks, ${categoryStats[cat].time} minutes</div>`;
  });
  statsContent.innerHTML = statsHtml;
}

// --- Event Listeners ---
taskForm.addEventListener('submit', function(e) {
  e.preventDefault();
  let parentGroup = document.getElementById('parentGroup').value.trim();
  const subTask = document.getElementById('subTask').value.trim();
  const timeRequired = parseFloat(document.getElementById('timeRequired').value);
  if (!parentGroup) {
    parentGroup = "Uncategorized";
  }
  if (!groupColors[parentGroup]) {
    groupColors[parentGroup] = randomColor();
    const option = document.createElement('option');
    option.value = parentGroup;
    groupListDatalist.appendChild(option);
    updateCategorySettings();
  }
  const newTask = { parentGroup, subTask, timeRequired, progress: 0, highlight: false };
  tasks.push(newTask);
  renderTask(newTask);
  updateChart();
  autoSave();
  taskForm.reset();
});

showCompletedCheckbox.addEventListener('change', function() {
  updateTaskVisibility();
  updateChart();
  autoSave();
});

hamburger.addEventListener('click', () => {
  statsMenu.classList.toggle('open');
  if (statsMenu.classList.contains('open')) {
    mainContent.style.marginRight = "300px";
  } else {
    mainContent.style.marginRight = "0";
  }
  updateStats();
});

saveStateBtn.addEventListener('click', () => {
  saveStateToFile();
});

loadStateBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', function() {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    loadStateFromFile(e.target.result);
  };
  reader.readAsText(file);
});

// Auto-save on page unload.
window.addEventListener('beforeunload', autoSave);

// Initialize on load.
initChart();
loadLocalState();
