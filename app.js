(function () {
  'use strict';

  var KEY = 'apex.planner.v1';
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var PRIO = { high: 0, normal: 1, low: 2 };

  var state = { tasks: [], habits: [], slots: [] };
  var taskFilter = 'open';

  var el = {
    toast: document.getElementById('toast'),
    heading: document.getElementById('todayHeading'),
    todayTasks: document.getElementById('todayTasks'),
    todayTasksEmpty: document.getElementById('todayTasksEmpty'),
    todayHabits: document.getElementById('todayHabits'),
    todayHabitsEmpty: document.getElementById('todayHabitsEmpty'),
    todaySlots: document.getElementById('todaySlots'),
    todaySlotsEmpty: document.getElementById('todaySlotsEmpty'),
    taskList: document.getElementById('taskList'),
    taskEmpty: document.getElementById('taskEmpty'),
    habitList: document.getElementById('habitList'),
    habitEmpty: document.getElementById('habitEmpty'),
    slotList: document.getElementById('slotList'),
    slotDay: document.getElementById('slotDay')
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function dayKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayKey() {
    return dayKey(new Date());
  }

  function todayIndex() {
    return (new Date().getDay() + 6) % 7;
  }

  function shift(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function load() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (err) {
      raw = null;
    }
    if (!raw || typeof raw !== 'object') raw = {};
    state.tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    state.habits = Array.isArray(raw.habits) ? raw.habits : [];
    state.slots = Array.isArray(raw.slots) ? raw.slots : [];

    state.tasks.forEach(function (t) {
      if (!t.id) t.id = uid();
      if (typeof t.title !== 'string') t.title = '';
      t.done = !!t.done;
      if (!PRIO.hasOwnProperty(t.prio)) t.prio = 'normal';
      if (typeof t.due !== 'string') t.due = '';
      if (!t.created) t.created = Date.now();
    });

    state.habits.forEach(function (h) {
      if (!h.id) h.id = uid();
      if (typeof h.name !== 'string') h.name = '';
      if (!h.log || typeof h.log !== 'object') h.log = {};
    });

    state.slots.forEach(function (s) {
      if (!s.id) s.id = uid();
      if (typeof s.title !== 'string') s.title = '';
      s.day = Math.min(6, Math.max(0, Number(s.day) || 0));
      if (typeof s.start !== 'string') s.start = '09:00';
      if (typeof s.end !== 'string') s.end = '';
    });
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      toast('Could not save \u2014 storage may be full');
    }
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.toast.hidden = true; }, 2400);
  }

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function tick(on, label) {
    var b = node('button', 'tick', on ? '\u2713' : '');
    b.type = 'button';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', label);
    return b;
  }

  function dueInfo(task) {
    if (!task.due) return null;
    var t = todayKey();
    if (task.due < t) return { text: 'Overdue', cls: 'late' };
    if (task.due === t) return { text: 'Today', cls: 'today' };
    if (task.due === dayKey(shift(new Date(), 1))) return { text: 'Tomorrow', cls: '' };
    var d = new Date(task.due + 'T00:00:00');
    if (isNaN(d.getTime())) return { text: task.due, cls: '' };
    return { text: d.toLocaleDateString([], { day: 'numeric', month: 'short' }), cls: '' };
  }

  function taskOrder(a, b) {
    if (PRIO[a.prio] !== PRIO[b.prio]) return PRIO[a.prio] - PRIO[b.prio];
    var da = a.due || '9999-99-99';
    var db = b.due || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    return a.created - b.created;
  }

  function taskRow(task, withDelete) {
    var li = node('li');
    if (task.done) li.className = 'done';

    var box = tick(task.done, (task.done ? 'Mark open: ' : 'Complete: ') + task.title);
    box.addEventListener('click', function () {
      task.done = !task.done;
      save();
      renderAll();
    });
    li.appendChild(box);

    li.appendChild(node('span', 'title', task.title));

    var info = dueInfo(task);
    if (info) li.appendChild(node('span', 'badge ' + info.cls, info.text));
    if (task.prio === 'high') li.appendChild(node('span', 'badge high', 'High'));
    if (task.prio === 'low') li.appendChild(node('span', 'badge', 'Low'));

    if (withDelete) {
      var del = node('button', 'del', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        state.tasks = state.tasks.filter(function (t) { return t.id !== task.id; });
        save();
        renderAll();
      });
      li.appendChild(del);
    }
    return li;
  }

  function streak(habit) {
    var n = 0;
    var d = new Date();
    if (!habit.log[dayKey(d)]) d = shift(d, -1);
    while (habit.log[dayKey(d)]) {
      n++;
      d = shift(d, -1);
    }
    return n;
  }

  function renderToday() {
    var now = new Date();
    el.heading.textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    var key = todayKey();

    var due = state.tasks.filter(function (t) {
      return !t.done && t.due && t.due <= key;
    }).sort(taskOrder);

    el.todayTasks.textContent = '';
    due.forEach(function (t) { el.todayTasks.appendChild(taskRow(t, false)); });
    el.todayTasksEmpty.hidden = due.length !== 0;

    var open = state.habits.filter(function (h) { return !h.log[key]; });
    el.todayHabits.textContent = '';
    open.forEach(function (h) {
      var li = node('li');
      li.appendChild(node('span', 'title', h.name));
      var box = tick(false, 'Log ' + h.name + ' for today');
      box.addEventListener('click', function () {
        h.log[key] = true;
        save();
        renderAll();
        toast('Logged: ' + h.name);
      });
      li.appendChild(box);
      el.todayHabits.appendChild(li);
    });
    el.todayHabitsEmpty.hidden = open.length !== 0;
    if (!state.habits.length) el.todayHabitsEmpty.textContent = 'No habits yet \u2014 add one in the Habits tab.';
    else el.todayHabitsEmpty.textContent = 'All habits done for today.';

    var idx = todayIndex();
    var slots = state.slots.filter(function (s) { return s.day === idx; })
      .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });

    el.todaySlots.textContent = '';
    slots.forEach(function (s) {
      var li = node('li');
      li.appendChild(node('span', 'time', s.start + (s.end ? '\u2013' + s.end : '')));
      li.appendChild(node('span', 'title', s.title));
      el.todaySlots.appendChild(li);
    });
    el.todaySlotsEmpty.hidden = slots.length !== 0;
  }

  function renderTasks() {
    var key = todayKey();
    var rows = state.tasks.filter(function (t) {
      if (taskFilter === 'open') return !t.done;
      if (taskFilter === 'done') return t.done;
      if (taskFilter === 'overdue') return !t.done && t.due && t.due < key;
      return true;
    }).sort(taskOrder);

    el.taskList.textContent = '';
    rows.forEach(function (t) { el.taskList.appendChild(taskRow(t, true)); });
    el.taskEmpty.hidden = rows.length !== 0;
    el.taskEmpty.textContent = taskFilter === 'done'
      ? 'Nothing completed yet.'
      : taskFilter === 'overdue'
        ? 'Nothing overdue.'
        : 'No tasks here.';
  }

  function renderHabits() {
    var key = todayKey();
    el.habitList.textContent = '';

    state.habits.forEach(function (h) {
      var li = node('li');
      li.appendChild(node('span', 'title', h.name));

      var days = node('div', 'habit-days');
      for (var back = 6; back >= 0; back--) {
        var d = shift(new Date(), -back);
        var k = dayKey(d);
        var on = !!h.log[k];
        var b = node('button', 'day' + (back === 0 ? ' today' : ''), String(d.getDate()));
        b.type = 'button';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', (on ? 'Unlog ' : 'Log ') + h.name + ' on ' + k);
        b.addEventListener('click', (function (habit, dayk) {
          return function () {
            if (habit.log[dayk]) delete habit.log[dayk];
            else habit.log[dayk] = true;
            save();
            renderAll();
          };
        })(h, k));
        days.appendChild(b);
      }
      li.appendChild(days);

      var s = streak(h);
      li.appendChild(node('span', 'streak', s ? s + 'd' : '\u2014'));

      var del = node('button', 'del', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        if (!window.confirm('Delete habit "' + h.name + '" and its history?')) return;
        state.habits = state.habits.filter(function (x) { return x.id !== h.id; });
        save();
        renderAll();
      });
      li.appendChild(del);
      el.habitList.appendChild(li);
    });

    el.habitEmpty.hidden = state.habits.length !== 0;
  }

  function renderTimetable() {
    var idx = todayIndex();
    el.slotList.textContent = '';

    for (var i = 0; i < 7; i++) {
      var col = node('div', 'daycol' + (i === idx ? ' now' : ''));
      col.appendChild(node('h4', '', DAYS[i]));
      var slots = state.slots.filter(function (s) { return s.day === i; })
        .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });

      if (!slots.length) col.appendChild(node('p', 'muted', 'Free'));
      slots.forEach(function (s) {
        var row = node('div', 'slot');
        row.appendChild(node('span', 'time', s.start + (s.end ? '\u2013' + s.end : '')));
        row.appendChild(node('span', 'what', s.title));
        var del = node('button', '', '\u00d7');
        del.type = 'button';
        del.setAttribute('aria-label', 'Remove ' + s.title);
        del.addEventListener('click', function () {
          state.slots = state.slots.filter(function (x) { return x.id !== s.id; });
          save();
          renderAll();
        });
        row.appendChild(del);
        col.appendChild(row);
      });
      el.slotList.appendChild(col);
    }
  }

  function renderAll() {
    renderToday();
    renderTasks();
    renderHabits();
    renderTimetable();
  }

  function switchView(view) {
    document.querySelectorAll('[data-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel') !== view;
    });
    document.querySelectorAll('[data-view]').forEach(function (tab) {
      tab.setAttribute('aria-selected', tab.getAttribute('data-view') === view ? 'true' : 'false');
    });
  }

  document.querySelectorAll('[data-view]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchView(tab.getAttribute('data-view'));
    });
  });

  document.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      taskFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      renderTasks();
    });
  });

  document.getElementById('taskForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = document.getElementById('taskTitle').value.trim();
    if (!title) return;
    state.tasks.push({
      id: uid(),
      title: title,
      due: document.getElementById('taskDue').value || '',
      prio: document.getElementById('taskPrio').value,
      done: false,
      created: Date.now()
    });
    save();
    e.target.reset();
    document.getElementById('taskPrio').value = 'normal';
    document.getElementById('taskTitle').focus();
    renderAll();
    toast('Task added');
  });

  document.getElementById('habitForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('habitName').value.trim();
    if (!name) return;
    state.habits.push({ id: uid(), name: name, log: {} });
    save();
    e.target.reset();
    document.getElementById('habitName').focus();
    renderAll();
    toast('Habit added');
  });

  DAYS.forEach(function (label, i) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = label;
    el.slotDay.appendChild(opt);
  });
  el.slotDay.value = String(todayIndex());

  document.getElementById('slotForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = document.getElementById('slotTitle').value.trim();
    var start = document.getElementById('slotStart').value;
    if (!title || !start) return;
    var end = document.getElementById('slotEnd').value;
    if (end && end < start) {
      toast('End time is before the start');
      return;
    }
    state.slots.push({
      id: uid(),
      day: Number(el.slotDay.value),
      start: start,
      end: end,
      title: title
    });
    save();
    document.getElementById('slotTitle').value = '';
    document.getElementById('slotStart').value = '';
    document.getElementById('slotEnd').value = '';
    document.getElementById('slotTitle').focus();
    renderAll();
    toast('Block added');
  });

  load();
  renderAll();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();
