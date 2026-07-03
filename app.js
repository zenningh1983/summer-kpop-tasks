const kids = ["蕃茄", "LuLu"];
const scoreOptions = [
  { key: "circle", label: "○", text: "做到，達到標準" },
  { key: "triangle", label: "△", text: "做到，未符合標準" },
  { key: "cross", label: "×", text: "沒做到" },
];
const routinePeriods = [
  { key: "morning", label: "早" },
  { key: "noon", label: "中" },
  { key: "night", label: "晚" },
];

const storageKey = "summer-kpop-tasks-v1";
const dataFile = "./data.json";
const today = new Date().toISOString().slice(0, 10);

const elements = {
  dateForm: document.querySelector("#dateForm"),
  dateInput: document.querySelector("#dateInput"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskAssignees: document.querySelector("#taskAssignees"),
  dateList: document.querySelector("#dateList"),
  calendarList: document.querySelector("#calendarList"),
  prevWeekButton: document.querySelector("#prevWeekButton"),
  nextWeekButton: document.querySelector("#nextWeekButton"),
  weekRangeLabel: document.querySelector("#weekRangeLabel"),
  dateCount: document.querySelector("#dateCount"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  exportDataButton: document.querySelector("#exportDataButton"),
  deleteDateButton: document.querySelector("#deleteDateButton"),
  scoreGrid: document.querySelector("#scoreGrid"),
  routineGrid: document.querySelector("#routineGrid"),
  taskRows: document.querySelector("#taskRows"),
  emptyState: document.querySelector("#emptyState"),
};

const hadLocalState = Boolean(localStorage.getItem(storageKey));
let state = loadLocalState() || defaultState();
normalizeState();
let calendarWeekStart = dateKey(startOfWeek(parseDateKey(state.selectedDate || today)));

function defaultState() {
  return {
    selectedDate: today,
    days: {
      [today]: createDay([
        createTask("閱讀 20 分鐘"),
        createTask("運動或跳舞 15 分鐘"),
        createTask("整理自己的房間"),
      ]),
    },
  };
}

function loadLocalState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return null;
}

function createDay(tasks = []) {
  return {
    routines: createEmptyRoutines(),
    tasks,
  };
}

function createEmptyRoutines() {
  return Object.fromEntries(
    kids.map((kid) => [
      kid,
      Object.fromEntries(routinePeriods.map((period) => [period.key, ""])),
    ]),
  );
}

function createTask(name, assignees = kids) {
  return {
    id: crypto.randomUUID(),
    name,
    assignees,
    scores: Object.fromEntries(kids.map((kid) => [kid, null])),
  };
}

function normalizeState() {
  Object.values(state.days).forEach((day) => {
    day.routines = normalizeRoutines(day.routines);
    day.tasks = Array.isArray(day.tasks) ? day.tasks : [];
    day.tasks.forEach((task) => {
      if (!Array.isArray(task.assignees) || !task.assignees.length) {
        task.assignees = [...kids];
      }
      task.scores = {
        ...Object.fromEntries(kids.map((kid) => [kid, null])),
        ...task.scores,
      };
    });
  });
}

function normalizeRoutines(routines = {}) {
  const emptyRoutines = createEmptyRoutines();
  kids.forEach((kid) => {
    routinePeriods.forEach((period) => {
      emptyRoutines[kid][period.key] = routines?.[kid]?.[period.key] ?? "";
    });
  });
  return emptyRoutines;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

async function loadStateFromJson() {
  try {
    const response = await fetch(dataFile, { cache: "no-store" });
    if (!response.ok) return;

    const jsonState = await response.json();
    if (!jsonState || !jsonState.days) return;
    state = jsonState;
    normalizeState();
    calendarWeekStart = dateKey(startOfWeek(parseDateKey(state.selectedDate || today)));
    render();
  } catch {
    // GitHub Pages works over HTTP(S); local file previews may block fetch.
  }
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateString}T00:00:00`));
}

function parseDateKey(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function sortedDates() {
  return Object.keys(state.days).sort((a, b) => a.localeCompare(b));
}

function ensureSelectedDate() {
  const dates = sortedDates();
  if (!dates.length) {
    state.selectedDate = null;
    return;
  }

  if (!state.selectedDate || !state.days[state.selectedDate]) {
    state.selectedDate = dates[dates.length - 1];
  }
}

function render() {
  ensureSelectedDate();
  renderDates();
  renderCalendar();
  renderScores();
  renderRoutines();
  renderTasks();
  saveState();
}

function renderDates() {
  const dates = sortedDates();
  elements.dateCount.textContent = `${dates.length} 天`;
  elements.dateList.innerHTML = "";

  dates.forEach((date) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-button${date === state.selectedDate ? " is-active" : ""}`;
    button.textContent = formatDate(date);
    button.addEventListener("click", () => {
      state.selectedDate = date;
      calendarWeekStart = dateKey(startOfWeek(parseDateKey(date)));
      render();
    });
    elements.dateList.append(button);
  });

  elements.selectedDateTitle.textContent = state.selectedDate ? formatDate(state.selectedDate) : "尚未選擇日期";
  elements.deleteDateButton.disabled = !state.selectedDate;
}

