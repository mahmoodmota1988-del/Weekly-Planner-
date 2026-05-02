import { useState, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h) => `${h === 0 ? "12" : h > 12 ? h - 12 : h}:00 ${h < 12 ? "AM" : "PM"}`;
const fmtRange = (s, e) => `${fmtHour(s)} – ${fmtHour(e)}`;

const CATEGORIES = [
  { id: "training", label: "Training", color: "#82b99a", icon: "◈" },
  { id: "reading", label: "Reading / Study", color: "#7aaec8", icon: "◎" },
  { id: "task", label: "Task", color: "#c89898", icon: "◆" },
  { id: "ongoing", label: "Ongoing", color: "#a99ec8", icon: "↻" },
];
const FIXED_TYPES = [
  { id: "meeting", label: "Meeting", color: "#c898aa", icon: "⬤" },
  { id: "supervision", label: "Supervision", color: "#c8be90", icon: "★" },
  { id: "appointment", label: "Appointment", color: "#90bfaa", icon: "✦" },
  { id: "break", label: "Break / Lunch", color: "#a8b8c0", icon: "◌" },
  { id: "other", label: "Other Fixed", color: "#b8a4c8", icon: "⬡" },
];
const DURATION_TYPES = [
  { id: "single", label: "Single Session", desc: "Done in one sitting", icon: "⬡" },
  { id: "multiday", label: "Multi-Day", desc: "Chipped away over multiple sessions", icon: "⬡⬡" },
  { id: "ongoing", label: "Ongoing / Recurring", desc: "Repeats regularly — no end date", icon: "↻" },
];
const RECUR_OPTIONS = [
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "custom", label: "Custom days" },
];

// Standardised duration presets (in minutes)
const DURATION_PRESETS = [
  { mins: 15,  label: "15 min" },
  { mins: 30,  label: "30 min" },
  { mins: 60,  label: "1 hr" },
  { mins: 90,  label: "1 hr 30" },
  { mins: 120, label: "2 hrs" },
  { mins: 150, label: "2 hrs 30" },
  { mins: 180, label: "3 hrs" },
];
// Custom dropdown options beyond 3 hrs
const CUSTOM_DURATION_OPTIONS = [
  { mins: 0,   label: "Custom…" },
  { mins: 210, label: "3 hrs 30 min" },
  { mins: 240, label: "4 hrs" },
  { mins: 270, label: "4 hrs 30 min" },
  { mins: 300, label: "5 hrs" },
  { mins: 360, label: "6 hrs" },
  { mins: 420, label: "7 hrs" },
  { mins: 480, label: "8 hrs (full day)" },
];
const fmtMins = (m) => m < 60 ? `${m}min` : m % 60 === 0 ? `${m/60}hr` : `${Math.floor(m/60)}hr ${m%60}min`;

const getCat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[2];
const getFixed = (id) => FIXED_TYPES.find((t) => t.id === id) || FIXED_TYPES[0];
const getDurType = (id) => DURATION_TYPES.find((d) => d.id === id) || DURATION_TYPES[0];

const defaultTask = {
  title: "", category: "task", notes: "", priority: false,
  durationType: "single", estimatedMins: 30,
  totalSessions: 5, minsPerSession: 30,
  recurType: "weekdays", recurDays: [], sessionMins: 30,
};
const defaultFixed = {
  title: "", type: "meeting", day: "Monday", startHour: 9, endHour: 10,
  notes: "", recurring: false, recurDays: [],
};

