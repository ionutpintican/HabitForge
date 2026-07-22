/**
 * HabitForge - Core Application Logic
 * Pure Vanilla JavaScript with LocalStorage Persistence
 */

class HabitForgeApp {
  constructor() {
    this.STORAGE_KEY = 'habitforge_habits';
    this.selectedDate = this.getTodayDateString();
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.habits = [];

    this.initElements();
    this.initEventListeners();
    this.loadHabits();
    this.renderDateStrip();
    this.render();
  }

  // Helper: Format Date to YYYY-MM-DD
  getTodayDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Initialize DOM Elements
  initElements() {
    this.habitListEl = document.getElementById('habitList');
    this.emptyStateEl = document.getElementById('emptyState');
    this.searchHabitEl = document.getElementById('searchHabit');
    this.dateStripEl = document.getElementById('dateStrip');
    this.currentMonthYearEl = document.getElementById('currentMonthYear');
    this.btnJumpToday = document.getElementById('btnJumpToday');

    // Stats
    this.statTotalStreakEl = document.getElementById('statTotalStreak');
    this.statTodayCompletedEl = document.getElementById('statTodayCompleted');
    this.statProgressPctEl = document.getElementById('statProgressPct');
    this.statProgressFillEl = document.getElementById('statProgressFill');

    // Modals
    this.habitModalEl = document.getElementById('habitModal');
    this.dataModalEl = document.getElementById('dataModal');
    this.habitForm = document.getElementById('habitForm');
    this.modalTitleEl = document.getElementById('modalTitle');
    this.habitIdInput = document.getElementById('habitId');
    this.habitNameInput = document.getElementById('habitName');
    this.habitCategoryInput = document.getElementById('habitCategory');
    this.habitIconInput = document.getElementById('habitIcon');
    this.habitColorInput = document.getElementById('habitColor');

    // Color picker
    this.colorPickerEl = document.getElementById('colorPicker');

    // Canvas
    this.canvas = document.getElementById('celebrationCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  // Event Listeners
  initEventListeners() {
    // Open Modals
    document.getElementById('btnOpenNewHabit').addEventListener('click', () => this.openHabitModal());
    document.getElementById('btnEmptyAdd').addEventListener('click', () => this.openHabitModal());
    document.getElementById('btnOpenExport').addEventListener('click', () => this.openDataModal());

    // Close Modals
    document.getElementById('btnCloseModal').addEventListener('click', () => this.closeHabitModal());
    document.getElementById('btnCancelModal').addEventListener('click', () => this.closeHabitModal());
    document.getElementById('btnCloseDataModal').addEventListener('click', () => this.closeDataModal());

    // Form Submit
    this.habitForm.addEventListener('submit', (e) => this.handleSaveHabit(e));

    // Jump Today
    this.btnJumpToday.addEventListener('click', () => {
      this.selectedDate = this.getTodayDateString();
      this.renderDateStrip();
      this.render();
    });

    // Filters & Search
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
      });
    });

    this.searchHabitEl.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Color Selector
    this.colorPickerEl.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.colorPickerEl.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        this.habitColorInput.value = dot.dataset.color;
      });
    });

    // Data Export/Import
    document.getElementById('btnExportJSON').addEventListener('click', () => this.exportJSON());
    document.getElementById('importFile').addEventListener('change', (e) => this.importJSON(e));
    document.getElementById('btnClearData').addEventListener('click', () => this.clearAllData());
  }

  // Load Habits from LocalStorage
  loadHabits() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.habits = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse habits', err);
        this.habits = [];
      }
    } else {
      // Seed initial default habits for beautiful first-time experience
      this.seedDefaultHabits();
    }
  }

  seedDefaultHabits() {
    const today = this.getTodayDateString();
    const yesterday = this.getTodayDateString(new Date(Date.now() - 86400000));
    const twoDaysAgo = this.getTodayDateString(new Date(Date.now() - 86400000 * 2));

    this.habits = [
      {
        id: 'habit_' + Date.now() + '_1',
        name: 'Morning Hydration 💧',
        category: 'Health',
        icon: '💧',
        color: '#3B82F6',
        createdAt: twoDaysAgo,
        history: {
          [twoDaysAgo]: true,
          [yesterday]: true,
          [today]: false
        }
      },
      {
        id: 'habit_' + Date.now() + '_2',
        name: '30-min Focused Reading 📚',
        category: 'Learning',
        icon: '📚',
        color: '#8B5CF6',
        createdAt: twoDaysAgo,
        history: {
          [twoDaysAgo]: true,
          [yesterday]: true,
          [today]: true
        }
      },
      {
        id: 'habit_' + Date.now() + '_3',
        name: '10,000 Daily Steps 🏃',
        category: 'Health',
        icon: '🏃',
        color: '#FF5E3A',
        createdAt: twoDaysAgo,
        history: {
          [twoDaysAgo]: true,
          [yesterday]: false,
          [today]: false
        }
      }
    ];
    this.saveHabits();
  }

  saveHabits() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.habits));
  }

  // Streaks Calculation
  calculateStreak(habit) {
    let streak = 0;
    let curr = new Date(this.selectedDate);

    while (true) {
      const dateStr = this.getTodayDateString(curr);
      if (habit.history && habit.history[dateStr]) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        // If today is not checked yet, check if yesterday was checked
        if (dateStr === this.getTodayDateString() && streak === 0) {
          curr.setDate(curr.getDate() - 1);
          const yesterdayStr = this.getTodayDateString(curr);
          if (habit.history && habit.history[yesterdayStr]) {
            // Count from yesterday
            continue;
          }
        }
        break;
      }
    }
    return streak;
  }

  // Render Date Strip Header
  renderDateStrip() {
    this.dateStripEl.innerHTML = '';
    const selected = new Date(this.selectedDate);
    
    // Update Month/Year title
    const options = { month: 'long', year: 'numeric' };
    this.currentMonthYearEl.textContent = selected.toLocaleDateString('en-US', options);

    // Generate 7 days around selected date (-3 to +3)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = this.getTodayDateString();

    for (let i = -3; i <= 3; i++) {
      const d = new Date(selected);
      d.setDate(d.getDate() + i);
      const dateStr = this.getTodayDateString(d);

      const item = document.createElement('div');
      item.className = `date-item ${dateStr === this.selectedDate ? 'selected' : ''} ${dateStr === todayStr ? 'today' : ''}`;
      item.innerHTML = `
        <span class="date-day">${days[d.getDay()]}</span>
        <span class="date-num">${d.getDate()}</span>
      `;

      item.addEventListener('click', () => {
        this.selectedDate = dateStr;
        this.renderDateStrip();
        this.render();
      });

      this.dateStripEl.appendChild(item);
    }
  }

  // Core Render Method
  render() {
    this.renderStats();
    
    // Filter habits
    const filtered = this.habits.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(this.searchQuery) || 
                            h.category.toLowerCase().includes(this.searchQuery);
      const isCompleted = h.history && h.history[this.selectedDate] === true;

      if (!matchesSearch) return false;

      if (this.currentFilter === 'pending') return !isCompleted;
      if (this.currentFilter === 'completed') return isCompleted;
      return true;
    });

    if (filtered.length === 0) {
      this.habitListEl.innerHTML = '';
      this.emptyStateEl.classList.remove('hidden');
    } else {
      this.emptyStateEl.classList.add('hidden');
      this.renderHabits(filtered);
    }
  }

  renderHabits(habitsToRender) {
    this.habitListEl.innerHTML = '';

    habitsToRender.forEach(habit => {
      const isDone = habit.history && habit.history[this.selectedDate] === true;
      const streak = this.calculateStreak(habit);

      const card = document.createElement('div');
      card.className = `habit-card ${isDone ? 'completed' : ''}`;
      card.style.setProperty('--habit-accent', habit.color || '#FF5E3A');

      // Weekly past 7 days preview dots
      const weekDotsHtml = this.generateWeeklyDotsHtml(habit);

      card.innerHTML = `
        <div class="habit-left">
          <button class="habit-check-btn" title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          
          <div class="habit-details">
            <div class="habit-header-row">
              <span class="habit-icon">${habit.icon || '🔥'}</span>
              <h3 class="habit-name">${this.escapeHtml(habit.name)}</h3>
            </div>
            <div class="habit-meta">
              <span class="habit-badge">${this.escapeHtml(habit.category || 'General')}</span>
              <span class="streak-tag">
                🔥 ${streak} ${streak === 1 ? 'day' : 'days'} streak
              </span>
            </div>
          </div>
        </div>

        <div class="habit-right">
          <div class="habit-weekly-dots" title="Past 7 days activity">
            ${weekDotsHtml}
          </div>
          <button class="habit-menu-btn btn-edit" title="Edit Habit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="habit-menu-btn btn-delete" title="Delete Habit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // Toggle Completion Click
      card.querySelector('.habit-check-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCheckIn(habit.id, card.querySelector('.habit-check-btn'));
      });

      // Edit Habit
      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openHabitModal(habit);
      });

      // Delete Habit
      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHabit(habit.id);
      });

      this.habitListEl.appendChild(card);
    });
  }

  generateWeeklyDotsHtml(habit) {
    let dots = '';
    const sel = new Date(this.selectedDate);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(sel);
      d.setDate(d.getDate() - i);
      const dateStr = this.getTodayDateString(d);
      const done = habit.history && habit.history[dateStr] === true;
      dots += `<div class="week-dot ${done ? 'done' : ''}" title="${dateStr}"></div>`;
    }
    return dots;
  }

  toggleCheckIn(habitId, btnElement) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.history) habit.history = {};

    const currentlyDone = habit.history[this.selectedDate] === true;
    habit.history[this.selectedDate] = !currentlyDone;

    this.saveHabits();
    this.render();

    // Fire celebratory particles if just completed!
    if (!currentlyDone) {
      const rect = btnElement.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      this.triggerCelebration(x, y, habit.color);
    }
  }

  renderStats() {
    const totalHabits = this.habits.length;
    let completedTodayCount = 0;
    let maxStreak = 0;

    this.habits.forEach(habit => {
      if (habit.history && habit.history[this.selectedDate] === true) {
        completedTodayCount++;
      }
      const s = this.calculateStreak(habit);
      if (s > maxStreak) maxStreak = s;
    });

    this.statTotalStreakEl.textContent = `${maxStreak} ${maxStreak === 1 ? 'Day' : 'Days'}`;
    this.statTodayCompletedEl.textContent = `${completedTodayCount} / ${totalHabits}`;
    
    const pct = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;
    this.statProgressPctEl.textContent = `${pct}%`;
    this.statProgressFillEl.style.width = `${pct}%`;
  }

  // Modals Management
  openHabitModal(habitToEdit = null) {
    this.habitForm.reset();
    if (habitToEdit) {
      this.modalTitleEl.textContent = 'Edit Habit';
      this.habitIdInput.value = habitToEdit.id;
      this.habitNameInput.value = habitToEdit.name;
      this.habitCategoryInput.value = habitToEdit.category || 'Health';
      this.habitIconInput.value = habitToEdit.icon || '🔥';
      this.habitColorInput.value = habitToEdit.color || '#FF5E3A';

      // Select color dot
      this.colorPickerEl.querySelectorAll('.color-dot').forEach(dot => {
        if (dot.dataset.color === habitToEdit.color) dot.classList.add('selected');
        else dot.classList.remove('selected');
      });
    } else {
      this.modalTitleEl.textContent = 'Forge New Habit';
      this.habitIdInput.value = '';
      this.habitColorInput.value = '#FF5E3A';
      this.colorPickerEl.querySelectorAll('.color-dot').forEach((dot, idx) => {
        if (idx === 0) dot.classList.add('selected');
        else dot.classList.remove('selected');
      });
    }

    this.habitModalEl.classList.remove('hidden');
    this.habitNameInput.focus();
  }

  closeHabitModal() {
    this.habitModalEl.classList.add('hidden');
  }

  openDataModal() {
    this.dataModalEl.classList.remove('hidden');
  }

  closeDataModal() {
    this.dataModalEl.classList.add('hidden');
  }

  handleSaveHabit(e) {
    e.preventDefault();
    const id = this.habitIdInput.value;
    const name = this.habitNameInput.value.trim();
    const category = this.habitCategoryInput.value;
    const icon = this.habitIconInput.value;
    const color = this.habitColorInput.value;

    if (!name) return;

    if (id) {
      // Edit existing
      const habit = this.habits.find(h => h.id === id);
      if (habit) {
        habit.name = name;
        habit.category = category;
        habit.icon = icon;
        habit.color = color;
      }
    } else {
      // Create new
      const newHabit = {
        id: 'habit_' + Date.now(),
        name: name,
        category: category,
        icon: icon,
        color: color,
        createdAt: this.getTodayDateString(),
        history: {}
      };
      this.habits.unshift(newHabit);
    }

    this.saveHabits();
    this.closeHabitModal();
    this.render();
  }

  deleteHabit(habitId) {
    if (confirm('Are you sure you want to delete this habit?')) {
      this.habits = this.habits.filter(h => h.id !== habitId);
      this.saveHabits();
      this.render();
    }
  }

  // Data Export & Import
  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.habits, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `habitforge_backup_${this.getTodayDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.habits = imported;
          this.saveHabits();
          this.render();
          this.closeDataModal();
          alert('Habits imported successfully!');
        } else {
          alert('Invalid backup format.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
  }

  clearAllData() {
    if (confirm('WARNING: This will erase all habits and progress history. Are you sure?')) {
      this.habits = [];
      this.saveHabits();
      this.render();
      this.closeDataModal();
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // Canvas Celebration Particles
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  triggerCelebration(originX, originY, color = '#FF5E3A') {
    const particles = [];
    const particleCount = 35;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 6 + 3,
        alpha: 1,
        color: Math.random() > 0.4 ? color : '#FFB800'
      });
    }

    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.alpha > 0.02) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // gravity
          p.alpha *= 0.94;

          this.ctx.save();
          this.ctx.globalAlpha = p.alpha;
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };

    requestAnimationFrame(animate);
  }
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HabitForgeApp();
});