function renderCalendar() {
  elements.calendarList.innerHTML = "";
  const weekStart = parseDateKey(calendarWeekStart);
  const weekEnd = addDays(weekStart, 6);
  elements.weekRangeLabel.textContent = `${formatShortDate(dateKey(weekStart))} - ${formatShortDate(dateKey(weekEnd))}`;

  const weekdayHeader = document.createElement("div");
  weekdayHeader.className = "week-calendar__header";
  weekdayHeader.innerHTML = ["日", "一", "二", "三", "四", "五", "六"].map((day) => `<span>${day}</span>`).join("");
  elements.calendarList.append(weekdayHeader);

  const grid = document.createElement("div");
  grid.className = "week-calendar__grid";

  for (let cursor = weekStart; cursor <= weekEnd; cursor = addDays(cursor, 1)) {
    const date = dateKey(cursor);
    const day = state.days[date];
    const items = routineSummaryItems(day);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `week-cell${date === state.selectedDate ? " is-active" : ""}`;
    cell.innerHTML = `
      <span class="week-cell__date">${cursor.getDate()}</span>
      <span class="week-cell__items">
        ${items.map((item) => `<span class="calendar-chip calendar-chip--${item.kidIndex}">${escapeHtml(item.text)}</span>`).join("")}
      </span>
    `;
    cell.addEventListener("click", () => {
      if (!state.days[date]) {
        state.days[date] = createDay();
      }
      state.selectedDate = date;
      calendarWeekStart = dateKey(startOfWeek(parseDateKey(date)));
      render();
    });
    grid.append(cell);
  }

  elements.calendarList.append(grid);
}

function routineSummaryItems(day) {
  if (!day) return [];

  return kids.flatMap((kid, kidIndex) =>
    routinePeriods.flatMap((period) => {
      const value = day.routines[kid][period.key].trim();
      if (!value) return [];
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ kidIndex, text }));
    }),
  );
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
  }).format(parseDateKey(dateString));
}

function renderScores() {
  const day = state.selectedDate ? state.days[state.selectedDate] : null;
  elements.scoreGrid.innerHTML = "";

  kids.forEach((kid) => {
    const counts = { circle: 0, triangle: 0, cross: 0 };
    if (day) {
      day.tasks.forEach((task) => {
        if (!taskAppliesTo(task, kid)) return;
        const score = task.scores[kid];
        if (score) counts[score] += 1;
      });
    }

    const card = document.createElement("article");
    card.className = "kid-score";
    card.innerHTML = `
      <h3>${kid}</h3>
      <div class="kid-score__stats">
        <span><b class="mark mark--circle">○</b>${counts.circle}</span>
        <span><b class="mark mark--triangle">△</b>${counts.triangle}</span>
        <span><b class="mark mark--cross">×</b>${counts.cross}</span>
      </div>
    `;
    elements.scoreGrid.append(card);
  });
}

function renderRoutines() {
  const day = state.selectedDate ? state.days[state.selectedDate] : null;
  elements.routineGrid.innerHTML = "";

  routinePeriods.forEach((period) => {
    const row = document.createElement("section");
    row.className = `routine-row routine-row--${period.key}`;
    row.innerHTML = `
      <div class="routine-period">${period.label}</div>
      ${kids
        .map(
          (kid) => `
            <label class="routine-field">
              <span>${kid}</span>
              <textarea data-kid="${kid}" data-period="${period.key}" rows="2" placeholder="${period.label}上作息">${escapeHtml(day?.routines[kid][period.key] ?? "")}</textarea>
            </label>
          `,
        )
        .join("")}
    `;

    row.querySelectorAll("textarea").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        if (!state.selectedDate) return;
        const selectedDay = state.days[state.selectedDate];
        selectedDay.routines[textarea.dataset.kid][textarea.dataset.period] = textarea.value;
        saveState();
        renderCalendar();
      });
    });

    elements.routineGrid.append(row);
  });
}