function TimePickerModal({ timePicker, tasks, workHours, fixedBlocks, getTaskTime, setTaskTime, setTimePicker, showToast }) {
  if (!timePicker) return null;
  const task = tasks.find((t) => t.id === timePicker.taskId);
  const wh = workHours[timePicker.day] || { start: 9, end: 17 };
  const currentTime = getTaskTime(timePicker.day, timePicker.taskId) || "";
  const slots = [];
  for (let h = wh.start; h < wh.end; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h + 0.5 < wh.end) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setTimePicker(null)}>
      <div style={{ background: "#e9e4db", border: "1px solid #b4d0bc", borderRadius: 12, padding: 20, width: 280, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 10, color: "#8aa898", letterSpacing: "0.2em", marginBottom: 4, textTransform: "uppercase" }}>Set Time</div>
        <div style={{ fontSize: 13, color: "#4c4235", marginBottom: 2 }}>{task?.title}</div>
        <div style={{ fontSize: 11, color: "#726460", marginBottom: 14 }}>{timePicker.day}</div>
        {currentTime && (
          <div style={{ background: "#e6f0e8", border: "1px solid #8aa89844", borderRadius: 6, padding: "6px 10px", marginBottom: 10, fontSize: 12, color: "#a8c4b0" }}>
            Currently set: {currentTime}
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
            {slots.map((slot) => {
              const isActive = currentTime === slot;
              const [h] = slot.split(":").map(Number);
              const slotMins = h * 60 + parseInt(slot.split(":")[1]);
              const clashes = fixedBlocks.filter((b) => b.day === timePicker.day).some((b) => slotMins >= b.startHour * 60 && slotMins < b.endHour * 60);
              return (
                <button key={slot}
                  onClick={() => { if (!clashes) { setTaskTime(timePicker.day, timePicker.taskId, slot); setTimePicker(null); showToast(`Scheduled at ${slot}`); } }}
                  style={{ background: isActive ? "#8aa898" : clashes ? "#fce8e8" : "#efeae2", border: `1px solid ${isActive ? "#a8c4b0" : clashes ? "#d4a0a0" : "#cec8c0"}`, color: isActive ? "#fff" : clashes ? "#d0a8a8" : "#6c6255", borderRadius: 6, padding: "7px 0", fontSize: 12, cursor: clashes ? "not-allowed" : "pointer" }}
                  title={clashes ? "Clashes with a fixed block" : ""}>
                  {slot}{clashes && <span style={{ fontSize: 8, display: "block", color: "#d0a8a8" }}>busy</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {currentTime && (
            <button onClick={() => { setTaskTime(timePicker.day, timePicker.taskId, null); setTimePicker(null); showToast("Time cleared"); }} style={{ background: "none", border: "1px solid #cec8c0", color: "#726460", padding: "7px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", flex: 1 }}>Clear Time</button>
          )}
          <button onClick={() => setTimePicker(null)} style={{ background: "none", border: "1px solid #cec8c0", color: "#726460", padding: "7px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", flex: 1 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(() => { try { return JSON.parse(localStorage.getItem("planner_tasks_v3") || "[]"); } catch { return []; } });
  const [schedule, setSchedule] = useState(() => { try { return JSON.parse(localStorage.getItem("planner_sched_v3") || "{}"); } catch { return {}; } });
  const [fixedBlocks, setFixedBlocks] = useState(() => { try { return JSON.parse(localStorage.getItem("planner_fixed_v3") || "[]"); } catch { return []; } });

  const defaultWorkHours = () => {
    const h = {};
    DAYS.forEach((d, i) => { h[d] = { start: 9, end: 17, enabled: i < 5 }; });
    return h;
  };
  const [workHours, setWorkHours] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_workhours_v3") || "null") || defaultWorkHours(); } catch { return defaultWorkHours(); }
  });

  const [view, setView] = useState("week");
  const [newTask, setNewTask] = useState({ ...defaultTask });
  const [newFixed, setNewFixed] = useState({ ...defaultFixed });
  const [customMins, setCustomMins] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editCustomMins, setEditCustomMins] = useState("");
  const [dragTask, setDragTask] = useState(null);
  const [dragFromDay, setDragFromDay] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [timePicker, setTimePicker] = useState(null);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [addingFixed, setAddingFixed] = useState(false);
  const [subView, setSubView] = useState("schedule");
  const [showCarryOver, setShowCarryOver] = useState(false);

  // Track which day of the week we're currently on (0=Mon … 6=Sun)
  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const todayName = DAYS[todayIndex];

  // Schedule entries are {id, time} objects. time is "HH:MM" or null.
  const getScheduleIds = (day) => (schedule[day] || []).map((e) => (typeof e === "object" ? e.id : e));
  const getTaskTime = (day, taskId) => { const e = (schedule[day] || []).find((e) => (typeof e === "object" ? e.id : e) === taskId); return e?.time || null; };
  const setTaskTime = (day, taskId, time) => setSchedule((p) => ({ ...p, [day]: (p[day] || []).map((e) => { const id = typeof e === "object" ? e.id : e; return id === taskId ? { id, time } : e; }) }));

  // Overdue: task was scheduled on a past day this week and is not completed
  const isOverdue = (taskId) => {
    return DAYS.slice(0, todayIndex).some((day) => getScheduleIds(day).includes(taskId)) &&
      !tasks.find((t) => t.id === taskId)?.completed;
  };

  // Progress stats
  const totalTasks = tasks.filter((t) => t.durationType !== "ongoing").length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const scheduledThisWeek = [...new Set(Object.values(schedule).flat().map((e) => typeof e === "object" ? e.id : e))].filter((id) => tasks.find((t) => t.id === id && t.durationType !== "ongoing")).length;
  const overdueTasks = tasks.filter((t) => !t.completed && isOverdue(t.id));
  const totalPlannedMins = DAYS.reduce((sum, day) => {
    const dayIds = getScheduleIds(day);
    return sum + dayIds.reduce((s, id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return s;
      if (t.durationType === "single") return s + (t.estimatedMins || 0);
      if (t.durationType === "multiday") return s + (t.minsPerSession || 0);
      if (t.durationType === "ongoing") return s + (t.sessionMins || 0);
      return s;
    }, 0);
  }, 0);

  // Carry over: move incomplete non-ongoing scheduled tasks to today
  const carryOverTasks = () => {
    const pastDays = DAYS.slice(0, todayIndex);
    if (!pastDays.length) { showToast("No past days to carry over from"); return; }
    const s = { ...schedule };
    let count = 0;
    pastDays.forEach((day) => {
      const entries = s[day] || [];
      const incomplete = entries.filter((e) => {
        const id = typeof e === "object" ? e.id : e;
        const task = tasks.find((t) => t.id === id);
        return task && !task.completed && task.durationType !== "ongoing";
      });
      if (incomplete.length) {
        // Remove from past day
        s[day] = entries.filter((e) => !incomplete.includes(e));
        // Add to today
        const todayEntries = s[todayName] || [];
        const todayIds = todayEntries.map((e) => typeof e === "object" ? e.id : e);
        incomplete.forEach((e) => {
          const id = typeof e === "object" ? e.id : e;
          if (!todayIds.includes(id)) { s[todayName] = [...(s[todayName] || []), { id, time: null }]; count++; }
        });
      }
    });
    setSchedule(s);
    setShowCarryOver(false);
    showToast(count > 0 ? `${count} task${count !== 1 ? "s" : ""} carried over to ${todayName}` : "Nothing to carry over");
  };

  useEffect(() => { localStorage.setItem("planner_tasks_v3", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("planner_sched_v3", JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem("planner_fixed_v3", JSON.stringify(fixedBlocks)); }, [fixedBlocks]);
  useEffect(() => { localStorage.setItem("planner_workhours_v3", JSON.stringify(workHours)); }, [workHours]);

  const setWorkDay = (day, field, value) => setWorkHours((p) => ({ ...p, [day]: { ...p[day], [field]: value } }));
  const applyToAllWeekdays = (start, end) => {
    setWorkHours((p) => {
      const n = { ...p };
      DAYS.forEach((d, i) => { if (i < 5) n[d] = { ...n[d], start, end }; });
      return n;
    });
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const setField = (f, v) => setNewTask((p) => ({ ...p, [f]: v }));
  const setFixedField = (f, v) => setNewFixed((p) => ({ ...p, [f]: v }));

  const startEditing = (task) => {
    setEditingTask(task.id);
    setEditForm({ ...task });
    setEditCustomMins("");
    setExpandedTask(null);
  };
  const setEditField = (f, v) => setEditForm((p) => ({ ...p, [f]: v }));
  const saveEdit = () => {
    if (!editForm.title.trim()) return;
    const updated = { ...editForm, estimatedMins: editCustomMins ? parseInt(editCustomMins) : editForm.estimatedMins };
    setTasks((p) => p.map((t) => t.id === editingTask ? updated : t));
    setEditingTask(null); setEditForm(null); setEditCustomMins("");
    showToast("Task updated!");
  };
  const cancelEdit = () => { setEditingTask(null); setEditForm(null); setEditCustomMins(""); };

  const getDurationLabel = (task) => {
    if (task.durationType === "single") return `~${fmtMins(task.estimatedMins)}`;
    if (task.durationType === "multiday") return `${task.completedSessions || 0}/${task.totalSessions} sessions · ${fmtMins(task.minsPerSession)} each`;
    if (task.durationType === "ongoing") {
      const d = task.recurType === "daily" ? "Daily" : task.recurType === "weekdays" ? "Weekdays" : (task.recurDays || []).map((x) => x.slice(0, 3)).join(", ");
      return `${d} · ${fmtMins(task.sessionMins)}/session`;
    }
    return "";
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task = { id: Date.now(), ...newTask, estimatedMins: customMins ? parseInt(customMins) : newTask.estimatedMins, completedSessions: 0, completed: false, createdAt: new Date().toISOString() };
    const newTasks = [...tasks, task];
    setTasks(newTasks);
    if (task.durationType === "ongoing") {
      const s = { ...schedule };
      DAYS.forEach((day, i) => {
        const ok = task.recurType === "daily" || (task.recurType === "weekdays" && i < 5) || (task.recurType === "custom" && (task.recurDays || []).includes(day));
        if (ok) s[day] = [...new Set([...(s[day] || []), task.id])];
      });
      setSchedule(s);
    }
    setNewTask({ ...defaultTask }); setCustomMins("");
    setView("tasks"); showToast("Task added!");
  };

  const addFixed = () => {
    if (!newFixed.title.trim()) return;
    const block = { id: Date.now(), ...newFixed };
    // If recurring, expand to all chosen days
    if (block.recurring && block.recurDays.length > 0) {
      const blocks = block.recurDays.map((day) => ({ ...block, id: Date.now() + Math.random(), day, recurring: true }));
      setFixedBlocks((p) => [...p, ...blocks]);
    } else {
      setFixedBlocks((p) => [...p, block]);
    }
    setNewFixed({ ...defaultFixed });
    setAddingFixed(false);
    showToast("Fixed block added!");
  };

  const deleteFixed = (id) => setFixedBlocks((p) => p.filter((b) => b.id !== id));
  const deleteTask = (id) => { setTasks((p) => p.filter((t) => t.id !== id)); setSchedule((p) => { const n = { ...p }; Object.keys(n).forEach((d) => { n[d] = (n[d] || []).filter((x) => x !== id); }); return n; }); };
  const toggleComplete = (id) => setTasks((p) => p.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  const incrementSession = (id) => setTasks((p) => p.map((t) => { if (t.id !== id) return t; const next = (t.completedSessions || 0) + 1; return { ...t, completedSessions: next, completed: t.durationType === "multiday" && next >= t.totalSessions }; }));
  const decrementSession = (id) => setTasks((p) => p.map((t) => t.id === id ? { ...t, completedSessions: Math.max(0, (t.completedSessions || 0) - 1), completed: false } : t));

  const assignToDay = (taskId, day, time = null) => setSchedule((p) => {
    const entries = p[day] || [];
    const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
    if (ids.includes(taskId)) return { ...p, [day]: entries.filter((e) => (typeof e === "object" ? e.id : e) !== taskId) };
    return { ...p, [day]: [...entries, { id: taskId, time }] };
  });
  const removeFromDay = (taskId, day) => setSchedule((p) => ({ ...p, [day]: (p[day] || []).filter((e) => (typeof e === "object" ? e.id : e) !== taskId) }));

  const onDrop = (toDay) => {
    if (!dragTask) return;
    if (dragFromDay && dragFromDay !== toDay) {
      const existingTime = getTaskTime(dragFromDay, dragTask);
      setSchedule((p) => {
        const from = (p[dragFromDay] || []).filter((e) => (typeof e === "object" ? e.id : e) !== dragTask);
        const toEntries = p[toDay] || [];
        const toIds = toEntries.map((e) => (typeof e === "object" ? e.id : e));
        const to = toIds.includes(dragTask) ? toEntries : [...toEntries, { id: dragTask, time: existingTime }];
        return { ...p, [dragFromDay]: from, [toDay]: to };
      });
      setTimePicker({ taskId: dragTask, day: toDay });
    } else if (!dragFromDay) {
      setSchedule((p) => {
        const entries = p[toDay] || [];
        const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
        if (!ids.includes(dragTask)) return { ...p, [toDay]: [...entries, { id: dragTask, time: null }] };
        return p;
      });
      setTimePicker({ taskId: dragTask, day: toDay });
    }
    setDragTask(null); setDragFromDay(null); setDragOver(null); setDragOverTrash(false);
  };

  const onDropTrash = () => {
    if (!dragTask) return;
    deleteTask(dragTask);
    showToast("Task deleted");
    setDragTask(null); setDragFromDay(null); setDragOver(null); setDragOverTrash(false);
  };
  const autoAssignOngoing = (task) => {
    const s = { ...schedule };
    DAYS.forEach((day, i) => {
      const ok = task.recurType === "daily" || (task.recurType === "weekdays" && i < 5) || (task.recurType === "custom" && (task.recurDays || []).includes(day));
      const entries = s[day] || [];
      const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
      if (ok && !ids.includes(task.id)) s[day] = [...entries, { id: task.id, time: null }];
      else if (!ok) s[day] = entries.filter((e) => (typeof e === "object" ? e.id : e) !== task.id);
    });
    setSchedule(s); showToast("Auto-assigned!");
  };

  const unscheduledTasks = tasks.filter((t) => t.durationType !== "ongoing" && !DAYS.some((d) => getScheduleIds(d).includes(t.id)));

  // ── Smart Rule-Based Planner ──
  const planMyWeek = () => {
    setAiPlanning(true);

    // Only plan from today onwards — skip past days
    const availableDays = DAYS.filter((d) => DAYS.indexOf(d) >= todayIndex);

    // Use per-day work hours, falling back to 9–17 if day is disabled
    const dayFreeMinutes = {};
    const dayFixedSlots = {};
    const dayWorkStart = {};
    const dayWorkEnd = {};
    DAYS.forEach((day) => {
      const wh = workHours[day] || { start: 9, end: 17, enabled: true };
      const start = wh.enabled ? wh.start : 9;
      const end = wh.enabled ? wh.end : 17;
      dayWorkStart[day] = start;
      dayWorkEnd[day] = end;
      const blocks = fixedBlocks.filter((b) => b.day === day);
      const usedMins = blocks.reduce((s, b) => s + (b.endHour - b.startHour) * 60, 0);
      const bufferMins = blocks.length * 30;
      // Past days get 0 free minutes so planner skips them
      const isPastDay = DAYS.indexOf(day) < todayIndex;
      const totalAvailable = (!isPastDay && wh.enabled) ? Math.max(0, (end - start) * 60 - usedMins - bufferMins) : 0;
      dayFreeMinutes[day] = totalAvailable;
      dayFixedSlots[day] = blocks;
    });

    const dayScore = (day, i) => dayFreeMinutes[day] + (i < 5 ? 100 : 0);

    const plan = {};
    DAYS.forEach((d) => { plan[d] = []; });
    const dayLoad = {};
    DAYS.forEach((d) => { dayLoad[d] = 0; });

    const ongoingTasks = tasks.filter((t) => t.durationType === "ongoing" && !t.completed);
    const multidayTasks = tasks.filter((t) => t.durationType === "multiday" && !t.completed);
    const singleTasks = tasks.filter((t) => t.durationType === "single" && !t.completed);
    const catPriority = { training: 0, task: 1, reading: 2, ongoing: 3 };
    const sortByCat = (a, b) => (catPriority[a.category] ?? 2) - (catPriority[b.category] ?? 2);

    // 1. Ongoing → recurring days (today onwards only)
    ongoingTasks.forEach((task) => {
      availableDays.forEach((day, idx) => {
        const i = DAYS.indexOf(day);
        const wh = workHours[day] || { enabled: i < 5 };
        if (!wh.enabled) return;
        const ok = task.recurType === "daily" ||
          (task.recurType === "weekdays" && i < 5) ||
          (task.recurType === "custom" && (task.recurDays || []).includes(day));
        if (ok) {
          plan[day].push({ taskId: task.id, suggestedTime: "Flexible" });
          dayLoad[day] += task.sessionMins || 30;
        }
      });
    });

    // 2. Multi-day → spread sessions across remaining week
    [...multidayTasks].sort(sortByCat).forEach((task) => {
      const sessionsLeft = task.totalSessions - (task.completedSessions || 0);
      const sessionsToAssign = Math.min(sessionsLeft, availableDays.length);
      const sortedDays = [...availableDays].map((d) => ({ d, i: DAYS.indexOf(d) }))
        .sort((a, b) => (dayLoad[a.d] - dayLoad[b.d]) || (dayScore(a.d, a.i) > dayScore(b.d, b.i) ? -1 : 1));
      let assigned = 0;
      for (const { d } of sortedDays) {
        if (assigned >= sessionsToAssign) break;
        const wh = workHours[d] || { enabled: true };
        if (!wh.enabled) continue;
        if (dayLoad[d] + (task.minsPerSession || 30) <= dayFreeMinutes[d]) {
          const slot = findSlot(d, task.minsPerSession || 30, dayFixedSlots[d], dayWorkStart[d]);
          plan[d].push({ taskId: task.id, suggestedTime: slot });
          dayLoad[d] += task.minsPerSession || 30;
          assigned++;
        }
      }
      if (assigned === 0) {
        const enabledDays = availableDays.filter((d) => (workHours[d] || {}).enabled !== false);
        if (enabledDays.length) {
          const lightest = enabledDays.sort((a, b) => dayLoad[a] - dayLoad[b])[0];
          plan[lightest].push({ taskId: task.id, suggestedTime: "Flexible" });
          dayLoad[lightest] += task.minsPerSession || 30;
        }
      }
    });

    // 3. Single tasks → best-fit day from today onwards
    [...singleTasks].sort(sortByCat).forEach((task) => {
      const mins = task.estimatedMins || 30;
      const prefDays = task.category === "training"
        ? availableDays
        : task.category === "reading"
        ? [...availableDays].sort((a, b) => {
            const order = ["Wednesday", "Thursday", "Monday", "Tuesday", "Friday", "Saturday", "Sunday"];
            return order.indexOf(a) - order.indexOf(b);
          })
        : [...availableDays];
      const enabledPref = prefDays.filter((d) => (workHours[d] || { enabled: DAYS.indexOf(d) < 5 }).enabled !== false);
      let placed = false;
      for (const day of enabledPref) {
        if (dayLoad[day] + mins <= dayFreeMinutes[day]) {
          const slot = findSlot(day, mins, dayFixedSlots[day], dayWorkStart[day]);
          plan[day].push({ taskId: task.id, suggestedTime: slot });
          dayLoad[day] += mins;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const enabledDays = availableDays.filter((d) => (workHours[d] || {}).enabled !== false);
        const lightest = (enabledDays.length ? enabledDays : availableDays).sort((a, b) => dayLoad[a] - dayLoad[b])[0];
        if (lightest) { plan[lightest].push({ taskId: task.id, suggestedTime: "Flexible" }); dayLoad[lightest] += mins; }
      }
    });

    const busyDays = availableDays.filter(d => dayLoad[d] > 0);
    const heaviestDay = busyDays.length ? busyDays.reduce((a, b) => dayLoad[a] > dayLoad[b] ? a : b) : todayName;
    const totalMins = Object.values(dayLoad).reduce((s, v) => s + v, 0);
    const remainingDays = availableDays.length;
    const tips = `Planning ${remainingDays} day${remainingDays !== 1 ? "s" : ""} from ${todayName} — ~${Math.round(totalMins / 60 * 10) / 10} hours total. ${heaviestDay} is your busiest day. ${fixedBlocks.length > 0 ? "Tasks have been scheduled around your fixed commitments." : "Add fixed blocks in the Fixed Schedule tab so future plans can work around them."}`;

    setAiSuggestion({ plan, tips, dayLoad });
    setAiPlanning(false);
  };

  // Helper: find a time slot avoiding fixed blocks, starting from work start
  const findSlot = (day, durationMins, fixedSlots, workStart = 9) => {
    const fixed = (fixedSlots || []).map((b) => ({ start: b.startHour * 60, end: b.endHour * 60 + 15 }));
    const busyStart = workStart * 60;
    const busyEnd = (workHours[day]?.end || 17) * 60;
    let cursor = busyStart;
    while (cursor + durationMins <= busyEnd) {
      const end = cursor + durationMins;
      const blocked = fixed.some((f) => cursor < f.end && end > f.start);
      if (!blocked) {
        const h = Math.floor(cursor / 60);
        const endH = Math.floor(end / 60);
        return `${fmtHour(h)} – ${fmtHour(endH)}`;
      }
      cursor += 30;
    }
    return "Flexible";
  };

  const applyAIPlan = () => {
    if (!aiSuggestion?.plan) return;
    const s = {};
    DAYS.forEach((day) => {
      const items = aiSuggestion.plan[day] || [];
      const ids = items.map((item) => item.taskId).filter(Boolean);
      // Preserve existing ongoing task entries, replace others
      const ongoingEntries = (schedule[day] || []).filter((e) => {
        const id = typeof e === "object" ? e.id : e;
        return tasks.find((t) => t.id === id && t.durationType === "ongoing");
      });
      const newEntries = ids.map((id) => {
        const item = items.find((i) => i.taskId === id);
        const timeStr = item?.suggestedTime && item.suggestedTime !== "Flexible" ? item.suggestedTime.split(" – ")[0] : null;
        // Convert "9:00 AM" → "09:00"
        let time = null;
        if (timeStr) {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let h = parseInt(match[1]);
            const pm = match[3].toUpperCase() === "PM";
            if (pm && h !== 12) h += 12;
            if (!pm && h === 12) h = 0;
            time = `${String(h).padStart(2,"0")}:${match[2]}`;
          }
        }
        return { id, time };
      });
      s[day] = [...new Set([...ongoingEntries.map(e => JSON.stringify(e)), ...newEntries.map(e => JSON.stringify(e))])].map(e => JSON.parse(e));
    });
    setSchedule(s); setAiSuggestion(null); showToast("Week planned! ✓");
  };

  // ── Styles ──
  const inp = { width: "100%", background: "#efeae2", border: "1px solid #cec8c0", borderRadius: 8, padding: "9px 13px", color: "#3c3226", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Georgia, serif" };
  const lbl = { display: "block", fontSize: 10, color: "#726460", marginBottom: 6, letterSpacing: "0.15em", textTransform: "uppercase" };
  const chip = (active, color) => ({ background: active ? color + "20" : "none", border: `1px solid ${active ? color : "#cec8c0"}`, color: active ? color : "#8a7e76", padding: "5px 9px", borderRadius: 5, fontSize: 12, cursor: "pointer" });

  // Timeline: span from earliest start to latest end across enabled days
  const enabledDayHours = DAYS.map((d) => workHours[d]).filter((wh) => wh?.enabled !== false);
  const tlStart = enabledDayHours.length ? Math.min(...enabledDayHours.map((wh) => wh.start ?? 9)) : 7;
  const tlEnd = enabledDayHours.length ? Math.max(...enabledDayHours.map((wh) => wh.end ?? 17)) : 20;
  const timelineHours = Array.from({ length: tlEnd - tlStart }, (_, i) => i + tlStart);
  const hourHeight = 48;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f0e8", color: "#3c3226", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <header style={{ padding: "20px 22px 0", borderBottom: "1px solid #d6d0c8" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "#726460", textTransform: "uppercase", marginBottom: 2 }}>Weekly Planner</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: "normal" }}>My <em style={{ color: "#a8c4b0" }}>Week</em></h1>
          </div>
          <span style={{ fontSize: 11, color: "#a29890" }}>{tasks.length} tasks · {fixedBlocks.length} fixed</span>
        </div>
        <nav style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[["week", "Week View"], ["fixed", "Fixed Schedule"], ["tasks", "Tasks"], ["add", "+ Add Task"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: "none", border: "none", color: view === v ? "#3c3226" : "#8a7e76", fontSize: 13, padding: "9px 13px", cursor: "pointer", borderBottom: view === v ? "2px solid #a8c4b0" : "2px solid transparent" }}>{label}</button>
          ))}
        </nav>
      </header>

      <main style={{ padding: "16px 22px" }}>

        {/* ── FIXED SCHEDULE ── */}
        {view === "fixed" && (
          <div style={{ maxWidth: 600 }}>

            {/* ── Work Hours section ── */}
            <div style={{ background: "#efeae2", border: "1px solid #d6d0c8", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#4c4235" }}>Work Hours</div>
                  <div style={{ fontSize: 11, color: "#8a7e76" }}>Set your start & finish time for each day — the planner schedules within these</div>
                </div>
                <button
                  onClick={() => {
                    const wh = workHours["Monday"] || { start: 9, end: 17 };
                    applyToAllWeekdays(wh.start, wh.end);
                    showToast("Applied Monday hours to all weekdays");
                  }}
                  style={{ background: "none", border: "1px solid #cec8c0", color: "#5c5050", fontSize: 11, padding: "5px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" }}
                >Copy Mon → all weekdays</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DAYS.map((day, i) => {
                  const wh = workHours[day] || { start: 9, end: 17, enabled: i < 5 };
                  return (
                    <div key={day} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 36px", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: wh.enabled ? "#6c6255" : "#a29890" }}>{day.slice(0, 3)}</div>
                      <select
                        value={wh.start}
                        disabled={!wh.enabled}
                        onChange={(e) => setWorkDay(day, "start", parseInt(e.target.value))}
                        style={{ ...inp, padding: "6px 10px", fontSize: 12, opacity: wh.enabled ? 1 : 0.3, cursor: wh.enabled ? "pointer" : "not-allowed" }}
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 5).map((h) => (
                          <option key={h} value={h}>{fmtHour(h)}</option>
                        ))}
                      </select>
                      <select
                        value={wh.end}
                        disabled={!wh.enabled}
                        onChange={(e) => setWorkDay(day, "end", parseInt(e.target.value))}
                        style={{ ...inp, padding: "6px 10px", fontSize: 12, opacity: wh.enabled ? 1 : 0.3, cursor: wh.enabled ? "pointer" : "not-allowed" }}
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 6).filter(h => h > wh.start).map((h) => (
                          <option key={h} value={h}>{fmtHour(h)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setWorkDay(day, "enabled", !wh.enabled)}
                        title={wh.enabled ? "Click to mark as day off" : "Click to enable this day"}
                        style={{ background: wh.enabled ? "#a8c4b018" : "none", border: `1px solid ${wh.enabled ? "#8aa89855" : "#cec8c0"}`, color: wh.enabled ? "#a8c4b0" : "#a29890", borderRadius: 5, width: 34, height: 34, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >{wh.enabled ? "✓" : "—"}</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "#a29890" }}>
                ✓ = working day &nbsp;·&nbsp; — = day off &nbsp;·&nbsp; The planner skips days marked off
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#4c4235" }}>Fixed commitments</div>
                <div style={{ fontSize: 11, color: "#8a7e76" }}>Meetings, supervisions, appointments — the planner works around these</div>
              </div>
              <button onClick={() => setAddingFixed(!addingFixed)} style={{ background: addingFixed ? "#e6f0e8" : "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>
                {addingFixed ? "Cancel" : "+ Add Fixed Block"}
              </button>
            </div>

            {/* Add fixed block form */}
            {addingFixed && (
              <div style={{ background: "#efeae2", border: "1px solid #cec8c0", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Title</label>
                  <input value={newFixed.title} onChange={(e) => setFixedField("title", e.target.value)} placeholder="e.g. Team Meeting, Supervision, Lunch..." style={inp} autoFocus />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Type</label>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {FIXED_TYPES.map((ft) => (
                      <button key={ft.id} onClick={() => setFixedField("type", ft.id)} style={{ ...chip(newFixed.type === ft.id, ft.color), display: "flex", gap: 4, alignItems: "center" }}>
                        <span>{ft.icon}</span>{ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurring toggle */}
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Repeats?</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setFixedField("recurring", false)} style={chip(!newFixed.recurring, "#8aa898")}>One-off</button>
                    <button onClick={() => setFixedField("recurring", true)} style={chip(newFixed.recurring, "#8aa898")}>↻ Recurring</button>
                  </div>
                </div>

                {!newFixed.recurring && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Day</label>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {DAYS.map((day) => (
                        <button key={day} onClick={() => setFixedField("day", day)} style={chip(newFixed.day === day, "#8aa898")}>{day.slice(0, 3)}</button>
                      ))}
                    </div>
                  </div>
                )}

                {newFixed.recurring && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Repeats on</label>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {DAYS.map((day) => {
                        const on = (newFixed.recurDays || []).includes(day);
                        return (
                          <button key={day} onClick={() => setFixedField("recurDays", on ? newFixed.recurDays.filter((d) => d !== day) : [...(newFixed.recurDays || []), day])} style={chip(on, "#8aa898")}>{day.slice(0, 3)}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Start Time</label>
                    <select value={newFixed.startHour} onChange={(e) => setFixedField("startHour", parseInt(e.target.value))} style={{ ...inp, appearance: "none" }}>
                      {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>End Time</label>
                    <select value={newFixed.endHour} onChange={(e) => setFixedField("endHour", parseInt(e.target.value))} style={{ ...inp, appearance: "none" }}>
                      {HOURS.filter((h) => h > newFixed.startHour).map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Notes (optional)</label>
                  <input value={newFixed.notes} onChange={(e) => setFixedField("notes", e.target.value)} placeholder="Location, attendees, dial-in..." style={inp} />
                </div>

                <button onClick={addFixed} disabled={!newFixed.title.trim()} style={{ background: newFixed.title.trim() ? "linear-gradient(135deg,#8aa898,#a8c4b0)" : "#d6d0c8", border: "none", color: "#fff", padding: "10px 22px", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
                  Add Fixed Block →
                </button>
              </div>
            )}

            {/* Fixed blocks list by day */}
            {DAYS.map((day) => {
              const dayBlocks = fixedBlocks.filter((b) => b.day === day).sort((a, b) => a.startHour - b.startHour);
              if (!dayBlocks.length) return null;
              return (
                <div key={day} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#726460", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 7 }}>{day}</div>
                  {dayBlocks.map((block) => {
                    const ft = getFixed(block.type);
                    return (
                      <div key={block.id} style={{ background: "#efeae2", border: `1px solid ${ft.color}33`, borderLeft: `3px solid ${ft.color}`, borderRadius: 7, padding: "10px 13px", marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                            <span style={{ color: ft.color, fontSize: 11 }}>{ft.icon}</span>
                            <span style={{ fontSize: 13, color: "#4c4235" }}>{block.title}</span>
                            {block.recurring && <span style={{ fontSize: 10, color: "#726460" }}>↻</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#726460" }}>{fmtRange(block.startHour, block.endHour)} · {(block.endHour - block.startHour) * 60}min · {ft.label}</div>
                          {block.notes && <div style={{ fontSize: 11, color: "#a29890", marginTop: 2 }}>{block.notes}</div>}
                        </div>
                        <button onClick={() => deleteFixed(block.id)} style={{ background: "none", border: "none", color: "#cec8c0", cursor: "pointer", fontSize: 15 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {fixedBlocks.length === 0 && !addingFixed && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#cec8c0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⬤</div>
                <div style={{ fontSize: 13 }}>No fixed blocks yet. Add your meetings, supervisions, and appointments.</div>
              </div>
            )}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === "week" && (
          <div>

            {/* ── Progress Overview Bar ── */}
            <div style={{ background: "#efeae2", border: "1px solid #d6d0c8", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 0, flexWrap: "wrap" }}>
              {/* Completed */}
              <div style={{ flex: 1, minWidth: 80, textAlign: "center", padding: "4px 12px", borderRight: "1px solid #d6d0c8" }}>
                <div style={{ fontSize: 22, fontWeight: "normal", color: "#82b99a" }}>{completedTasks}</div>
                <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.1em", textTransform: "uppercase" }}>Done</div>
              </div>
              {/* Remaining */}
              <div style={{ flex: 1, minWidth: 80, textAlign: "center", padding: "4px 12px", borderRight: "1px solid #d6d0c8" }}>
                <div style={{ fontSize: 22, fontWeight: "normal", color: "#7aaec8" }}>{scheduledThisWeek - completedTasks < 0 ? 0 : scheduledThisWeek - completedTasks}</div>
                <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.1em", textTransform: "uppercase" }}>Remaining</div>
              </div>
              {/* Overdue */}
              <div style={{ flex: 1, minWidth: 80, textAlign: "center", padding: "4px 12px", borderRight: "1px solid #d6d0c8" }}>
                <div style={{ fontSize: 22, fontWeight: "normal", color: overdueTasks.length > 0 ? "#c89898" : "#82b99a" }}>{overdueTasks.length}</div>
                <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.1em", textTransform: "uppercase" }}>Overdue</div>
              </div>
              {/* Total planned time */}
              <div style={{ flex: 1, minWidth: 80, textAlign: "center", padding: "4px 12px", borderRight: "1px solid #d6d0c8" }}>
                <div style={{ fontSize: 22, fontWeight: "normal", color: "#a99ec8" }}>{Math.round(totalPlannedMins / 60 * 10) / 10}h</div>
                <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.1em", textTransform: "uppercase" }}>Planned</div>
              </div>
              {/* Progress bar + carry over */}
              <div style={{ flex: 2, minWidth: 160, padding: "4px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: "#8a7e76" }}>Weekly progress</span>
                  <span style={{ fontSize: 10, color: "#8a7e76" }}>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
                </div>
                <div style={{ height: 6, background: "#d6d0c8", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`, background: "linear-gradient(90deg, #82b99a, #a8c4b0)", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
                {overdueTasks.length > 0 && (
                  <button onClick={carryOverTasks} style={{ background: "#c8989820", border: "1px solid #c89898", color: "#c89898", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginTop: 2 }}>
                    ↻ Carry over {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""} to today
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={() => setSubView("schedule")} style={{ background: "none", border: "none", color: subView === "schedule" ? "#3c3226" : "#8a7e76", fontSize: 12, padding: "5px 10px", cursor: "pointer", borderBottom: subView === "schedule" ? "1px solid #8aa898" : "1px solid transparent" }}>Schedule</button>
                <button onClick={() => setSubView("timeline")} style={{ background: "none", border: "none", color: subView === "timeline" ? "#3c3226" : "#8a7e76", fontSize: 12, padding: "5px 10px", cursor: "pointer", borderBottom: subView === "timeline" ? "1px solid #8aa898" : "1px solid transparent" }}>Timeline</button>
              </div>
              <button onClick={planMyWeek} disabled={aiPlanning || tasks.length === 0} style={{ background: aiPlanning ? "#e9e4db" : "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 6, fontSize: 12, cursor: tasks.length === 0 ? "not-allowed" : "pointer", opacity: tasks.length === 0 ? 0.4 : 1 }}>
                {aiPlanning ? "Planning…" : "✦ Plan My Week"}
              </button>
            </div>

            {fixedBlocks.length > 0 && (
              <div style={{ fontSize: 11, color: "#726460", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#c898aa" }}>⬤</span> {fixedBlocks.length} fixed block{fixedBlocks.length !== 1 ? "s" : ""} — planner will schedule tasks around these
              </div>
            )}

            {/* Plan suggestion */}
            {aiSuggestion && (
              <div style={{ background: "#eaf4ec", border: "1px solid #b4d0bc", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#a8c4b0", letterSpacing: "0.2em", marginBottom: 6 }}>SUGGESTED PLAN</div>
                {aiSuggestion.tips && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#7a7098", lineHeight: 1.6 }}>{aiSuggestion.tips}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {DAYS.map((day) => {
                    const items = aiSuggestion.plan[day] || [];
                    const dayFixed = fixedBlocks.filter((b) => b.day === day);
                    const load = aiSuggestion.dayLoad?.[day] || 0;
                    return (
                      <div key={day} style={{ background: "#e8f2ea", borderRadius: 5, padding: "6px 9px", minWidth: 110, flex: "1 1 110px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: "#88aa94", letterSpacing: "0.12em" }}>{day.slice(0, 3).toUpperCase()}</span>
                          {load > 0 && <span style={{ fontSize: 9, color: "#726878" }}>{fmtMins(load)}</span>}
                        </div>
                        {dayFixed.map((b, i) => { const ft = getFixed(b.type); return <div key={i} style={{ fontSize: 10, color: ft.color, marginBottom: 2 }}>{ft.icon} {b.title} <span style={{ color: "#96b098" }}>{fmtHour(b.startHour)}</span></div>; })}
                        {items.map((item, i) => {
                          const task = tasks.find((t) => t.id === item.taskId);
                          if (!task) return null;
                          const cat = getCat(task.category);
                          return (
                            <div key={i} style={{ fontSize: 11, color: "#a8c8b0", marginBottom: 2 }}>
                              <span style={{ color: cat.color }}>{cat.icon} </span>{task.title}
                              {item.suggestedTime && item.suggestedTime !== "Flexible" && <div style={{ fontSize: 9, color: "#726878" }}>{item.suggestedTime}</div>}
                            </div>
                          );
                        })}
                        {!items.length && !dayFixed.length && <div style={{ fontSize: 10, color: "#c0d8c4" }}>Rest</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={applyAIPlan} style={{ background: "#8aa898", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12, cursor: "pointer" }}>Apply Plan</button>
                  <button onClick={() => setAiSuggestion(null)} style={{ background: "none", border: "1px solid #b4d0bc", color: "#88aa94", padding: "6px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer" }}>Dismiss</button>
                </div>
              </div>
            )}

            {/* ── SCHEDULE sub-view ── */}
            {subView === "schedule" && (
              <>
                {unscheduledTasks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.15em", marginBottom: 5, textTransform: "uppercase" }}>Unscheduled</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {unscheduledTasks.map((task) => {
                        const cat = getCat(task.category);
                        return (
                          <div key={task.id} draggable onDragStart={() => setDragTask(task.id)} style={{ background: "#e9e4db", border: `1px solid ${cat.color}33`, borderLeft: `3px solid ${cat.color}`, borderRadius: 5, padding: "5px 9px", cursor: "grab", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                            <span style={{ color: cat.color }}>{cat.icon}</span>
                            <span style={{ color: "#726860" }}>{task.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(138px, 1fr))", gap: 7 }}>
                  {DAYS.map((day, i) => {
                    const dayTaskIds = getScheduleIds(day);
                    const dayTasks = dayTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
                    dayTasks.sort((a, b) => {
                      const ta = getTaskTime(day, a.id) || "99:99";
                      const tb = getTaskTime(day, b.id) || "99:99";
                      return ta.localeCompare(tb);
                    });
                    const dayFixed = fixedBlocks.filter((b) => b.day === day).sort((a, b) => a.startHour - b.startHour);
                    const isOver = dragOver === day;
                    const isPast = DAYS.indexOf(day) < todayIndex;
                    const isToday = day === todayName;
                    const isFuture = DAYS.indexOf(day) > todayIndex;
                    const dayTotalMins = dayTasks.reduce((s, t) => {
                      if (t.durationType === "single") return s + (t.estimatedMins || 0);
                      if (t.durationType === "multiday") return s + (t.minsPerSession || 0);
                      if (t.durationType === "ongoing") return s + (t.sessionMins || 0);
                      return s;
                    }, 0);
                    return (
                      <div key={day} onDragOver={(e) => { e.preventDefault(); setDragOver(day); }} onDragLeave={() => setDragOver(null)} onDrop={() => onDrop(day)}
                        style={{ background: isOver ? "#ebe6df" : isToday ? "#e8f2ea" : isPast ? "#f0ece8" : "#ece7df", border: `1px solid ${isOver ? "#8aa898" : isToday ? "#a8c4b055" : "#d6d0c8"}`, borderRadius: 9, padding: 9, minHeight: 130, transition: "border-color 0.12s, background 0.12s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 10, letterSpacing: "0.12em", color: isToday ? "#82b99a" : isPast ? "#c0b0a8" : "#726460", fontWeight: isToday ? "bold" : "normal" }}>{SHORT_DAYS[i]}</span>
                            {isToday && <span style={{ fontSize: 7, background: "#82b99a", color: "#fff", borderRadius: 3, padding: "1px 4px", letterSpacing: "0.05em" }}>TODAY</span>}
                            {isPast && <span style={{ fontSize: 8, color: "#c0b0a8" }}>past</span>}
                          </div>
                          {dayTotalMins > 0 && <span style={{ fontSize: 9, color: "#8a7e76" }}>{fmtMins(dayTotalMins)}</span>}
                        </div>
                        {/* Fixed blocks in schedule view */}
                        {dayFixed.map((block) => {
                          const ft = getFixed(block.type);
                          return (
                            <div key={block.id} style={{ background: ft.color + "12", borderLeft: `2px solid ${ft.color}`, borderRadius: 3, padding: "3px 6px", marginBottom: 3, fontSize: 10 }}>
                              <span style={{ color: ft.color }}>{ft.icon} </span>
                              <span style={{ color: "#787880" }}>{block.title}</span>
                              <div style={{ color: "#726870", fontSize: 9 }}>{fmtHour(block.startHour)}</div>
                            </div>
                          );
                        })}
                        {/* Tasks */}
                        {dayTasks.map((task) => {
                          const cat = getCat(task.category);
                          const isBeingDragged = dragTask === task.id;
                          const taskTime = getTaskTime(day, task.id);
                          const overdue = isPast && !task.completed && task.durationType !== "ongoing";
                          return (
                            <div
                              key={task.id}
                              draggable={task.durationType !== "ongoing"}
                              onDragStart={() => { setDragTask(task.id); setDragFromDay(day); }}
                              onDragEnd={() => { setDragTask(null); setDragFromDay(null); setDragOver(null); }}
                              style={{ background: isBeingDragged ? "#e4dfda" : overdue ? "#f5ece8" : "#e9e4db", borderLeft: `2px solid ${task.completed ? "#bcb4aa" : overdue ? "#c89898" : cat.color}`, borderRadius: 3, padding: "4px 6px", marginBottom: 3, cursor: task.durationType !== "ongoing" ? "grab" : "default", opacity: isBeingDragged ? 0.4 : 1, transition: "opacity 0.15s" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                                  {task.durationType === "ongoing" ? <span style={{ color: cat.color, fontSize: 9 }}>↻</span> : <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task.id)} style={{ accentColor: cat.color, cursor: "pointer", width: 10, height: 10 }} />}
                                  {task.priority && <span style={{ fontSize: 10, flexShrink: 0 }}>❗</span>}
                                  {overdue && <span style={{ fontSize: 9, color: "#c89898", flexShrink: 0 }}>⚠</span>}
                                  <span style={{ fontSize: 11, color: task.completed ? "#bcb4aa" : overdue ? "#c89898" : "#847870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                                </div>
                                {task.durationType !== "ongoing" && <button onClick={() => removeFromDay(task.id, day)} style={{ background: "none", border: "none", color: "#bcb4aa", cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>×</button>}
                              </div>
                              {/* Time row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <button onClick={() => setTimePicker({ taskId: task.id, day })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }} title="Set time">
                                  <span style={{ fontSize: 9 }}>🕐</span>
                                  <span style={{ fontSize: 9, color: taskTime ? "#88aa94" : "#cec8c0" }}>{taskTime ? taskTime : "set time"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {dayTasks.length === 0 && dayFixed.length === 0 && <div style={{ fontSize: 10, color: "#5c5244", textAlign: "center", marginTop: 14 }}>Drop here</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── TIMELINE sub-view ── */}
            {subView === "timeline" && (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 700, display: "grid", gridTemplateColumns: `48px repeat(7, 1fr)`, gap: 0 }}>
                  {/* Header */}
                  <div />
                  {DAYS.map((day, i) => {
                    const hasFixed = fixedBlocks.some((b) => b.day === day);
                    return (
                      <div key={day} style={{ padding: "4px 6px", borderBottom: "1px solid #d6d0c8", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: hasFixed ? "#4c4235" : "#726460", letterSpacing: "0.1em" }}>{SHORT_DAYS[i]}</div>
                        {hasFixed && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#c898aa", margin: "2px auto 0" }} />}
                      </div>
                    );
                  })}
                  {/* Time rows */}
                  {timelineHours.map((hour) => (
                    <>
                      <div key={`h${hour}`} style={{ padding: "0 6px", height: hourHeight, display: "flex", alignItems: "flex-start", paddingTop: 4, borderTop: "1px solid #e0dbd2" }}>
                        <span style={{ fontSize: 9, color: "#a29890", whiteSpace: "nowrap" }}>{fmtHour(hour)}</span>
                      </div>
                      {DAYS.map((day) => {
                        const fixedHere = fixedBlocks.filter((b) => b.day === day && b.startHour === hour);
                        const spanning = fixedBlocks.filter((b) => b.day === day && b.startHour < hour && b.endHour > hour);
                        const scheduledHere = hour === 9 ? (schedule[day] || []).map((id) => tasks.find((t) => t.id === id)).filter((t) => t && t.durationType !== "ongoing") : [];

                        return (
                          <div key={`${day}${hour}`} style={{ height: hourHeight, borderTop: "1px solid #e0dbd2", borderLeft: "1px solid #e0dbd2", position: "relative", background: spanning.length ? spanning[0] && getFixed(spanning[0].type).color + "08" : "transparent" }}>
                            {fixedHere.map((block) => {
                              const ft = getFixed(block.type);
                              const h = (block.endHour - block.startHour) * hourHeight;
                              return (
                                <div key={block.id} style={{ position: "absolute", top: 1, left: 2, right: 2, height: h - 2, background: ft.color + "22", border: `1px solid ${ft.color}55`, borderRadius: 4, padding: "3px 5px", overflow: "hidden", zIndex: 2 }}>
                                  <div style={{ fontSize: 10, color: ft.color, fontWeight: "bold" }}>{block.title}</div>
                                  <div style={{ fontSize: 9, color: ft.color + "99" }}>{fmtRange(block.startHour, block.endHour)}</div>
                                </div>
                              );
                            })}
                            {scheduledHere.map((task, ti) => {
                              const cat = getCat(task.category);
                              return (
                                <div key={task.id} style={{ position: "absolute", top: 2 + ti * 14, left: 2, right: 2, background: cat.color + "15", borderLeft: `2px solid ${cat.color}`, borderRadius: 3, padding: "1px 4px", fontSize: 9, color: cat.color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", zIndex: 1 }}>
                                  {task.title}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === "add" && (
          <div style={{ maxWidth: 500 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Task Title</label>
              <input value={newTask.title} onChange={(e) => setField("title", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="What needs doing?" style={inp} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Category</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setField("category", cat.id)} style={{ ...chip(newTask.category === cat.id, cat.color), display: "flex", gap: 5, alignItems: "center" }}>{cat.icon} {cat.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>How long / how often?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {DURATION_TYPES.map((dt) => {
                  const active = newTask.durationType === dt.id;
                  return (
                    <button key={dt.id} onClick={() => setField("durationType", dt.id)} style={{ background: active ? "#e8f2ea" : "#efeae2", border: `1px solid ${active ? "#8aa898" : "#d6d0c8"}`, borderRadius: 8, padding: "9px 13px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, color: active ? "#a8c4b0" : "#cec8c0", minWidth: 22 }}>{dt.icon}</span>
                      <div><div style={{ fontSize: 13, color: active ? "#3c3226" : "#726460" }}>{dt.label}</div><div style={{ fontSize: 11, color: "#a29890" }}>{dt.desc}</div></div>
                    </button>
                  );
                })}
              </div>
            </div>
            {newTask.durationType === "single" && (
              <div style={{ marginBottom: 14, background: "#efeae2", border: "1px solid #d6d0c8", borderRadius: 8, padding: 12 }}>
                <label style={lbl}>How long will it take?</label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 9 }}>
                  {DURATION_PRESETS.map(({ mins, label }) => (
                    <button key={mins} onClick={() => { setField("estimatedMins", mins); setCustomMins(""); }} style={chip(newTask.estimatedMins === mins && !customMins, "#8aa898")}>{label}</button>
                  ))}
                </div>
                <div>
                  <label style={{ ...lbl, marginBottom: 4 }}>Need more time?</label>
                  <select
                    value={customMins || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "0") { setCustomMins(""); }
                      else if (val === "manual") { setCustomMins("manual"); }
                      else { setCustomMins(""); setField("estimatedMins", parseInt(val)); }
                    }}
                    style={{ ...inp, width: "100%", appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">Select a longer duration…</option>
                    {CUSTOM_DURATION_OPTIONS.filter(o => o.mins > 0).map(({ mins, label }) => (
                      <option key={mins} value={mins}>{label}</option>
                    ))}
                    <option value="manual">Enter custom minutes manually</option>
                  </select>
                  {customMins === "manual" && (
                    <input
                      autoFocus
                      placeholder="Type minutes e.g. 200"
                      style={{ ...inp, marginTop: 7 }}
                      onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setField("estimatedMins", v); }}
                    />
                  )}
                  {newTask.estimatedMins > 180 && !customMins && (
                    <div style={{ fontSize: 11, color: "#88aa94", marginTop: 5 }}>Selected: {fmtMins(newTask.estimatedMins)}</div>
                  )}
                </div>
              </div>
            )}
            {newTask.durationType === "multiday" && (
              <div style={{ marginBottom: 14, background: "#efeae2", border: "1px solid #d6d0c8", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                  <div>
                    <label style={lbl}>Total sessions</label>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
                      {[3, 5, 7, 10, 14].map((n) => <button key={n} onClick={() => setField("totalSessions", n)} style={chip(newTask.totalSessions === n, "#8aa898")}>{n}</button>)}
                    </div>
                    <input value={newTask.totalSessions} onChange={(e) => setField("totalSessions", parseInt(e.target.value) || 1)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Mins per session</label>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {DURATION_PRESETS.map(({ mins, label }) => (
                        <button key={mins} onClick={() => setField("minsPerSession", mins)} style={chip(newTask.minsPerSession === mins, "#8aa898")}>{label}</button>
                      ))}
                    </div>
                    <select
                      value={newTask.minsPerSession > 180 ? newTask.minsPerSession : ""}
                      onChange={(e) => { if (e.target.value) setField("minsPerSession", parseInt(e.target.value)); }}
                      style={{ ...inp, appearance: "none", fontSize: 12 }}
                    >
                      <option value="">Longer session…</option>
                      {CUSTOM_DURATION_OPTIONS.filter(o => o.mins > 0).map(({ mins, label }) => (
                        <option key={mins} value={mins}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#726460", background: "#e9e4db", padding: "6px 9px", borderRadius: 5 }}>~{((newTask.totalSessions * newTask.minsPerSession) / 60).toFixed(1)} hours total across {newTask.totalSessions} sessions</div>
              </div>
            )}
            {newTask.durationType === "ongoing" && (
              <div style={{ marginBottom: 14, background: "#efeae2", border: "1px solid #d6d0c8", borderRadius: 8, padding: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={lbl}>Repeat schedule</label>
                  <div style={{ display: "flex", gap: 5 }}>
                    {RECUR_OPTIONS.map((r) => <button key={r.id} onClick={() => setField("recurType", r.id)} style={chip(newTask.recurType === r.id, "#8aa898")}>{r.label}</button>)}
                  </div>
                </div>
                {newTask.recurType === "custom" && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={lbl}>Which days</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {DAYS.map((day) => { const on = (newTask.recurDays || []).includes(day); return <button key={day} onClick={() => setField("recurDays", on ? newTask.recurDays.filter((d) => d !== day) : [...(newTask.recurDays || []), day])} style={chip(on, "#8aa898")}>{day.slice(0, 3)}</button>; })}
                    </div>
                  </div>
                )}
                <div>
                  <label style={lbl}>Session length</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {DURATION_PRESETS.map(({ mins, label }) => (
                      <button key={mins} onClick={() => setField("sessionMins", mins)} style={chip(newTask.sessionMins === mins, "#8aa898")}>{label}</button>
                    ))}
                  </div>
                  <select
                    value={newTask.sessionMins > 180 ? newTask.sessionMins : ""}
                    onChange={(e) => { if (e.target.value) setField("sessionMins", parseInt(e.target.value)); }}
                    style={{ ...inp, appearance: "none", fontSize: 12 }}
                  >
                    <option value="">Longer session…</option>
                    {CUSTOM_DURATION_OPTIONS.filter(o => o.mins > 0).map(({ mins, label }) => (
                      <option key={mins} value={mins}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Priority</label>
              <button
                onClick={() => setField("priority", !newTask.priority)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: newTask.priority ? "#fdf0e6" : "#efeae2", border: `1px solid ${newTask.priority ? "#c89898" : "#d6d0c8"}`, borderRadius: 8, padding: "9px 14px", cursor: "pointer", width: "100%" }}
              >
                <span style={{ fontSize: 16 }}>{newTask.priority ? "❗" : "○"}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, color: newTask.priority ? "#c89898" : "#726460" }}>{newTask.priority ? "High Priority" : "Normal Priority"}</div>
                  <div style={{ fontSize: 11, color: "#a29890" }}>{newTask.priority ? "Shows ! on calendar to draw attention" : "Click to mark as high priority"}</div>
                </div>
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Notes (optional)</label>
              <textarea value={newTask.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Page numbers, links, context…" rows={2} style={{ ...inp, resize: "vertical" }} />
            </div>
            <button onClick={addTask} disabled={!newTask.title.trim()} style={{ background: newTask.title.trim() ? "linear-gradient(135deg,#8aa898,#a8c4b0)" : "#d6d0c8", border: "none", color: "#fff", padding: "11px 24px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Add Task →</button>
          </div>
        )}

        {/* ── ALL TASKS ── */}
        {view === "tasks" && (
          <div>
            {tasks.length === 0 && <div style={{ textAlign: "center", padding: "50px 0", color: "#cec8c0" }}><div style={{ fontSize: 28, marginBottom: 8 }}>◇</div><div style={{ fontSize: 13 }}>No tasks yet.</div></div>}
            {CATEGORIES.map((cat) => {
              const catTasks = tasks.filter((t) => t.category === cat.id);
              if (!catTasks.length) return null;
              return (
                <div key={cat.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", color: cat.color, textTransform: "uppercase", marginBottom: 7 }}>{cat.icon} {cat.label}</div>
                  {catTasks.map((task) => {
                    const dt = getDurType(task.durationType);
                    const isExp = expandedTask === task.id;
                    const isEditing = editingTask === task.id;
                    const progress = task.durationType === "multiday" ? Math.round(((task.completedSessions || 0) / task.totalSessions) * 100) : null;
                    return (
                      <div key={task.id} style={{ background: isEditing ? "#eee9e2" : "#efeae2", border: `1px solid ${isEditing ? "#8aa898" : "#d6d0c8"}`, borderLeft: `3px solid ${task.completed ? "#cec8c0" : cat.color}`, borderRadius: 8, marginBottom: 5, overflow: "hidden" }}>

                        {/* ── Edit form ── */}
                        {isEditing && editForm && (
                          <div style={{ padding: "14px 14px 12px" }}>
                            <div style={{ fontSize: 10, color: "#8aa898", letterSpacing: "0.15em", marginBottom: 12, textTransform: "uppercase" }}>Editing Task</div>

                            <div style={{ marginBottom: 10 }}>
                              <label style={lbl}>Title</label>
                              <input value={editForm.title} onChange={(e) => setEditField("title", e.target.value)} style={inp} autoFocus />
                            </div>

                            <div style={{ marginBottom: 10 }}>
                              <label style={lbl}>Category</label>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {CATEGORIES.map((c) => (
                                  <button key={c.id} onClick={() => setEditField("category", c.id)} style={{ ...chip(editForm.category === c.id, c.color), display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>{c.icon} {c.label}</button>
                                ))}
                              </div>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                              <label style={lbl}>Priority</label>
                              <button onClick={() => setEditField("priority", !editForm.priority)} style={{ display: "flex", alignItems: "center", gap: 7, background: editForm.priority ? "#fdf0e6" : "#efeae2", border: `1px solid ${editForm.priority ? "#c89898" : "#cec8c0"}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}>
                                <span>{editForm.priority ? "❗" : "○"}</span>
                                <span style={{ fontSize: 12, color: editForm.priority ? "#c89898" : "#726460" }}>{editForm.priority ? "High Priority" : "Normal — click to mark high priority"}</span>
                              </button>
                            </div>

                            {editForm.durationType === "single" && (
                              <div style={{ marginBottom: 10 }}>
                                <label style={lbl}>Estimated Time</label>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 7 }}>
                                  {DURATION_PRESETS.map(({ mins, label }) => (
                                    <button key={mins} onClick={() => { setEditField("estimatedMins", mins); setEditCustomMins(""); }} style={chip(editForm.estimatedMins === mins && !editCustomMins, "#8aa898")}>{label}</button>
                                  ))}
                                </div>
                                <select value={editForm.estimatedMins > 180 && !editCustomMins ? editForm.estimatedMins : ""} onChange={(e) => { setEditCustomMins(""); setEditField("estimatedMins", parseInt(e.target.value)); }} style={{ ...inp, appearance: "none", fontSize: 12, marginBottom: 5 }}>
                                  <option value="">Longer duration…</option>
                                  {CUSTOM_DURATION_OPTIONS.filter(o => o.mins > 0).map(({ mins, label }) => <option key={mins} value={mins}>{label}</option>)}
                                </select>
                              </div>
                            )}

                            {editForm.durationType === "multiday" && (
                              <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                  <label style={lbl}>Total Sessions</label>
                                  <input type="number" value={editForm.totalSessions} min={1} onChange={(e) => setEditField("totalSessions", parseInt(e.target.value) || 1)} style={inp} />
                                </div>
                                <div>
                                  <label style={lbl}>Mins Per Session</label>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {[15, 30, 45, 60].map((m) => <button key={m} onClick={() => setEditField("minsPerSession", m)} style={chip(editForm.minsPerSession === m, "#8aa898")}>{m}m</button>)}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div style={{ marginBottom: 12 }}>
                              <label style={lbl}>Notes</label>
                              <textarea value={editForm.notes || ""} onChange={(e) => setEditField("notes", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Any notes…" />
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={saveEdit} style={{ background: "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Save Changes</button>
                              <button onClick={cancelEdit} style={{ background: "none", border: "1px solid #cec8c0", color: "#726460", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* ── Normal task row ── */}
                        {!isEditing && (
                          <div style={{ padding: "9px 12px", display: "flex", gap: 9 }}>
                            {task.durationType !== "ongoing" ? <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task.id)} style={{ accentColor: cat.color, marginTop: 3, cursor: "pointer" }} /> : <span style={{ color: cat.color, fontSize: 13, marginTop: 1 }}>↻</span>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                                  {task.priority && <span style={{ fontSize: 13, flexShrink: 0 }}>❗</span>}
                                  <span style={{ fontSize: 13, color: task.completed ? "#a29890" : "#4c4235", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                  <span style={{ fontSize: 10, color: "#a29890", background: "#e9e4db", padding: "1px 5px", borderRadius: 3 }}>{dt.icon}</span>
                                  <button onClick={() => startEditing(task)} title="Edit task" style={{ background: "none", border: "none", color: "#8a7e76", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>✎</button>
                                  <button onClick={() => setExpandedTask(isExp ? null : task.id)} style={{ background: "none", border: "none", color: "#8a7e76", cursor: "pointer", fontSize: 11, padding: 0 }}>{isExp ? "▲" : "▼"}</button>
                                  <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#cec8c0", cursor: "pointer", fontSize: 15, padding: 0 }}>×</button>
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: "#8a7e76", marginTop: 2 }}>{getDurationLabel(task)}</div>
                              {task.durationType === "multiday" && (
                                <div style={{ marginTop: 7 }}>
                                  <div style={{ height: 3, background: "#d6d0c8", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${cat.color}88,${cat.color})`, transition: "width 0.3s" }} />
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{ fontSize: 11, color: "#726460" }}>{task.completedSessions || 0}/{task.totalSessions} · {progress}%</span>
                                    <button onClick={() => decrementSession(task.id)} style={{ border: "1px solid #cec8c0", background: "none", color: "#726460", width: 18, height: 18, borderRadius: 3, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
                                    <button onClick={() => incrementSession(task.id)} style={{ border: `1px solid ${cat.color}55`, background: cat.color + "15", color: cat.color, width: 18, height: 18, borderRadius: 3, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── Expanded assign section ── */}
                        {isExp && !isEditing && (
                          <div style={{ borderTop: "1px solid #d6d0c8", padding: "9px 12px", background: "#ece7df" }}>
                            {task.notes && <p style={{ margin: "0 0 7px", fontSize: 12, color: "#726460" }}>{task.notes}</p>}
                            <div style={{ fontSize: 10, color: "#a29890", marginBottom: 5, letterSpacing: "0.1em" }}>ASSIGN TO DAYS</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {DAYS.map((day) => { const on = getScheduleIds(day).includes(task.id); return <button key={day} onClick={() => assignToDay(task.id, day)} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 4, border: `1px solid ${on ? cat.color + "55" : "#d6d0c8"}`, background: on ? cat.color + "12" : "none", color: on ? cat.color : "#a29890", cursor: "pointer" }}>{day.slice(0, 3)}</button>; })}
                              {task.durationType === "ongoing" && <button onClick={() => autoAssignOngoing(task)} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, border: "1px solid #8aa89844", background: "#e6f0e8", color: "#a8c4b0", cursor: "pointer" }}>↻ Auto-assign</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Time Picker Modal ── */}
      <TimePickerModal
        timePicker={timePicker}
        tasks={tasks}
        workHours={workHours}
        fixedBlocks={fixedBlocks}
        getTaskTime={getTaskTime}
        setTaskTime={setTaskTime}
        setTimePicker={setTimePicker}
        showToast={showToast}
      />

      {toast && <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#e6f0e8", border: "1px solid #8aa898", color: "#a8c4b0", padding: "8px 16px", borderRadius: 7, fontSize: 12, zIndex: 100 }}>{toast}</div>}
    </div>
  );
}
