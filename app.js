/**
 * Environment Assumptions: Modern Browser (ES6+), localStorage available.
 */
const STORAGE_KEY = 'habits_app_v1';

// --- State Management ---
let state = {
  habits: loadState()
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return [];
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.habits));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
}

// --- Pure Business Logic (Testable) ---
function createHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Habit name cannot be empty');
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: trimmed,
    completedToday: false,
    streak: 0
  };
}

function toggleHabitState(habit) {
  const nextCompleted = !habit.completedToday;
  return {
    ...habit,
    completedToday: nextCompleted,
    streak: nextCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1)
  };
}

// --- DOM Rendering (XSS-Safe) ---
const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');
const list = document.getElementById('habit-list');
const stats = document.getElementById('stats');

function render() {
  list.replaceChildren();

  const completedCount = state.habits.filter(h => h.completedToday).length;
  stats.textContent = `${completedCount}/${state.habits.length} completed today`;

  state.habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = `habit-item ${habit.completedToday ? 'completed' : ''}`;
    li.dataset.id = habit.id;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'habit-info';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = habit.completedToday;
    checkbox.className = 'toggle-checkbox';
    checkbox.setAttribute('aria-label', `Mark ${habit.name} as complete`);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'habit-name';
    nameSpan.textContent = habit.name; // Prevents XSS injection

    const streakSpan = document.createElement('span');
    streakSpan.className = 'streak-badge';
    streakSpan.textContent = `🔥 ${habit.streak}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${habit.name}`);

    infoDiv.append(checkbox, nameSpan, streakSpan);
    li.append(infoDiv, deleteBtn);
    list.appendChild(li);
  });
}

// --- Event Listeners (Event Delegation) ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const newHabit = createHabit(input.value);
    state.habits.push(newHabit);
    saveState();
    render();
    input.value = '';
    input.focus();
  } catch (err) {
    alert(err.message);
  }
});

list.addEventListener('click', (e) => {
  const item = e.target.closest('.habit-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains('toggle-checkbox')) {
    state.habits = state.habits.map(h => h.id === id ? toggleHabitState(h) : h);
    saveState();
    render();
  } else if (e.target.classList.contains('delete-btn')) {
    state.habits = state.habits.filter(h => h.id !== id);
    saveState();
    render();
  }
});

// --- Self-Test Runner (Run `runTests()` in DevTools Console) ---
window.runTests = function() {
  console.group('Running Unit Tests...');
  
  // Test 1: Creation & Trimming
  const h1 = createHabit('  Code 1 hour  ');
  console.assert(h1.name === 'Code 1 hour', 'Should trim whitespace');
  console.assert(h1.streak === 0 && !h1.completedToday, 'Initial state should be uncompleted with 0 streak');

  // Test 2: Toggling & Streak Calculation
  const toggledOn = toggleHabitState(h1);
  console.assert(toggledOn.completedToday === true && toggledOn.streak === 1, 'Should increment streak on completion');

  const toggledOff = toggleHabitState(toggledOn);
  console.assert(toggledOff.completedToday === false && toggledOff.streak === 0, 'Should decrement streak on uncheck');

  // Test 3: Edge Case - Empty input
  let threw = false;
  try { createHabit('   '); } catch { threw = true; }
  console.assert(threw, 'Should throw on whitespace-only input');

  console.log('✅ All assertions executed.');
  console.groupEnd();
};

// Initialize App
render();