function renderTasks() {
  const day = state.selectedDate ? state.days[state.selectedDate] : null;
  elements.taskRows.innerHTML = "";
  const tasks = day?.tasks ?? [];

  tasks.forEach((task, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="task-name">
        <input class="task-name-input" type="text" value="${escapeHtml(task.name)}" aria-label="修改任務名稱" />
        ${assigneeToggleHtml(task)}
      </td>
      ${kids.map((kid) => `<td>${ratingButtons(task, kid)}</td>`).join("")}
      <td>
        <div class="task-actions">
          <button class="move-task" type="button" data-direction="up" ${index === 0 ? "disabled" : ""} aria-label="上移 ${escapeHtml(task.name)}">↑</button>
          <button class="move-task" type="button" data-direction="down" ${index === tasks.length - 1 ? "disabled" : ""} aria-label="下移 ${escapeHtml(task.name)}">↓</button>
          <button class="delete-task" type="button" aria-label="刪除 ${escapeHtml(task.name)}">×</button>
        </div>
      </td>
    `;

    const taskNameInput = row.querySelector(".task-name-input");
    taskNameInput.addEventListener("change", () => {
      const nextName = taskNameInput.value.trim();
      if (!nextName) {
        taskNameInput.value = task.name;
        return;
      }
      task.name = nextName;
      render();
    });
    taskNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        taskNameInput.blur();
      }
    });

    row.querySelectorAll(".task-assignee-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const nextAssignees = checkedAssignees(row);
        if (!nextAssignees.length) {
          checkbox.checked = true;
          return;
        }

        task.assignees = nextAssignees;
        kids.forEach((kid) => {
          if (!taskAppliesTo(task, kid)) {
            task.scores[kid] = null;
          }
        });
        render();
      });
    });

    row.querySelectorAll(".rating-button").forEach((button) => {
      button.addEventListener("click", () => {
        task.scores[button.dataset.kid] = button.dataset.score;
        render();
      });
    });

    row.querySelectorAll(".move-task").forEach((button) => {
      button.addEventListener("click", () => {
        const currentIndex = day.tasks.findIndex((item) => item.id === task.id);
        const nextIndex = button.dataset.direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex < 0 || nextIndex >= day.tasks.length) return;

        const [movedTask] = day.tasks.splice(currentIndex, 1);
        day.tasks.splice(nextIndex, 0, movedTask);
        render();
      });
    });

    row.querySelector(".delete-task").addEventListener("click", () => {
      day.tasks = day.tasks.filter((item) => item.id !== task.id);
      render();
    });

    elements.taskRows.append(row);
  });

  elements.emptyState.classList.toggle("is-visible", tasks.length === 0);
}

function assigneeToggleHtml(task) {
  return `
    <div class="assignee-toggle task-assignee-toggle" aria-label="修改任務對象">
      ${kids
        .map(
          (kid) => `
            <label>
              <input class="task-assignee-checkbox" type="checkbox" value="${kid}" ${taskAppliesTo(task, kid) ? "checked" : ""} />
              <span>${kid}</span>
            </label>
          `,
        )
        .join("")}
    </div>
  `;
}

function checkedAssignees(scope) {
  return [...scope.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function selectedNewTaskAssignees() {
  const selected = checkedAssignees(elements.taskAssignees);
  if (selected.length) return selected;

  elements.taskAssignees.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = true;
  });
  return [...kids];
}

function ratingButtons(task, kid) {
  if (!taskAppliesTo(task, kid)) {
    return `<div class="not-assigned" aria-label="${kid} 不適用此任務"></div>`;
  }

  return `
    <div class="rating-group" aria-label="${kid} 的 ${escapeHtml(task.name)} 評分">
      ${scoreOptions
        .map(
          (score) => `
            <button
              class="rating-button${task.scores[kid] === score.key ? " is-selected" : ""}"
              type="button"
              data-kid="${kid}"
              data-score="${score.key}"
              title="${score.text}"
              aria-label="${score.text}"
            >${score.label}</button>
          `,
        )
        .join("")}
    </div>
  `;
}

function taskAppliesTo(task, kid) {
  return task.assignees.includes(kid);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}

elements.dateInput.value = today;

elements.prevWeekButton.addEventListener("click", () => {
  calendarWeekStart = dateKey(addDays(parseDateKey(calendarWeekStart), -7));
  renderCalendar();
});

elements.nextWeekButton.addEventListener("click", () => {
  calendarWeekStart = dateKey(addDays(parseDateKey(calendarWeekStart), 7));
  renderCalendar();
});

elements.dateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = elements.dateInput.value;
  if (!date) return;

  if (!state.days[date]) {
    state.days[date] = createDay();
  }
  state.selectedDate = date;
  calendarWeekStart = dateKey(startOfWeek(parseDateKey(date)));
  render();
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.taskInput.value.trim();
  if (!name || !state.selectedDate) return;

  state.days[state.selectedDate].tasks.push(createTask(name, selectedNewTaskAssignees()));
  elements.taskInput.value = "";
  render();
});

elements.exportDataButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data.json";
  link.click();
  URL.revokeObjectURL(url);
});

elements.deleteDateButton.addEventListener("click", () => {
  if (!state.selectedDate) return;
  delete state.days[state.selectedDate];
  render();
});

render();
if (!hadLocalState) {
  loadStateFromJson();
}
