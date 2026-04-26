const STORAGE_KEY = "personalDashboardCourses";

const today = getLocalDateKey();
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});

const courseForm = document.getElementById("courseForm");
const courseInput = document.getElementById("courseInput");
const coursesGrid = document.getElementById("coursesGrid");
const courseTemplate = document.getElementById("courseTemplate");
const pieChart = document.getElementById("pieChart");
const progressPercent = document.getElementById("progressPercent");
const progressText = document.getElementById("progressText");
const todayLabel = document.getElementById("todayLabel");

let courses = loadCourses();
let currentProgressDegrees = 0;
let progressAnimationId = null;

todayLabel.textContent = dateFormatter.format(new Date());

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadCourses() {
  const savedCourses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

  if (Array.isArray(savedCourses)) {
    return savedCourses;
  }

  const oldTasks = JSON.parse(localStorage.getItem("tasks") || "[]");

  if (Array.isArray(oldTasks) && oldTasks.length > 0) {
    return [{
      id: makeId(),
      name: "General",
      tasks: oldTasks.map((task) => ({
        id: makeId(),
        text: String(task),
        completed: false,
        date: today
      }))
    }];
  }

  return [{
    id: makeId(),
    name: "General",
    tasks: []
  }];
}

function saveCourses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function getTodaysTasks() {
  return courses.flatMap((course) => course.tasks.filter((task) => task.date === today));
}

function updateProgress() {
  const tasks = getTodaysTasks();
  const completeCount = tasks.filter((task) => task.completed).length;
  const percent = tasks.length === 0 ? 0 : Math.round((completeCount / tasks.length) * 100);
  const degrees = Math.round((percent / 100) * 360);

  animatePieTo(degrees);
  progressPercent.textContent = `${percent}%`;
  progressText.textContent = `${completeCount} of ${tasks.length} done`;
}

function animatePieTo(targetDegrees) {
  const startDegrees = currentProgressDegrees;
  const distance = targetDegrees - startDegrees;
  const duration = 650;
  const startTime = performance.now();

  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
  }

  pieChart.classList.remove("is-bubbling");
  void pieChart.offsetWidth;
  pieChart.classList.add("is-bubbling");

  function drawFrame(now) {
    const elapsed = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const nextDegrees = startDegrees + distance * eased;

    currentProgressDegrees = nextDegrees;
    pieChart.style.background = `conic-gradient(var(--green) ${nextDegrees}deg, var(--line) ${nextDegrees}deg)`;

    if (elapsed < 1) {
      progressAnimationId = requestAnimationFrame(drawFrame);
      return;
    }

    currentProgressDegrees = targetDegrees;
    pieChart.style.background = `conic-gradient(var(--green) ${targetDegrees}deg, var(--line) ${targetDegrees}deg)`;
    progressAnimationId = null;

    window.setTimeout(() => {
      pieChart.classList.remove("is-bubbling");
    }, 180);
  }

  progressAnimationId = requestAnimationFrame(drawFrame);
}

function renderCourses() {
  coursesGrid.innerHTML = "";

  if (courses.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "Add a course to start building today's list.";
    coursesGrid.appendChild(emptyState);
    updateProgress();
    return;
  }

  courses.forEach((course) => {
    const courseNode = courseTemplate.content.cloneNode(true);
    const card = courseNode.querySelector(".course-card");
    const title = courseNode.querySelector("h2");
    const removeCourseButton = courseNode.querySelector(".remove-course");
    const taskForm = courseNode.querySelector(".task-form");
    const taskInput = courseNode.querySelector(".task-form input");
    const taskList = courseNode.querySelector(".task-list");

    title.textContent = course.name;

    removeCourseButton.addEventListener("click", () => {
      courses = courses.filter((item) => item.id !== course.id);
      saveCourses();
      renderCourses();
    });

    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = taskInput.value.trim();

      if (!text) return;

      course.tasks.push({
        id: makeId(),
        text,
        completed: false,
        date: today
      });

      taskInput.value = "";
      saveCourses();
      renderCourses();
    });

    const todaysTasks = course.tasks.filter((task) => task.date === today);

    if (todaysTasks.length === 0) {
      const emptyTask = document.createElement("li");
      emptyTask.className = "empty-state";
      emptyTask.textContent = "No tasks for today.";
      taskList.appendChild(emptyTask);
    }

    todaysTasks.forEach((task) => {
      const item = document.createElement("li");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      const removeTaskButton = document.createElement("button");

      item.className = task.completed ? "task-item is-complete" : "task-item";
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `Mark ${task.text} complete`);
      text.textContent = task.text;
      removeTaskButton.className = "remove-task";
      removeTaskButton.type = "button";
      removeTaskButton.textContent = "x";
      removeTaskButton.setAttribute("aria-label", `Remove ${task.text}`);

      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveCourses();
        renderCourses();
      });

      removeTaskButton.addEventListener("click", () => {
        course.tasks = course.tasks.filter((itemTask) => itemTask.id !== task.id);
        saveCourses();
        renderCourses();
      });

      item.append(checkbox, text, removeTaskButton);
      taskList.appendChild(item);
    });

    coursesGrid.appendChild(card);
  });

  updateProgress();
}

courseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = courseInput.value.trim();

  if (!name) return;

  courses.push({
    id: makeId(),
    name,
    tasks: []
  });

  courseInput.value = "";
  saveCourses();
  renderCourses();
});

saveCourses();
renderCourses();
