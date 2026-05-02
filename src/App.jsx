import { useState, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h) => `${h === 0 ? "12" : h > 12 ? h - 12 : h}:00 ${h < 12 ? "AM" : "PM"}`;
const fmtRange = (s, e) => `${fmtHour(s)} – ${fmtHour(e)}`;

const CATEGORIES = [
  { id: "training", label: "Training", color: "#82b99a", icon: "■" },
  { id: "review", label: "Review / Audit", color: "#b8a4c8", icon: "▲" },
  { id: "task", label: "Task", color: "#c89898", icon: "●" },
  { id: "meeting", label: "Meeting", color: "#d4a0b0", icon: "◆" },
  { id: "admin", label: "Admin", color: "#c8be90", icon: "▬" },
  { id: "reading", label: "Reading / Study", color: "#7aaec8", icon: "○" },
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
  title: "", category: "task", notes: "", priority: false, deadline: "",
  durationType: "single", estimatedMins: 30,
  totalSessions: 5, minsPerSession: 30,
  recurType: "freq", recurFreq: 3, recurDays: [], sessionMins: 30,
  recurEnd: "",
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

function TaskPopup({ taskPopup, tasks, schedule, getTaskTime, toggleComplete, removeFromDay, assignToDay, togglePin, startEditing, setTaskPopup, getCat, getDurType, getDurationLabel, fmtMins, getDeadlineStatus, saveWeekSchedule, weekOffset, showToast, setTimePicker }) {
  if (!taskPopup) return null;
  const task = tasks.find((t) => t.id === taskPopup.taskId);
  if (!task) return null;
  const cat = getCat(task.category);
  const dt = getDurType(task.durationType);
  const taskTime = getTaskTime(taskPopup.day, task.id);
  const progress = task.durationType === "multiday" ? Math.round(((task.completedSessions || 0) / task.totalSessions) * 100) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setTaskPopup(null)}>
      <div style={{ background: "#f4f0e8", border: `2px solid ${cat.color}`, borderRadius: 14, padding: 20, width: 300, maxWidth: "90vw", boxShadow: "0 8px 32px #00000022" }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <CatIcon icon={cat.icon} color={cat.color} size={14} />
              {task.priority && <span style={{ fontSize: 13 }}>❗</span>}
              <span style={{ fontSize: 9, color: cat.color, background: cat.color + "18", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.08em" }}>{cat.label}</span>
            </div>
            <div style={{ fontSize: 16, color: task.completed ? "#a09890" : "#3c3226", lineHeight: 1.3, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
          </div>
          <button onClick={() => setTaskPopup(null)} style={{ background: "none", border: "none", color: "#a09890", cursor: "pointer", fontSize: 18, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
        </div>

        {/* Details */}
        <div style={{ background: "#ece7df", borderRadius: 8, padding: "10px 12px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#8a7e76" }}>Type</span>
            <span style={{ fontSize: 11, color: "#4c4235" }}>{dt.icon} {dt.label}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#8a7e76" }}>Duration</span>
            <span style={{ fontSize: 11, color: "#4c4235" }}>{getDurationLabel(task)}</span>
          </div>
          {taskTime && (() => {
            // Calculate end time from start time + duration
            const [hStr, mStr] = taskTime.split(":");
            const startMins = parseInt(hStr) * 60 + parseInt(mStr || 0);
            const durMins = task.durationType === "single" ? (task.estimatedMins || 30)
              : task.durationType === "multiday" ? (task.minsPerSession || 30)
              : (task.sessionMins || 30);
            const endMins = startMins + durMins;
            const endH = Math.floor(endMins / 60);
            const endM = endMins % 60;
            const endTime = `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`;
            return (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#8a7e76" }}>Scheduled</span>
                <span style={{ fontSize: 11, color: "#82b99a" }}>🕐 {taskTime} – {endTime}</span>
              </div>
            );
          })()}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#8a7e76" }}>Day</span>
            <span style={{ fontSize: 11, color: "#4c4235" }}>{taskPopup.day}</span>
          </div>
          {task.deadline && !task.completed && (() => {
            const ds = getDeadlineStatus(task.deadline);
            return (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#8a7e76" }}>Deadline</span>
                <span style={{ fontSize: 11, color: ds.color, fontWeight: ds.urgent ? "bold" : "normal" }}>📅 {ds.label}</span>
              </div>
            );
          })()}
        </div>

        {/* Progress bar for multi-day */}
        {task.durationType === "multiday" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#8a7e76" }}>Progress</span>
              <span style={{ fontSize: 11, color: "#4c4235" }}>{task.completedSessions || 0}/{task.totalSessions} sessions · {progress}%</span>
            </div>
            <div style={{ height: 6, background: "#d6d0c8", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${cat.color}88, ${cat.color})`, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div style={{ background: "#ece7df", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#6c6255", lineHeight: 1.5 }}>
            {task.notes}
          </div>
        )}

        {/* Ongoing task — show all days and their times */}
        {task.durationType === "ongoing" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Times per day</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {DAYS.map((d) => {
                const ids = (schedule[d] || []).map(e => typeof e === "object" ? e.id : e);
                if (!ids.includes(task.id)) return null;
                const t = getTaskTime(d, task.id);
                const isThisDay = d === taskPopup.day;
                return (
                  <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isThisDay ? cat.color + "12" : "#ece7df", borderRadius: 6, padding: "6px 10px", border: isThisDay ? `1px solid ${cat.color}44` : "1px solid transparent" }}>
                    <span style={{ fontSize: 12, color: isThisDay ? cat.color : "#4c4235", fontWeight: isThisDay ? "bold" : "normal" }}>{d}</span>
                    <button
                      onClick={() => { setTaskPopup(null); setTimeout(() => setTimePicker({ taskId: task.id, day: d }), 100); }}
                      style={{ background: "none", border: `1px solid ${t ? cat.color + "55" : "#d6d0c8"}`, color: t ? cat.color : "#a09890", borderRadius: 5, padding: "3px 9px", fontSize: 11, cursor: "pointer" }}
                    >{t ? `🕐 ${t}` : "Set time"}</button>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* Move to day — non-ongoing only */}
        {task.durationType !== "ongoing" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>Move to</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {DAYS.map((d) => {
                const isCurrentDay = d === taskPopup.day;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (!isCurrentDay) {
                        // Atomic move — remove from old day and add to new day in one operation
                        const existingTime = getTaskTime(taskPopup.day, task.id);
                        const updated = { ...schedule };
                        // Remove from current day
                        updated[taskPopup.day] = (updated[taskPopup.day] || []).filter(e => (typeof e === "object" ? e.id : e) !== task.id);
                        // Add to new day (only if not already there)
                        const destEntries = updated[d] || [];
                        const destIds = destEntries.map(e => typeof e === "object" ? e.id : e);
                        if (!destIds.includes(task.id)) {
                          updated[d] = [...destEntries, { id: task.id, time: existingTime }];
                        }
                        saveWeekSchedule(weekOffset, updated);
                        showToast(`Moved to ${d}`);
                        setTaskPopup(null);
                      }
                    }}
                    style={{ background: isCurrentDay ? cat.color + "20" : "#ece7df", border: `1px solid ${isCurrentDay ? cat.color : "#d6d0c8"}`, color: isCurrentDay ? cat.color : "#6c6255", padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: isCurrentDay ? "default" : "pointer", fontWeight: isCurrentDay ? "bold" : "normal" }}
                  >{d.slice(0, 3)}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => { toggleComplete(task.id); setTaskPopup(null); }}
            style={{ background: task.completed ? "#e9e4db" : cat.color + "20", border: `1px solid ${task.completed ? "#d6d0c8" : cat.color}`, color: task.completed ? "#8a7e76" : cat.color, padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", flex: 1 }}
          >{task.completed ? "Mark Incomplete" : "✓ Mark Complete"}</button>
          <button
            onClick={() => { setTaskPopup(null); startEditing(task); }}
            style={{ background: "none", border: "1px solid #d6d0c8", color: "#6c6255", padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}
          >✎ Edit</button>
          <button
            onClick={() => { togglePin(task.id); setTaskPopup(null); showToast(task.pinned ? "Unpinned" : "📌 Pinned!"); }}
            style={{ background: task.pinned ? "#fdf0e6" : "none", border: `1px solid ${task.pinned ? "#d4a5a5" : "#d6d0c8"}`, color: task.pinned ? "#c89898" : "#6c6255", padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}
          >{task.pinned ? "📌 Unpin" : "📌 Pin"}</button>
        </div>

        {task.durationType !== "ongoing" && (
          <button
            onClick={() => { removeFromDay(task.id, taskPopup.day); setTaskPopup(null); }}
            style={{ background: "none", border: "none", color: "#c89898", fontSize: 11, cursor: "pointer", marginTop: 10, width: "100%", textAlign: "center" }}
          >Remove from {taskPopup.day}</button>
        )}
      </div>
    </div>
  );
}

function DailyDashboard({ todayName, tasks, schedule, fixedBlocks, setFocusDay, setFocusWeekOffset, setFocusMode }) {
  const todayIds = (schedule[todayName] || []).map(e => typeof e === "object" ? e.id : e);
  const todayTasks = todayIds.map(id => tasks.find(t => t.id === id)).filter(t => t && t.durationType !== "ongoing");
  const todayDone = todayTasks.filter(t => t.completed).length;
  const todayRemaining = todayTasks.length - todayDone;
  const todayMins = todayTasks.reduce((s, t) => s + (t.durationType === "single" ? (t.estimatedMins || 0) : (t.minsPerSession || 0)), 0);
  const todayPct = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;
  const todayFixed = fixedBlocks.filter(b => b.day === todayName);
  const todayFixedMins = todayFixed.reduce((s, b) => s + (b.endHour - b.startHour) * 60, 0);

  return (
    <div style={{ background: "#e8f2ea", border: "1px solid #a8c4b044", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#82b99a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: "bold" }}>Today — {todayName}</div>
        <button onClick={() => { setFocusDay(todayName); setFocusWeekOffset(0); setFocusMode(true); }} style={{ background: "none", border: "1px solid #a8c4b0", color: "#82b99a", borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer" }}>◉ Focus</button>
      </div>
      <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "4px 8px", borderRight: "1px solid #a8c4b044" }}>
          <div style={{ fontSize: 20, color: "#82b99a" }}>{todayDone}</div>
          <div style={{ fontSize: 9, color: "#82b99a", letterSpacing: "0.1em", textTransform: "uppercase" }}>Done</div>
        </div>
        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "4px 8px", borderRight: "1px solid #a8c4b044" }}>
          <div style={{ fontSize: 20, color: todayRemaining > 0 ? "#c8be90" : "#82b99a" }}>{todayRemaining}</div>
          <div style={{ fontSize: 9, color: "#8a9e8a", letterSpacing: "0.1em", textTransform: "uppercase" }}>Left</div>
        </div>
        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "4px 8px", borderRight: "1px solid #a8c4b044" }}>
          <div style={{ fontSize: 20, color: "#7aaec8" }}>{Math.round(todayMins / 60 * 10) / 10}h</div>
          <div style={{ fontSize: 9, color: "#8a9e8a", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tasks</div>
        </div>
        {todayFixed.length > 0 && (
          <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "4px 8px", borderRight: "1px solid #a8c4b044" }}>
            <div style={{ fontSize: 20, color: "#d4a0b0" }}>{Math.round(todayFixedMins / 60 * 10) / 10}h</div>
            <div style={{ fontSize: 9, color: "#8a9e8a", letterSpacing: "0.1em", textTransform: "uppercase" }}>Meetings</div>
          </div>
        )}
        <div style={{ flex: 2, minWidth: 120, padding: "4px 8px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, color: "#82b99a" }}>Today's progress</span>
            <span style={{ fontSize: 9, color: "#82b99a" }}>{todayPct}%</span>
          </div>
          <div style={{ height: 5, background: "#a8c4b033", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${todayPct}%`, background: "linear-gradient(90deg, #82b99a, #a8c4b0)", borderRadius: 3, transition: "width 0.4s" }} />
          </div>
          {todayDone > 0 && todayRemaining === 0 && <div style={{ fontSize: 9, color: "#82b99a", textAlign: "center" }}>✓ All done for today!</div>}
          {todayTasks.length === 0 && <div style={{ fontSize: 9, color: "#8a9e8a", textAlign: "center" }}>Nothing scheduled today</div>}
        </div>
      </div>
    </div>
  );
}

// Consistent category icon — fixed size regardless of unicode shape
function CatIcon({ icon, color, size = 10 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, fontSize: size, lineHeight: 1,
      color: color, flexShrink: 0, fontStyle: "normal"
    }}>{icon}</span>
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
  const [weekOffset, setWeekOffset] = useState(0);
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
  const [showCarryOverPanel, setShowCarryOverPanel] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [taskPopup, setTaskPopup] = useState(null);
  // New features
  const [focusMode, setFocusMode] = useState(false);
  const [focusDay, setFocusDay] = useState(null); // null = today
  const [focusWeekOffset, setFocusWeekOffset] = useState(0); // which week focus mode is viewing
  const [showDayReview, setShowDayReview] = useState(false);
  const [quickAddDay, setQuickAddDay] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [showCopyWeek, setShowCopyWeek] = useState(false);
  const [categoryLabels, setCategoryLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_catlabels") || "null") || {}; } catch { return {}; }
  });
  const [editingCatLabels, setEditingCatLabels] = useState(false);

  // Track which day of the week we're currently on (0=Mon … 6=Sun)
  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const todayName = DAYS[todayIndex];

  // Week key — "week-0" for this week, "week-1" for next, etc.
  const weekKey = (offset) => `week-${offset}`;
  const currentWeekKey = weekKey(weekOffset);

  // Get the Monday date for a given week offset
  const getWeekMonday = (offset) => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday of this week
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + offset * 7);
    return monday;
  };

  // Get actual date for a given day in a given week offset
  const getDayDate = (dayName, offset) => {
    const monday = getWeekMonday(offset);
    const dayIdx = DAYS.indexOf(dayName);
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIdx);
    return date;
  };

  // Format date as "Mon 5" style
  const fmtDayDate = (dayName, offset) => {
    const date = getDayDate(dayName, offset);
    return date.getDate();
  };

  // Week label eg "5 May – 11 May"
  const weekLabel = (offset) => {
    const monday = getWeekMonday(offset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  };

  // Schedule entries are {id, time} objects — stored per week key
  const getWeekSchedule = (offset) => {
    const key = weekKey(offset);
    try { return JSON.parse(localStorage.getItem(`planner_sched_${key}`) || "{}"); } catch { return {}; }
  };

  // For current week — use schedule state; for others read from localStorage
  const activeSchedule = weekOffset === 0 ? schedule : getWeekSchedule(weekOffset);

  const saveWeekSchedule = (offset, data) => {
    if (offset === 0) {
      setSchedule(data);
    } else {
      localStorage.setItem(`planner_sched_${weekKey(offset)}`, JSON.stringify(data));
    }
  };

  // Schedule entries are {id, time} objects. time is "HH:MM" or null.
  const getScheduleIds = (day) => (activeSchedule[day] || []).map((e) => (typeof e === "object" ? e.id : e));
  const getTaskTime = (day, taskId) => { const e = (activeSchedule[day] || []).find((e) => (typeof e === "object" ? e.id : e) === taskId); return e?.time || null; };
  const setTaskTime = (day, taskId, time) => {
    const updated = { ...activeSchedule, [day]: (activeSchedule[day] || []).map((e) => { const id = typeof e === "object" ? e.id : e; return id === taskId ? { id, time } : e; }) };
    saveWeekSchedule(weekOffset, updated);
  };

  // Overdue: task was scheduled on a past day this week and is not completed
  const isOverdue = (taskId) => {
    // Only overdue if scheduled in a PAST DAY of THIS week (weekOffset 0)
    // Never flag tasks from other weeks
    const thisWeekIds = (day) => (schedule[day] || []).map((e) => typeof e === "object" ? e.id : e);
    return DAYS.slice(0, todayIndex).some((day) => thisWeekIds(day).includes(taskId)) &&
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
  useEffect(() => { localStorage.setItem("planner_catlabels", JSON.stringify(categoryLabels)); }, [categoryLabels]);

  // Get display label for a category (respects renames)
  const getCatLabel = (id) => categoryLabels[id] || CATEGORIES.find(c => c.id === id)?.label || id;

  // Deadline status helpers
  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const dl = new Date(deadline); dl.setHours(0,0,0,0);
    const diffDays = Math.round((dl - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Overdue", color: "#c87878", urgent: true };
    if (diffDays === 0) return { label: "Due today", color: "#c89898", urgent: true };
    if (diffDays === 1) return { label: "Due tomorrow", color: "#c8be90", urgent: true };
    if (diffDays <= 7) return { label: `Due in ${diffDays} days`, color: "#c8be90", urgent: false };
    return { label: `Due ${dl.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, color: "#a09890", urgent: false };
  };

  // Quick add task to a specific day
  const quickAddTask = (day, title) => {
    if (!title.trim()) return;
    const task = { id: Date.now(), title: title.trim(), category: "task", notes: "", priority: false, durationType: "single", estimatedMins: 30, totalSessions: 5, minsPerSession: 30, recurType: "weekdays", recurDays: [], sessionMins: 30, completedSessions: 0, completed: false, createdAt: new Date().toISOString() };
    setTasks(p => [...p, task]);
    const updated = { ...activeSchedule, [day]: [...(activeSchedule[day] || []), { id: task.id, time: null }] };
    saveWeekSchedule(weekOffset, updated);
    setQuickAddDay(null);
    setQuickAddTitle("");
    showToast(`Added to ${day}!`);
  };

  // Copy current week schedule to another week
  const copyWeekTo = (targetOffset) => {
    localStorage.setItem(`planner_sched_week-${targetOffset}`, JSON.stringify(activeSchedule));
    showToast(`Copied to ${targetOffset === 1 ? "next week" : `week +${targetOffset}`}!`);
    setShowCopyWeek(false);
  };

  // Pin/unpin a task
  const togglePin = (taskId) => {
    setTasks(p => p.map(t => t.id === taskId ? { ...t, pinned: !t.pinned } : t));
  };

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
      const d = task.recurType === "daily" ? "Daily"
        : task.recurType === "weekdays" ? "Weekdays"
        : task.recurType === "freq" ? `${task.recurFreq || 3}x per week`
        : (task.recurDays || []).map((x) => x.slice(0, 3)).join(", ");
      const endStr = task.recurEnd ? ` · ends ${new Date(task.recurEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : " · ongoing";
      return `${d} · ${fmtMins(task.sessionMins)}/session${endStr}`;
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
      // Calculate target days for freq type
      let targetDays = [];
      if (task.recurType === "freq") {
        const freq = task.recurFreq || 3;
        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        if (freq === 1) targetDays = ["Wednesday"];
        else if (freq >= 5) targetDays = weekdays;
        else {
          const step = (weekdays.length - 1) / (freq - 1);
          targetDays = Array.from({ length: freq }, (_, i) => weekdays[Math.round(i * step)]);
        }
      }
      DAYS.forEach((day, i) => {
        const ok = task.recurType === "daily" ||
          (task.recurType === "weekdays" && i < 5) ||
          (task.recurType === "freq" && targetDays.includes(day)) ||
          (task.recurType === "custom" && (task.recurDays || []).includes(day));
        if (ok) s[day] = [...new Set([...(s[day] || []), { id: task.id, time: null }])];
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

  const assignToDay = (taskId, day, time = null) => {
    const entries = activeSchedule[day] || [];
    const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
    let updated;
    if (ids.includes(taskId)) {
      updated = { ...activeSchedule, [day]: entries.filter((e) => (typeof e === "object" ? e.id : e) !== taskId) };
    } else {
      updated = { ...activeSchedule, [day]: [...entries, { id: taskId, time }] };
    }
    saveWeekSchedule(weekOffset, updated);
  };

  const removeFromDay = (taskId, day) => {
    const updated = { ...activeSchedule, [day]: (activeSchedule[day] || []).filter((e) => (typeof e === "object" ? e.id : e) !== taskId) };
    saveWeekSchedule(weekOffset, updated);
  };

  // Re-flow all task times on a day sequentially after a drop
  // The dropped task takes the first available slot, others follow in order
  const reFlowDayTimes = (day, scheduleSnapshot, droppedTaskId) => {
    const entries = scheduleSnapshot[day] || [];
    const workStart = (workHours[day]?.start ?? 9) * 60;
    const workEnd = (workHours[day]?.end ?? 17) * 60;
    const fixedSlots = fixedBlocks.filter(b => b.day === day).map(b => ({
      start: b.startHour * 60 - 15,
      end: b.endHour * 60 + 15
    }));

    // Sort: dropped task first, then others by existing time, then no-time ones
    const getTaskDur = (t) => t.durationType === "single" ? (t.estimatedMins || 30)
      : t.durationType === "multiday" ? (t.minsPerSession || 30)
      : (t.sessionMins || 30);

    const sorted = [...entries].sort((a, b) => {
      const aId = typeof a === "object" ? a.id : a;
      const bId = typeof b === "object" ? b.id : b;
      if (aId === droppedTaskId) return -1;
      if (bId === droppedTaskId) return 1;
      const aTime = typeof a === "object" ? a.time : null;
      const bTime = typeof b === "object" ? b.time : null;
      if (aTime && bTime) return aTime.localeCompare(bTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    });

    let cursor = workStart;
    const newEntries = sorted.map(e => {
      const id = typeof e === "object" ? e.id : e;
      const task = tasks.find(t => t.id === id);
      if (!task || task.durationType === "ongoing") return e; // don't touch ongoing

      const dur = getTaskDur(task);

      // Advance cursor past any fixed blocks
      let placed = false;
      let attempts = 0;
      while (!placed && cursor + dur <= workEnd && attempts < 100) {
        const end = cursor + dur;
        const blocked = fixedSlots.some(f => cursor < f.end && end > f.start);
        if (!blocked) { placed = true; break; }
        cursor = fixedSlots.find(f => cursor < f.end && end > f.start)?.end ?? cursor + 15;
        attempts++;
      }

      if (!placed || cursor + dur > workEnd) return { id, time: null };

      const h = Math.floor(cursor / 60);
      const m = cursor % 60;
      const time24 = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
      cursor += dur;
      return { id, time: time24 };
    });

    return { ...scheduleSnapshot, [day]: newEntries };
  };

  const onDrop = (toDay) => {
    if (!dragTask) return;
    const task = tasks.find(t => t.id === dragTask);
    const durMins = task ? (task.durationType === "single" ? (task.estimatedMins || 30)
      : task.durationType === "multiday" ? (task.minsPerSession || 30)
      : (task.sessionMins || 30)) : 30;

    if (dragFromDay && dragFromDay !== toDay) {
      let updated = { ...activeSchedule };
      // Remove from old day and re-flow that day
      updated[dragFromDay] = (updated[dragFromDay] || []).filter((e) => (typeof e === "object" ? e.id : e) !== dragTask);
      updated = reFlowDayTimes(dragFromDay, updated, null);

      // Add to new day
      const toEntries = updated[toDay] || [];
      const toIds = toEntries.map((e) => (typeof e === "object" ? e.id : e));
      if (!toIds.includes(dragTask)) {
        updated[toDay] = [...toEntries, { id: dragTask, time: null }];
        // Re-flow new day — dropped task goes first, others shift down
        updated = reFlowDayTimes(toDay, updated, dragTask);
        const newTime = (updated[toDay] || []).find(e => (typeof e === "object" ? e.id : e) === dragTask)?.time;
        saveWeekSchedule(weekOffset, updated);
        showToast(newTime ? `Moved to ${toDay} at ${newTime}` : `Moved to ${toDay}`);
      }
    } else if (!dragFromDay) {
      let updated = { ...activeSchedule };
      const entries = updated[toDay] || [];
      const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
      if (!ids.includes(dragTask)) {
        updated[toDay] = [...entries, { id: dragTask, time: null }];
        updated = reFlowDayTimes(toDay, updated, dragTask);
        saveWeekSchedule(weekOffset, updated);
      }
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
    const s = { ...activeSchedule };

    // For freq type — pick evenly spread weekdays
    let targetDays = [];
    if (task.recurType === "freq") {
      const freq = task.recurFreq || 3;
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      // Spread evenly — e.g. 3x = Mon, Wed, Fri; 2x = Mon, Thu; 4x = Mon, Tue, Thu, Fri
      const step = (weekdays.length - 1) / (freq - 1);
      if (freq === 1) targetDays = ["Wednesday"];
      else if (freq >= 5) targetDays = weekdays;
      else targetDays = Array.from({ length: freq }, (_, i) => weekdays[Math.round(i * step)]);
    }

    DAYS.forEach((day, i) => {
      let ok = false;
      if (task.recurType === "daily") ok = true;
      else if (task.recurType === "weekdays") ok = i < 5;
      else if (task.recurType === "freq") ok = targetDays.includes(day);
      else if (task.recurType === "custom") ok = (task.recurDays || []).includes(day);

      const entries = s[day] || [];
      const ids = entries.map((e) => (typeof e === "object" ? e.id : e));
      if (ok && !ids.includes(task.id)) s[day] = [...entries, { id: task.id, time: null }];
      else if (!ok) s[day] = entries.filter((e) => (typeof e === "object" ? e.id : e) !== task.id);
    });
    saveWeekSchedule(weekOffset, s);
    showToast("Auto-assigned!");
  };

  // Get all task IDs scheduled across ALL weeks (not just current)
  const getAllScheduledIds = () => {
    const ids = new Set();
    for (let w = 0; w <= 4; w++) {
      let sched = {};
      if (w === 0) sched = schedule;
      else { try { sched = JSON.parse(localStorage.getItem(`planner_sched_week-${w}`) || "{}"); } catch {} }
      Object.values(sched).flat().forEach(e => {
        const id = typeof e === "object" ? e.id : e;
        ids.add(id);
      });
    }
    return ids;
  };

  const allScheduledIds = getAllScheduledIds();
  const unscheduledTasks = tasks.filter((t) =>
    t.durationType !== "ongoing" &&
    !t.completed &&
    !allScheduledIds.has(t.id)
  );

  // ── Smart Rule-Based Planner ──
  const planMyWeek = () => {
    setAiPlanning(true);

    // Only plan from today onwards for this week; all days for future weeks
    const availableDays = weekOffset === 0
      ? DAYS.filter((d) => DAYS.indexOf(d) >= todayIndex)
      : [...DAYS];

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
      const isPastDay = weekOffset === 0 && DAYS.indexOf(day) < todayIndex;
      const totalAvailable = (!isPastDay && wh.enabled) ? Math.max(0, (end - start) * 60 - usedMins - bufferMins) : 0;
      dayFreeMinutes[day] = totalAvailable;
      dayFixedSlots[day] = blocks;
    });

    const dayScore = (day, i) => dayFreeMinutes[day] + (i < 5 ? 100 : 0);

    const plan = {};
    DAYS.forEach((d) => { plan[d] = []; });
    const dayLoad = {};
    DAYS.forEach((d) => { dayLoad[d] = 0; });

    // Work out which tasks are already scheduled in OTHER weeks
    const getOtherWeekScheduledIds = () => {
      const ids = new Set();
      for (let w = 0; w <= 4; w++) {
        if (w === weekOffset) continue; // skip current week
        let sched = {};
        if (w === 0) sched = schedule;
        else { try { sched = JSON.parse(localStorage.getItem(`planner_sched_week-${w}`) || "{}"); } catch {} }
        Object.values(sched).flat().forEach(e => {
          const id = typeof e === "object" ? e.id : e;
          ids.add(id);
        });
      }
      return ids;
    };

    // Also get IDs already in THIS week's current schedule
    const thisWeekScheduledIds = new Set(
      Object.values(activeSchedule).flat().map(e => typeof e === "object" ? e.id : e)
    );

    const otherWeekIds = getOtherWeekScheduledIds();

    // A single task should not be planned if it's already in another week OR already in this week
    const isAlreadyPlanned = (taskId, durationType) => {
      if (durationType === "ongoing") return false; // always plan ongoing
      if (thisWeekScheduledIds.has(taskId)) return true; // already in this week
      if (durationType === "single" && otherWeekIds.has(taskId)) return true; // single tasks: only plan once
      return false;
    };

    const ongoingTasks = tasks.filter((t) => t.durationType === "ongoing" && !t.completed);
    const multidayTasks = tasks.filter((t) => t.durationType === "multiday" && !t.completed && !thisWeekScheduledIds.has(t.id));
    const singleTasks = tasks.filter((t) => t.durationType === "single" && !t.completed && !isAlreadyPlanned(t.id, "single"));
    const catPriority = { training: 0, review: 1, task: 2, meeting: 3, admin: 4, reading: 5 };
    const sortByCat = (a, b) => (catPriority[a.category] ?? 2) - (catPriority[b.category] ?? 2);

    // Track used time ranges per day — initialise with fixed blocks so we never overlap them
    const dayUsedSlots = {};
    DAYS.forEach(d => {
      dayUsedSlots[d] = (fixedBlocks.filter(b => b.day === d)).map(b => ({
        start: b.startHour * 60 - 15, // 15 min buffer before
        end: b.endHour * 60 + 15      // 15 min buffer after
      }));
    });

    // 1. Ongoing → recurring days (today onwards only, respecting recurEnd)
    ongoingTasks.forEach((task) => {
      availableDays.forEach((day, idx) => {
        const i = DAYS.indexOf(day);
        const wh = workHours[day] || { enabled: i < 5 };
        if (!wh.enabled) return;
        // Check if this day is past the recurEnd
        if (task.recurEnd) {
          const dayDate = getDayDate(day, weekOffset);
          const endDate = new Date(task.recurEnd);
          endDate.setHours(23,59,59);
          if (dayDate > endDate) return; // skip — past end date
        }
        const ok = task.recurType === "daily" ||
          (task.recurType === "weekdays" && i < 5) ||
          (task.recurType === "freq" && i < 5) || // freq: assign to weekdays, planner picks best ones
          (task.recurType === "custom" && (task.recurDays || []).includes(day));
        if (ok) {
          plan[day].push({ taskId: task.id, suggestedTime: "Flexible", time24: null });
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
          const slot = findSlot(d, task.minsPerSession || 30, dayFixedSlots[d], dayWorkStart[d], dayUsedSlots[d]);
          plan[d].push({ taskId: task.id, suggestedTime: slot.display, time24: slot.time24 });
          if (slot.startMins !== null) dayUsedSlots[d].push({ start: slot.startMins, end: slot.endMins });
          dayLoad[d] += task.minsPerSession || 30;
          assigned++;
        }
      }
      if (assigned === 0) {
        const enabledDays = availableDays.filter((d) => (workHours[d] || {}).enabled !== false);
        if (enabledDays.length) {
          const lightest = enabledDays.sort((a, b) => dayLoad[a] - dayLoad[b])[0];
          plan[lightest].push({ taskId: task.id, suggestedTime: "Flexible", time24: null });
          dayLoad[lightest] += task.minsPerSession || 30;
        }
      }
    });

    // 3. Single tasks → best-fit day from today onwards
    [...singleTasks].sort(sortByCat).forEach((task) => {
      const mins = task.estimatedMins || 30;
      const prefDays = task.category === "training" || task.category === "review"
        ? availableDays  // training & review: earliest available days first
        : task.category === "reading" || task.category === "admin"
        ? [...availableDays].sort((a, b) => {
            // reading & admin: prefer mid-to-late week to fill gaps
            const order = ["Wednesday", "Thursday", "Friday", "Monday", "Tuesday", "Saturday", "Sunday"];
            return order.indexOf(a) - order.indexOf(b);
          })
        : [...availableDays]; // task, meeting: balanced
      const enabledPref = prefDays.filter((d) => (workHours[d] || { enabled: DAYS.indexOf(d) < 5 }).enabled !== false);
      let placed = false;
      for (const day of enabledPref) {
        if (dayLoad[day] + mins <= dayFreeMinutes[day]) {
          const slot = findSlot(day, mins, dayFixedSlots[day], dayWorkStart[day], dayUsedSlots[day]);
          plan[day].push({ taskId: task.id, suggestedTime: slot.display, time24: slot.time24 });
          if (slot.startMins !== null) dayUsedSlots[day].push({ start: slot.startMins, end: slot.endMins });
          dayLoad[day] += mins;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const enabledDays = availableDays.filter((d) => (workHours[d] || {}).enabled !== false);
        const lightest = (enabledDays.length ? enabledDays : availableDays).sort((a, b) => dayLoad[a] - dayLoad[b])[0];
        if (lightest) { plan[lightest].push({ taskId: task.id, suggestedTime: "Flexible", time24: null }); dayLoad[lightest] += mins; }
      }
    });

    const busyDays = availableDays.filter(d => dayLoad[d] > 0);
    const heaviestDay = busyDays.length ? busyDays.reduce((a, b) => dayLoad[a] > dayLoad[b] ? a : b) : todayName;
    const totalMins = Object.values(dayLoad).reduce((s, v) => s + v, 0);
    const remainingDays = availableDays.length;
    const plannedCount = singleTasks.length + multidayTasks.length;
    const skippedCount = tasks.filter(t => t.durationType === "single" && !t.completed && isAlreadyPlanned(t.id, "single")).length;
    const tips = `Planning ${plannedCount} task${plannedCount !== 1 ? "s" : ""} across ${remainingDays} day${remainingDays !== 1 ? "s" : ""} — ~${Math.round(totalMins / 60 * 10) / 10} hours total.${skippedCount > 0 ? ` ${skippedCount} task${skippedCount !== 1 ? "s" : ""} skipped as already scheduled in another week.` : ""} ${fixedBlocks.length > 0 ? "Scheduled around your fixed commitments." : "Add fixed blocks in Fixed Schedule so future plans can work around them."}`;

    setAiSuggestion({ plan, tips, dayLoad });
    setAiPlanning(false);
  };

  // Helper: find a time slot avoiding fixed blocks and already-placed tasks
  // usedSlots is an array of {start, end} in minutes
  const findSlot = (day, durationMins, fixedSlots, workStart = 9, usedSlots = []) => {
    const fixed = (fixedSlots || []).map((b) => ({ start: b.startHour * 60, end: b.endHour * 60 + 15 }));
    const busyStart = workStart * 60;
    const busyEnd = (workHours[day]?.end || 17) * 60;
    let cursor = busyStart;
    while (cursor + durationMins <= busyEnd) {
      const end = cursor + durationMins;
      const blockedByFixed = fixed.some((f) => cursor < f.end && end > f.start);
      const blockedByUsed = usedSlots.some((u) => cursor < u.end && end > u.start);
      if (!blockedByFixed && !blockedByUsed) {
        const h = Math.floor(cursor / 60);
        const m = cursor % 60;
        const endH = Math.floor(end / 60);
        const endM = end % 60;
        const time24 = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
        const timeDisplay = `${fmtHour(h)}${m > 0 ? `:${String(m).padStart(2,"0")}` : ""} – ${fmtHour(endH)}${endM > 0 ? `:${String(endM).padStart(2,"0")}` : ""}`;
        return { time24, display: timeDisplay, startMins: cursor, endMins: end };
      }
      cursor += 15; // move in 15 min increments for more precision
    }
    return { time24: null, display: "Flexible", startMins: null, endMins: null };
  };

  const applyAIPlan = () => {
    if (!aiSuggestion?.plan) return;
    const s = {};
    DAYS.forEach((day) => {
      const items = aiSuggestion.plan[day] || [];
      const ongoingEntries = (activeSchedule[day] || []).filter((e) => {
        const id = typeof e === "object" ? e.id : e;
        return tasks.find((t) => t.id === id && t.durationType === "ongoing");
      });
      const newEntries = items
        .filter(item => item.taskId)
        .map((item) => ({ id: item.taskId, time: item.time24 || null }));
      // Merge ongoing + new, dedup by id
      const seen = new Set();
      const merged = [...ongoingEntries, ...newEntries].filter(e => {
        const id = typeof e === "object" ? e.id : e;
        if (seen.has(id)) return false;
        seen.add(id); return true;
      });
      s[day] = merged;
    });
    saveWeekSchedule(weekOffset, s);
    setAiSuggestion(null);
    showToast("Week planned with times! ✓");
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
      <header style={{ padding: "16px 18px 0", borderBottom: "1px solid #d6d0c8" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#a09890", textTransform: "uppercase", marginBottom: 1 }}>Weekly Planner</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: "normal" }}>My <em style={{ color: "#a8c4b0" }}>Week</em></h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#a29890" }}>{tasks.length} tasks</span>
            <button onClick={() => setFocusMode(f => !f)} style={{ background: focusMode ? "#a8c4b020" : "none", border: `1px solid ${focusMode ? "#a8c4b0" : "#d6d0c8"}`, color: focusMode ? "#82b99a" : "#8a7e76", fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
              {focusMode ? "◉ Focus" : "○ Focus"}
            </button>
          </div>
        </div>
        {/* Desktop nav — hidden on small screens via overflow scroll */}
        <nav style={{ display: "flex", gap: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {[["week", "Week"], ["month", "Month"], ["fixed", "Schedule"], ["tasks", "Tasks"], ["add", "+ Add"], ["settings", "⚙"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: "none", border: "none", color: view === v ? "#3c3226" : "#8a7e76", fontSize: 13, padding: "9px 14px", cursor: "pointer", borderBottom: view === v ? "2px solid #a8c4b0" : "2px solid transparent", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>
          ))}
        </nav>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#f4f0e8", borderTop: "1px solid #d6d0c8", display: "flex", zIndex: 150, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[
          ["week", "📅", "Week"],
          ["month", "🗓", "Month"],
          ["add", "＋", "Add"],
          ["tasks", "☰", "Tasks"],
          ["settings", "⚙", "More"],
        ].map(([v, icon, label]) => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: "none", border: "none", padding: "10px 4px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: v === "add" ? 22 : 18, lineHeight: 1, color: view === v ? "#82b99a" : "#a09890" }}>{icon}</span>
            <span style={{ fontSize: 9, color: view === v ? "#82b99a" : "#a09890", letterSpacing: "0.05em" }}>{label}</span>
          </button>
        ))}
      </div>

      <main style={{ padding: "16px 18px", paddingBottom: 80 }}>

        {/* ── FOCUS MODE OVERLAY ── */}
        {focusMode && (() => {
          const activeFocusDay = focusDay || todayName;
          const activeFocusDayIndex = DAYS.indexOf(activeFocusDay);
          const prevDay = activeFocusDayIndex > 0 ? DAYS[activeFocusDayIndex - 1] : null;
          const nextDay = activeFocusDayIndex < 6 ? DAYS[activeFocusDayIndex + 1] : null;
          const isThisWeek = focusWeekOffset === 0;
          const isToday = activeFocusDay === todayName && isThisWeek;

          // Get the schedule for the focus week
          let focusWeekSched = {};
          if (focusWeekOffset === 0) focusWeekSched = schedule;
          else { try { focusWeekSched = JSON.parse(localStorage.getItem(`planner_sched_week-${focusWeekOffset}`) || "{}"); } catch {} }

          const getFocusScheduleIds = (day) => (focusWeekSched[day] || []).map(e => typeof e === "object" ? e.id : e);
          const getFocusTaskTime = (day, taskId) => {
            const e = (focusWeekSched[day] || []).find(e => (typeof e === "object" ? e.id : e) === taskId);
            return e?.time || null;
          };

          const dayIds = getFocusScheduleIds(activeFocusDay);
          const dayTasks = dayIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
          const dayFixed = fixedBlocks.filter(b => b.day === activeFocusDay).sort((a, b) => a.startHour - b.startHour);
          const sorted = [...dayTasks].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const ta = getFocusTaskTime(activeFocusDay, a.id) || "99:99";
            const tb = getFocusTaskTime(activeFocusDay, b.id) || "99:99";
            return ta.localeCompare(tb);
          });
          const completedCount = sorted.filter(t => t.completed).length;

          // Week label for focus mode
          const focusWeekLabel = focusWeekOffset === 0 ? "This Week" : focusWeekOffset === 1 ? "Next Week" : `In ${focusWeekOffset} Weeks`;

          return (
            <div style={{ position: "fixed", inset: 0, background: "#f4f0e8", zIndex: 400, overflowY: "auto", padding: "18px 18px" }}>
              <div style={{ maxWidth: 480, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.2em", textTransform: "uppercase" }}>Focus Mode</div>
                  <button onClick={() => { setFocusMode(false); setFocusDay(null); setFocusWeekOffset(0); }} style={{ background: "none", border: "1px solid #d6d0c8", color: "#8a7e76", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>Exit</button>
                </div>

                {/* Week navigator */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <button onClick={() => { setFocusWeekOffset(w => Math.max(0, w - 1)); setFocusDay(null); }}
                    disabled={focusWeekOffset === 0}
                    style={{ background: "none", border: "1px solid #d6d0c8", color: focusWeekOffset === 0 ? "#d6d0c8" : "#6c6255", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: focusWeekOffset === 0 ? "not-allowed" : "pointer" }}>← Prev</button>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#3c3226", fontWeight: "bold" }}>{focusWeekLabel}</div>
                    <div style={{ fontSize: 10, color: "#a09890" }}>{weekLabel(focusWeekOffset)}</div>
                  </div>
                  <button onClick={() => { setFocusWeekOffset(w => Math.min(4, w + 1)); setFocusDay(null); }}
                    disabled={focusWeekOffset === 4}
                    style={{ background: "none", border: "1px solid #d6d0c8", color: focusWeekOffset === 4 ? "#d6d0c8" : "#6c6255", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: focusWeekOffset === 4 ? "not-allowed" : "pointer" }}>Next →</button>
                </div>

                {/* Day navigator */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <button onClick={() => setFocusDay(prevDay)} disabled={!prevDay}
                    style={{ background: "none", border: "1px solid #d6d0c8", color: prevDay ? "#6c6255" : "#d6d0c8", borderRadius: 7, padding: "7px 12px", fontSize: 13, cursor: prevDay ? "pointer" : "not-allowed" }}>
                    ← {prevDay ? prevDay.slice(0, 3) : ""}
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, color: "#3c3226" }}>{activeFocusDay}</div>
                    <div style={{ fontSize: 11, color: isToday ? "#82b99a" : "#a09890" }}>
                      {isToday ? "Today" : getDayDate(activeFocusDay, focusWeekOffset).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {sorted.length > 0 && ` · ${completedCount}/${sorted.length} done`}
                    </div>
                  </div>
                  <button onClick={() => setFocusDay(nextDay)} disabled={!nextDay}
                    style={{ background: "none", border: "1px solid #d6d0c8", color: nextDay ? "#6c6255" : "#d6d0c8", borderRadius: 7, padding: "7px 12px", fontSize: 13, cursor: nextDay ? "pointer" : "not-allowed" }}>
                    {nextDay ? nextDay.slice(0, 3) : ""} →
                  </button>
                </div>

                {/* Day selector pills */}
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
                  {DAYS.map((d) => {
                    const dIds = getFocusScheduleIds(d);
                    const dTasks = dIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
                    const allDone = dTasks.length > 0 && dTasks.every(t => t.completed);
                    const isActive = d === activeFocusDay;
                    const isDToday = d === todayName && isThisWeek;
                    return (
                      <button key={d} onClick={() => setFocusDay(d)} style={{ background: isActive ? "#8aa898" : "none", border: `1px solid ${isActive ? "#8aa898" : "#d6d0c8"}`, color: isActive ? "#fff" : isDToday ? "#82b99a" : "#a09890", borderRadius: 5, padding: "4px 7px", fontSize: 10, cursor: "pointer", fontWeight: isDToday ? "bold" : "normal" }}>
                        {d.slice(0, 3)}
                        {dTasks.length > 0 && <span style={{ display: "block", width: 4, height: 4, borderRadius: "50%", background: allDone ? "#82b99a" : isActive ? "#fff" : "#c8be90", margin: "2px auto 0" }} />}
                      </button>
                    );
                  })}
                </div>

                {/* Jump to week button */}
                <button onClick={() => { setWeekOffset(focusWeekOffset); setView("week"); setFocusMode(false); setFocusDay(null); setFocusWeekOffset(0); }}
                  style={{ background: "none", border: "1px solid #a8c4b0", color: "#82b99a", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", width: "100%", marginBottom: 14, textAlign: "center" }}>
                  ✎ Edit {focusWeekLabel} in Week View
                </button>

                {/* Fixed blocks */}
                {dayFixed.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {dayFixed.map(block => {
                      const ft = getFixed(block.type);
                      return (
                        <div key={block.id} style={{ background: ft.color + "12", border: `1px solid ${ft.color}44`, borderLeft: `4px solid ${ft.color}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#4c4235" }}>{ft.icon} {block.title}</div>
                            <div style={{ fontSize: 11, color: "#8a7e76" }}>{fmtRange(block.startHour, block.endHour)}</div>
                          </div>
                          <span style={{ fontSize: 10, color: ft.color, background: ft.color + "18", padding: "2px 7px", borderRadius: 4 }}>{ft.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {sorted.length === 0 && dayFixed.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "#a09890", fontSize: 14 }}>
                    Nothing scheduled for {activeFocusDay}.<br />
                    <span style={{ fontSize: 12 }}>Tap "Edit in Week View" above to add tasks.</span>
                  </div>
                )}

                {/* Task list */}
                {sorted.map(task => {
                  const cat = getCat(task.category);
                  const taskTime = getFocusTaskTime(activeFocusDay, task.id);
                  const ds = task.deadline && !task.completed ? getDeadlineStatus(task.deadline) : null;
                  return (
                    <div key={task.id} style={{ background: task.completed ? "#ece7df" : "#fff", border: `1px solid ${task.completed ? "#d6d0c8" : cat.color + "44"}`, borderLeft: `4px solid ${task.completed ? "#d6d0c8" : cat.color}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {task.durationType !== "ongoing"
                        ? <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task.id)} style={{ accentColor: cat.color, width: 20, height: 20, marginTop: 1, cursor: "pointer", flexShrink: 0 }} />
                        : <span style={{ color: cat.color, fontSize: 16, marginTop: 1, flexShrink: 0 }}>↻</span>}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          {task.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                          {task.priority && <span style={{ fontSize: 13 }}>❗</span>}
                          <span style={{ fontSize: 15, color: task.completed ? "#a09890" : "#3c3226", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#8a7e76", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span>{getCatLabel(task.category)}</span>
                          <span>·</span>
                          <span>{getDurationLabel(task)}</span>
                          {taskTime && <span>· 🕐 {taskTime}</span>}
                          {ds && <span style={{ color: ds.color, fontWeight: ds.urgent ? "bold" : "normal" }}>· 📅 {ds.label}</span>}
                        </div>
                        {task.notes && <div style={{ fontSize: 11, color: "#a09890", marginTop: 5, lineHeight: 1.5 }}>{task.notes}</div>}
                        {task.durationType === "multiday" && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ height: 4, background: "#d6d0c8", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.round(((task.completedSessions||0)/task.totalSessions)*100)}%`, background: cat.color, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 10, color: "#a09890", marginTop: 3 }}>{task.completedSessions||0}/{task.totalSessions} sessions</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* End of Day Review — today only */}
                {isToday && sorted.length > 0 && (
                  <button onClick={() => { setShowDayReview(true); setFocusMode(false); setFocusDay(null); setFocusWeekOffset(0); }}
                    style={{ background: "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", borderRadius: 8, padding: "13px 20px", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 8 }}>
                    End of Day Review →
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── END OF DAY REVIEW ── */}
        {showDayReview && (
          <div style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDayReview(false)}>
            <div style={{ background: "#f4f0e8", borderRadius: 14, padding: 22, width: 340, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>End of Day Review</div>
              <div style={{ fontSize: 18, color: "#3c3226", marginBottom: 14 }}>{todayName}</div>
              {(() => {
                const todayIds = getScheduleIds(todayName);
                const todayTasks = todayIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
                const done = todayTasks.filter(t => t.completed);
                const undone = todayTasks.filter(t => !t.completed && t.durationType !== "ongoing");
                const tomorrowName = DAYS[Math.min(todayIndex + 1, 6)];
                return (
                  <>
                    <div style={{ background: "#e8f2ea", border: "1px solid #a8c4b044", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "#82b99a", marginBottom: 6, fontWeight: "bold" }}>✓ Completed ({done.length})</div>
                      {done.length === 0 && <div style={{ fontSize: 12, color: "#a09890" }}>Nothing completed yet today.</div>}
                      {done.map(t => <div key={t.id} style={{ fontSize: 12, color: "#4c4235", marginBottom: 3 }}>· {t.title}</div>)}
                    </div>
                    {undone.length > 0 && (
                      <div style={{ background: "#fdf0e6", border: "1px solid #d4a5a544", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: "#c89898", marginBottom: 8, fontWeight: "bold" }}>⚠ Unfinished ({undone.length})</div>
                        {undone.map(t => (
                          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: "#4c4235" }}>· {t.title}</span>
                            <button onClick={() => {
                              removeFromDay(t.id, todayName);
                              const updated = { ...activeSchedule, [tomorrowName]: [...(activeSchedule[tomorrowName] || []), { id: t.id, time: null }] };
                              saveWeekSchedule(weekOffset, updated);
                              showToast(`Moved to ${tomorrowName}`);
                            }} style={{ background: "#a8c4b020", border: "1px solid #a8c4b0", color: "#82b99a", borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>→ {tomorrowName.slice(0,3)}</button>
                          </div>
                        ))}
                        <button onClick={() => {
                          undone.forEach(t => {
                            removeFromDay(t.id, todayName);
                            const updated = { ...activeSchedule, [tomorrowName]: [...(activeSchedule[tomorrowName] || []), { id: t.id, time: null }] };
                            saveWeekSchedule(weekOffset, updated);
                          });
                          showToast("All moved to tomorrow!");
                          setShowDayReview(false);
                        }} style={{ background: "#8aa898", border: "none", color: "#fff", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 6 }}>Move all to {tomorrowName} →</button>
                      </div>
                    )}
                    <button onClick={() => setShowDayReview(false)} style={{ background: "none", border: "1px solid #d6d0c8", color: "#8a7e76", borderRadius: 7, padding: "8px 0", fontSize: 12, cursor: "pointer", width: "100%" }}>Close</button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── COPY WEEK MODAL ── */}
        {showCopyWeek && (
          <div style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCopyWeek(false)}>
            <div style={{ background: "#f4f0e8", borderRadius: 14, padding: 22, width: 300, maxWidth: "92vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 10, color: "#8a7e76", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>Copy Week As Template</div>
              <div style={{ fontSize: 14, color: "#3c3226", marginBottom: 14 }}>Copy {weekOffset === 0 ? "this week" : weekOffset === 1 ? "next week" : `week +${weekOffset}`} to:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].filter(w => w !== weekOffset).map(w => (
                  <button key={w} onClick={() => copyWeekTo(w)} style={{ background: "#ece7df", border: "1px solid #d6d0c8", color: "#4c4235", borderRadius: 8, padding: "10px 14px", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                    {w === 1 ? "Next Week" : `In ${w} Weeks`} — {weekLabel(w)}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCopyWeek(false)} style={{ background: "none", border: "none", color: "#a09890", fontSize: 12, cursor: "pointer", marginTop: 12, width: "100%", textAlign: "center" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── SETTINGS VIEW ── */}
        {view === "settings" && (
          <div style={{ maxWidth: 500 }}>
            <div style={{ fontSize: 11, color: "#8a7e76", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 18 }}>Settings</div>

            {/* Rename Categories */}
            <div style={{ background: "#ece7df", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editingCatLabels ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#3c3226" }}>Rename Categories</div>
                  <div style={{ fontSize: 11, color: "#8a7e76" }}>Personalise category names to match your role</div>
                </div>
                <button onClick={() => setEditingCatLabels(e => !e)} style={{ background: editingCatLabels ? "#a8c4b020" : "none", border: `1px solid ${editingCatLabels ? "#a8c4b0" : "#d6d0c8"}`, color: editingCatLabels ? "#82b99a" : "#6c6255", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                  {editingCatLabels ? "Done" : "Edit"}
                </button>
              </div>
              {editingCatLabels && CATEGORIES.map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <CatIcon icon={cat.icon} color={cat.color} size={14} />
                  <input
                    value={categoryLabels[cat.id] || cat.label}
                    onChange={e => setCategoryLabels(p => ({ ...p, [cat.id]: e.target.value }))}
                    style={{ flex: 1, background: "#f4f0e8", border: "1px solid #d6d0c8", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "#3c3226", outline: "none" }}
                  />
                  {categoryLabels[cat.id] && categoryLabels[cat.id] !== cat.label && (
                    <button onClick={() => setCategoryLabels(p => { const n = {...p}; delete n[cat.id]; return n; })} style={{ background: "none", border: "none", color: "#c89898", cursor: "pointer", fontSize: 12 }}>Reset</button>
                  )}
                </div>
              ))}
            </div>

            {/* End of Day Review shortcut */}
            <div style={{ background: "#ece7df", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#3c3226", marginBottom: 4 }}>End of Day Review</div>
              <div style={{ fontSize: 11, color: "#8a7e76", marginBottom: 10 }}>Review what you completed today and move anything unfinished to tomorrow</div>
              <button onClick={() => setShowDayReview(true)} style={{ background: "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 12, cursor: "pointer" }}>
                Start Review →
              </button>
            </div>

            {/* Copy Week */}
            <div style={{ background: "#ece7df", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#3c3226", marginBottom: 4 }}>Copy Week as Template</div>
              <div style={{ fontSize: 11, color: "#8a7e76", marginBottom: 10 }}>Copy the current week's schedule to a future week — useful if your weeks follow a similar pattern</div>
              <button onClick={() => setShowCopyWeek(true)} style={{ background: "#ece7df", border: "1px solid #d6d0c8", color: "#4c4235", borderRadius: 7, padding: "9px 18px", fontSize: 12, cursor: "pointer" }}>
                Copy Week →
              </button>
            </div>

            {/* Focus Mode */}
            <div style={{ background: "#ece7df", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#3c3226", marginBottom: 4 }}>Focus Mode</div>
              <div style={{ fontSize: 11, color: "#8a7e76", marginBottom: 10 }}>Shows only today's tasks in a clean full-screen view — no distractions</div>
              <button onClick={() => setFocusMode(true)} style={{ background: "#ece7df", border: "1px solid #d6d0c8", color: "#4c4235", borderRadius: 7, padding: "9px 18px", fontSize: 12, cursor: "pointer" }}>
                Enter Focus Mode →
              </button>
            </div>
          </div>
        )}

        {/* ── MONTH VIEW ── */}
        {view === "month" && (() => {
          const now = new Date();
          const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          const monthName = viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

          // First day of month (0=Sun…6=Sat) → convert to Mon-based
          const firstDow = viewDate.getDay();
          const startOffset = firstDow === 0 ? 6 : firstDow - 1;
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          // Build calendar grid cells
          const cells = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          // Get all scheduled tasks across all weeks for this month
          // For each date, collect task titles from the matching week's schedule
          const getTasksForDate = (dateNum) => {
            if (!dateNum) return [];
            const date = new Date(year, month, dateNum);
            const dow = date.getDay();
            const dayName = DAYS[dow === 0 ? 6 : dow - 1];

            // Work out which week offset this date corresponds to
            const today = new Date();
            today.setHours(0,0,0,0);
            const diffMs = date - today;
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const diffWeeks = Math.floor(diffDays / 7);

            let weekSched = {};
            if (diffWeeks === 0) {
              weekSched = schedule;
            } else if (diffWeeks >= 1 && diffWeeks <= 4) {
              try { weekSched = JSON.parse(localStorage.getItem(`planner_sched_week-${diffWeeks}`) || "{}"); } catch { weekSched = {}; }
            }

            const entries = weekSched[dayName] || [];
            return entries.map((e) => {
              const id = typeof e === "object" ? e.id : e;
              return tasks.find((t) => t.id === id);
            }).filter(Boolean);
          };

          const isToday = (dateNum) => {
            if (!dateNum || monthOffset !== 0) return false;
            return dateNum === now.getDate();
          };

          return (
            <div>
              {/* Month navigator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: "none", border: "1px solid #d6d0c8", color: "#726460", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer" }}>← Prev</button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, color: "#3c3226" }}>{monthName}</div>
                  {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} style={{ background: "none", border: "none", color: "#a8c4b0", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Back to today</button>}
                </div>
                <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: "none", border: "1px solid #d6d0c8", color: "#726460", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer" }}>Next →</button>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#a09890", letterSpacing: "0.1em", padding: "4px 0" }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {cells.map((dateNum, idx) => {
                  const dayTasks = getTasksForDate(dateNum);
                  const completedCount = dayTasks.filter(t => t.completed).length;
                  const priorityCount = dayTasks.filter(t => t.priority && !t.completed).length;
                  const hasFixed = dateNum && fixedBlocks.some(b => {
                    const date = new Date(year, month, dateNum);
                    const dow = date.getDay();
                    const dayName = DAYS[dow === 0 ? 6 : dow - 1];
                    return b.day === dayName;
                  });
                  const today = isToday(dateNum);
                  const isPast = dateNum && monthOffset === 0 && dateNum < now.getDate();

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!dateNum) return;
                        // Navigate to the correct week
                        const date = new Date(year, month, dateNum);
                        const todayMidnight = new Date();
                        todayMidnight.setHours(0,0,0,0);
                        const diffDays = Math.round((date - todayMidnight) / (1000 * 60 * 60 * 24));
                        const diffWeeks = Math.floor(diffDays / 7);
                        if (diffWeeks >= 0 && diffWeeks <= 4) {
                          setWeekOffset(diffWeeks);
                          setView("week");
                        }
                      }}
                      style={{
                        background: !dateNum ? "transparent" : today ? "#e8f2ea" : isPast ? "#f4f0ec" : "#efeae2",
                        border: today ? "1px solid #a8c4b0" : !dateNum ? "none" : "1px solid #d6d0c8",
                        borderRadius: 7,
                        padding: "6px 5px",
                        minHeight: 64,
                        cursor: dateNum ? "pointer" : "default",
                        transition: "background 0.1s",
                        position: "relative"
                      }}
                    >
                      {dateNum && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: today ? "#82b99a" : isPast ? "#b8ada4" : "#4c4235", fontWeight: today ? "bold" : "normal" }}>{dateNum}</span>
                            {priorityCount > 0 && <span style={{ fontSize: 10 }}>❗</span>}
                          </div>

                          {/* Task dots */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 2 }}>
                            {dayTasks.slice(0, 6).map((task, ti) => {
                              const cat = getCat(task.category);
                              return (
                                <div key={ti} style={{ width: 7, height: 7, borderRadius: "50%", background: task.completed ? "#cec8c0" : cat.color, opacity: task.completed ? 0.5 : 1 }} title={task.title} />
                              );
                            })}
                            {dayTasks.length > 6 && <span style={{ fontSize: 8, color: "#a09890" }}>+{dayTasks.length - 6}</span>}
                          </div>

                          {/* Fixed block indicators */}
                          {hasFixed && (
                            <div style={{ fontSize: 8, color: "#c898aa", marginTop: 1 }}>⬤ fixed</div>
                          )}

                          {/* Completion summary */}
                          {dayTasks.length > 0 && (
                            <div style={{ fontSize: 8, color: "#a09890", marginTop: 2 }}>
                              {completedCount}/{dayTasks.length} done
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
                {CATEGORIES.map(cat => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a7e76" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
                    {cat.label}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a7e76" }}>
                  <span style={{ color: "#c898aa" }}>⬤</span> Fixed block
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#a09890", marginTop: 8 }}>Tap any day to jump to that week</div>
            </div>
          );
        })()}

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

            {/* ── Week Navigator ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={() => { setWeekOffset((w) => Math.max(0, w - 1)); setAiSuggestion(null); }}
                disabled={weekOffset === 0}
                style={{ background: "none", border: "1px solid #d6d0c8", color: weekOffset === 0 ? "#d6d0c8" : "#726460", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: weekOffset === 0 ? "not-allowed" : "pointer" }}
              >← Prev</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#3c3226", fontWeight: weekOffset === 0 ? "bold" : "normal" }}>
                  {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : `In ${weekOffset} Weeks`}
                </div>
                <div style={{ fontSize: 11, color: "#8a7e76" }}>{weekLabel(weekOffset)}</div>
              </div>
              <button
                onClick={() => { setWeekOffset((w) => Math.min(4, w + 1)); setAiSuggestion(null); }}
                disabled={weekOffset === 4}
                style={{ background: "none", border: "1px solid #d6d0c8", color: weekOffset === 4 ? "#d6d0c8" : "#726460", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: weekOffset === 4 ? "not-allowed" : "pointer" }}
              >Next →</button>
            </div>

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
                  <button onClick={() => setShowCarryOverPanel(true)} style={{ background: "#c8989820", border: "1px solid #c89898", color: "#c89898", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginTop: 2 }}>
                    ↻ {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""} — carry over?
                  </button>
                )}
              </div>
            </div>

            {/* ── Daily Progress Dashboard ── */}
            {weekOffset === 0 && (
              <DailyDashboard
                todayName={todayName}
                tasks={tasks}
                schedule={schedule}
                fixedBlocks={fixedBlocks}
                setFocusDay={setFocusDay}
                setFocusWeekOffset={setFocusWeekOffset}
                setFocusMode={setFocusMode}
              />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={() => setSubView("schedule")} style={{ background: "none", border: "none", color: subView === "schedule" ? "#3c3226" : "#8a7e76", fontSize: 12, padding: "5px 10px", cursor: "pointer", borderBottom: subView === "schedule" ? "1px solid #8aa898" : "1px solid transparent" }}>Schedule</button>
                <button onClick={() => setSubView("timeline")} style={{ background: "none", border: "none", color: subView === "timeline" ? "#3c3226" : "#8a7e76", fontSize: 12, padding: "5px 10px", cursor: "pointer", borderBottom: subView === "timeline" ? "1px solid #8aa898" : "1px solid transparent" }}>Timeline</button>
              </div>
              <button onClick={planMyWeek} disabled={aiPlanning || tasks.length === 0} style={{ background: aiPlanning ? "#e9e4db" : "linear-gradient(135deg,#8aa898,#a8c4b0)", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 6, fontSize: 12, cursor: tasks.length === 0 ? "not-allowed" : "pointer", opacity: tasks.length === 0 ? 0.4 : 1 }}>
                {aiPlanning ? "Planning…" : "✦ Plan My Week"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <button onClick={() => setShowDayReview(true)} style={{ background: "none", border: "1px solid #d6d0c8", color: "#6c6255", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>📋 End of Day Review</button>
              <button onClick={() => setShowCopyWeek(true)} style={{ background: "none", border: "1px solid #d6d0c8", color: "#6c6255", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>🔁 Copy Week</button>
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
                              <CatIcon icon={cat.icon} color={cat.color} size={10} /> {task.title}
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
                            <CatIcon icon={cat.icon} color={cat.color} size={10} />
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
                      if (a.pinned && !b.pinned) return -1;
                      if (!a.pinned && b.pinned) return 1;
                      const ta = getTaskTime(day, a.id) || "99:99";
                      const tb = getTaskTime(day, b.id) || "99:99";
                      return ta.localeCompare(tb);
                    });
                    const dayFixed = fixedBlocks.filter((b) => b.day === day).sort((a, b) => a.startHour - b.startHour);
                    const isOver = dragOver === day;
                    const isPast = weekOffset === 0 && DAYS.indexOf(day) < todayIndex;
                    const isToday = weekOffset === 0 && day === todayName;
                    const dayDate = fmtDayDate(day, weekOffset);
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
                          <div
                            onClick={() => { setFocusDay(day); setFocusWeekOffset(weekOffset); setFocusMode(true); }}
                            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                            title={`Open ${day} in Focus Mode`}
                          >
                            <span style={{ fontSize: 10, letterSpacing: "0.12em", color: isToday ? "#82b99a" : isPast ? "#c0b0a8" : "#726460", fontWeight: isToday ? "bold" : "normal" }}>{SHORT_DAYS[i]}</span>
                            <span style={{ fontSize: 10, color: isToday ? "#82b99a" : isPast ? "#c0b0a8" : "#a09890" }}>{dayDate}</span>
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
                          const overdue = weekOffset === 0 && isPast && !task.completed && task.durationType !== "ongoing";
                          return (
                            <div
                              key={task.id}
                              draggable={task.durationType !== "ongoing"}
                              onDragStart={() => { setDragTask(task.id); setDragFromDay(day); }}
                              onDragEnd={() => { setDragTask(null); setDragFromDay(null); setDragOver(null); }}
                              style={{ background: isBeingDragged ? "#e4dfda" : overdue ? "#f5ece8" : "#e9e4db", borderLeft: `2px solid ${task.completed ? "#bcb4aa" : overdue ? "#c89898" : cat.color}`, borderRadius: 3, padding: "5px 7px", marginBottom: 3, cursor: task.durationType !== "ongoing" ? "grab" : "default", opacity: isBeingDragged ? 0.4 : 1, transition: "opacity 0.15s" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                                {task.durationType === "ongoing"
                                  ? <span style={{ color: cat.color, fontSize: 9, marginTop: 2, flexShrink: 0 }}>↻</span>
                                  : <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task.id)} style={{ accentColor: cat.color, cursor: "pointer", width: 11, height: 11, marginTop: 2, flexShrink: 0 }} />
                                }
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", marginBottom: 1 }}>
                                    {task.pinned && <span style={{ fontSize: 8, flexShrink: 0 }}>📌</span>}
                                    {task.priority && <span style={{ fontSize: 9, flexShrink: 0 }}>❗</span>}
                                    {task.deadline && !task.completed && getDeadlineStatus(task.deadline)?.urgent && <span style={{ fontSize: 8, color: getDeadlineStatus(task.deadline).color, flexShrink: 0 }}>📅</span>}
                                    {overdue && <span style={{ fontSize: 8, color: "#c89898", flexShrink: 0 }}>⚠</span>}
                                  </div>
                                  <span
                                    onClick={() => setTaskPopup({ taskId: task.id, day })}
                                    style={{ fontSize: 11, color: task.completed ? "#bcb4aa" : overdue ? "#c89898" : "#4c4235", textDecoration: task.completed ? "line-through" : "none", cursor: "pointer", display: "block", wordBreak: "break-word", lineHeight: 1.3 }}
                                  >{task.title}</span>
                                </div>
                              </div>
                              {/* Time row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: 16 }}>
                                <button onClick={() => setTimePicker({ taskId: task.id, day })} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }} title="Set time">
                                  <span style={{ fontSize: 9 }}>🕐</span>
                                  <span style={{ fontSize: 9, color: taskTime ? "#88aa94" : "#cec8c0" }}>{taskTime ? taskTime : "set time"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {dayTasks.length === 0 && dayFixed.length === 0 && <div style={{ fontSize: 10, color: "#5c5244", textAlign: "center", marginTop: 14 }}>Drop here</div>}

                        {/* Quick Add */}
                        {quickAddDay === day ? (
                          <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                            <input
                              autoFocus
                              value={quickAddTitle}
                              onChange={e => setQuickAddTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") quickAddTask(day, quickAddTitle); if (e.key === "Escape") { setQuickAddDay(null); setQuickAddTitle(""); } }}
                              placeholder="Task name…"
                              style={{ flex: 1, background: "#f4f0e8", border: "1px solid #a8c4b0", borderRadius: 5, padding: "4px 7px", fontSize: 11, color: "#3c3226", outline: "none", minWidth: 0 }}
                            />
                            <button onClick={() => quickAddTask(day, quickAddTitle)} style={{ background: "#8aa898", border: "none", color: "#fff", borderRadius: 5, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>+</button>
                            <button onClick={() => { setQuickAddDay(null); setQuickAddTitle(""); }} style={{ background: "none", border: "none", color: "#a09890", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                          </div>
                        ) : (
                          <button onClick={() => { setQuickAddDay(day); setQuickAddTitle(""); }} style={{ marginTop: 5, background: "none", border: "1px dashed #d6d0c8", color: "#a09890", borderRadius: 5, padding: "3px 0", fontSize: 11, cursor: "pointer", width: "100%", textAlign: "center" }}>+ quick add</button>
                        )}
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
                    const dayDate = fmtDayDate(day, weekOffset);
                    const isToday = day === todayName && weekOffset === 0;
                    return (
                      <div key={day} style={{ padding: "4px 6px", borderBottom: "1px solid #d6d0c8", textAlign: "center", background: isToday ? "#e8f2ea" : "transparent" }}>
                        <div style={{ fontSize: 10, color: isToday ? "#82b99a" : "#726460", letterSpacing: "0.1em", fontWeight: isToday ? "bold" : "normal" }}>{SHORT_DAYS[i]}</div>
                        <div style={{ fontSize: 9, color: isToday ? "#82b99a" : "#a09890" }}>{dayDate}</div>
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

                        // Tasks that START in this hour slot
                        const dayIds = getScheduleIds(day);
                        const tasksStartingHere = dayIds.map(id => {
                          const task = tasks.find(t => t.id === id);
                          if (!task || task.durationType === "ongoing") return null;
                          const time = getTaskTime(day, task.id);
                          if (!time) return null;
                          const [h] = time.split(":").map(Number);
                          if (h !== hour) return null;
                          return task;
                        }).filter(Boolean);

                        // Tasks with no time set — show in first work hour slot only
                        const workStart = workHours[day]?.start ?? 9;
                        const noTimeTasks = hour === workStart ? dayIds.map(id => {
                          const task = tasks.find(t => t.id === id);
                          if (!task || task.durationType === "ongoing") return null;
                          const time = getTaskTime(day, task.id);
                          if (time) return null; // has a time, handled above
                          return task;
                        }).filter(Boolean) : [];

                        return (
                          <div key={`${day}${hour}`} style={{ height: hourHeight, borderTop: "1px solid #e0dbd2", borderLeft: "1px solid #e0dbd2", position: "relative", background: spanning.length ? getFixed(spanning[0].type).color + "08" : "transparent" }}>
                            {/* Fixed blocks */}
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

                            {/* Tasks with a specific time — show as blocks */}
                            {tasksStartingHere.map((task, ti) => {
                              const cat = getCat(task.category);
                              const time = getTaskTime(day, task.id);
                              const [, mStr] = time.split(":");
                              const mins = parseInt(mStr || 0);
                              const topOffset = (mins / 60) * hourHeight;
                              const durMins = task.durationType === "single" ? (task.estimatedMins || 30)
                                : task.durationType === "multiday" ? (task.minsPerSession || 30)
                                : (task.sessionMins || 30);
                              const blockHeight = Math.max((durMins / 60) * hourHeight - 2, 14);
                              return (
                                <div key={task.id} style={{ position: "absolute", top: topOffset + 1 + ti * 0, left: 2, right: 2, height: blockHeight, background: task.completed ? "#d6d0c8" : cat.color + "25", border: `1px solid ${task.completed ? "#cec8c0" : cat.color + "66"}`, borderLeft: `3px solid ${task.completed ? "#cec8c0" : cat.color}`, borderRadius: 3, padding: "2px 4px", overflow: "hidden", zIndex: 1, cursor: "pointer" }}
                                  onClick={() => setTaskPopup({ taskId: task.id, day })}
                                >
                                  <div style={{ fontSize: 9, color: task.completed ? "#a09890" : cat.color, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                                  {blockHeight > 22 && <div style={{ fontSize: 8, color: task.completed ? "#b0aba5" : cat.color + "cc" }}>{time} · {fmtMins(durMins)}</div>}
                                </div>
                              );
                            })}

                            {/* Tasks with no time — stack at work start hour as small pills */}
                            {noTimeTasks.map((task, ti) => {
                              const cat = getCat(task.category);
                              return (
                                <div key={task.id} style={{ position: "absolute", top: 2 + ti * 13, left: 2, right: 2, background: cat.color + "15", borderLeft: `2px solid ${cat.color}`, borderRadius: 3, padding: "1px 4px", fontSize: 8, color: cat.color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", zIndex: 1, cursor: "pointer", opacity: 0.7 }}
                                  onClick={() => setTaskPopup({ taskId: task.id, day })}
                                  title="No time set — tap to set a time"
                                >
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
                  <button key={cat.id} onClick={() => setField("category", cat.id)} style={{ ...chip(newTask.category === cat.id, cat.color), display: "flex", gap: 5, alignItems: "center" }}><CatIcon icon={cat.icon} color={newTask.category === cat.id ? cat.color : "#a09890"} size={11} /> {getCatLabel(cat.id)}</button>
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
                      {[2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setField("totalSessions", n)} style={chip(newTask.totalSessions === n && newTask.totalSessions <= 5, "#8aa898")}>{n}</button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={newTask.totalSessions}
                      onChange={(e) => setField("totalSessions", parseInt(e.target.value) || 1)}
                      placeholder="Or type any number…"
                      style={{ ...inp, fontSize: 12 }}
                    />
                    {newTask.totalSessions > 5 && (
                      <div style={{ fontSize: 10, color: "#8a7e76", marginTop: 3 }}>{newTask.totalSessions} sessions selected</div>
                    )}
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
                  <label style={lbl}>How many times per week?</label>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => { setField("recurFreq", n); setField("recurType", "freq"); }} style={{ ...chip(newTask.recurType === "freq" && newTask.recurFreq === n, "#8aa898"), minWidth: 36, textAlign: "center" }}>
                        {n}x
                      </button>
                    ))}
                    <button onClick={() => setField("recurType", "daily")} style={chip(newTask.recurType === "daily", "#8aa898")}>Every day</button>
                  </div>
                  {newTask.recurType === "freq" && (
                    <div style={{ fontSize: 11, color: "#8a7e76", background: "#f4f0e8", borderRadius: 6, padding: "6px 10px" }}>
                      {(() => {
                        const freq = newTask.recurFreq || 3;
                        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                        let days = [];
                        if (freq === 1) days = ["Wednesday"];
                        else if (freq >= 5) days = weekdays;
                        else { const step = (weekdays.length - 1) / (freq - 1); days = Array.from({ length: freq }, (_, i) => weekdays[Math.round(i * step)]); }
                        return `Planner will schedule on: ${days.map(d => d.slice(0,3)).join(", ")}`;
                      })()}
                    </div>
                  )}
                  {newTask.recurType === "daily" && (
                    <div style={{ fontSize: 11, color: "#8a7e76", background: "#f4f0e8", borderRadius: 6, padding: "6px 10px" }}>Scheduled every day of the week</div>
                  )}
                </div>
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

                {/* Recur end */}
                <div style={{ marginTop: 12 }}>
                  <label style={lbl}>Runs until (optional)</label>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                    {[
                      { label: "2 weeks", weeks: 2 },
                      { label: "3 weeks", weeks: 3 },
                      { label: "1 month", weeks: 4 },
                      { label: "2 months", weeks: 8 },
                      { label: "3 months", weeks: 13 },
                    ].map(({ label, weeks }) => {
                      const d = new Date();
                      d.setDate(d.getDate() + weeks * 7);
                      const val = d.toISOString().split("T")[0];
                      const isActive = newTask.recurEnd === val;
                      return (
                        <button key={weeks} onClick={() => setField("recurEnd", isActive ? "" : val)} style={chip(isActive, "#8aa898")}>{label}</button>
                      );
                    })}
                    <button onClick={() => setField("recurEnd", "")} style={chip(!newTask.recurEnd, "#a09890")}>Forever</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="date"
                      value={newTask.recurEnd || ""}
                      onChange={(e) => setField("recurEnd", e.target.value)}
                      style={{ ...inp, flex: 1, colorScheme: "light", fontSize: 12 }}
                    />
                    {newTask.recurEnd && (
                      <button onClick={() => setField("recurEnd", "")} style={{ background: "none", border: "none", color: "#a09890", cursor: "pointer", fontSize: 13 }}>×</button>
                    )}
                  </div>
                  {newTask.recurEnd && (
                    <div style={{ fontSize: 10, color: "#8a7e76", marginTop: 4 }}>
                      Ends {new Date(newTask.recurEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
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
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Deadline (optional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="date"
                  value={newTask.deadline || ""}
                  onChange={(e) => setField("deadline", e.target.value)}
                  style={{ ...inp, width: "auto", flex: 1, colorScheme: "light" }}
                />
                {newTask.deadline && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: getDeadlineStatus(newTask.deadline)?.color }}>
                      {getDeadlineStatus(newTask.deadline)?.label}
                    </span>
                    <button onClick={() => setField("deadline", "")} style={{ background: "none", border: "none", color: "#a09890", cursor: "pointer", fontSize: 13 }}>×</button>
                  </div>
                )}
              </div>
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
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", color: cat.color, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}><CatIcon icon={cat.icon} color={cat.color} size={10} /> {getCatLabel(cat.id)}</div>
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

                            <div style={{ marginBottom: 12 }}>
                              <label style={lbl}>Deadline (optional)</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="date" value={editForm.deadline || ""} onChange={(e) => setEditField("deadline", e.target.value)} style={{ ...inp, flex: 1, colorScheme: "light" }} />
                                {editForm.deadline && (
                                  <span style={{ fontSize: 11, color: getDeadlineStatus(editForm.deadline)?.color, whiteSpace: "nowrap" }}>{getDeadlineStatus(editForm.deadline)?.label}</span>
                                )}
                              </div>
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
                              <div style={{ fontSize: 11, color: "#8a7e76", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{getDurationLabel(task)}</span>
                                {task.deadline && !task.completed && (() => {
                                  const ds = getDeadlineStatus(task.deadline);
                                  return <span style={{ fontSize: 10, color: ds.color, background: ds.color + "18", padding: "1px 6px", borderRadius: 4, fontWeight: ds.urgent ? "bold" : "normal" }}>📅 {ds.label}</span>;
                                })()}
                              </div>
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

      {/* ── Task Detail Popup ── */}
      <TaskPopup
        taskPopup={taskPopup}
        tasks={tasks}
        schedule={activeSchedule}
        getTaskTime={getTaskTime}
        toggleComplete={toggleComplete}
        removeFromDay={removeFromDay}
        assignToDay={assignToDay}
        togglePin={togglePin}
        startEditing={(task) => { setView("tasks"); startEditing(task); }}
        setTaskPopup={setTaskPopup}
        getCat={getCat}
        getDurType={getDurType}
        getDurationLabel={getDurationLabel}
        fmtMins={fmtMins}
        getDeadlineStatus={getDeadlineStatus}
        saveWeekSchedule={saveWeekSchedule}
        weekOffset={weekOffset}
        showToast={showToast}
        setTimePicker={setTimePicker}
      />

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

      {/* ── Carry Over Panel ── */}
      {showCarryOverPanel && (
        <div style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCarryOverPanel(false)}>
          <div style={{ background: "#f4f0e8", borderRadius: 14, padding: 20, width: 340, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 10, color: "#c89898", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>Overdue Tasks</div>
            <div style={{ fontSize: 14, color: "#3c3226", marginBottom: 4 }}>Where would you like to move these?</div>
            <div style={{ fontSize: 11, color: "#8a7e76", marginBottom: 16 }}>Tap a day to move each task, or use "Move all" at the bottom.</div>
            {(() => {
              const futureDays = DAYS.slice(todayIndex);
              return (
                <>
                  {overdueTasks.map(task => {
                    const cat = getCat(task.category);
                    return (
                      <div key={task.id} style={{ background: "#ece7df", borderLeft: `3px solid ${cat.color}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <CatIcon icon={cat.icon} color={cat.color} size={11} />
                          {task.priority && <span style={{ fontSize: 11 }}>❗</span>}
                          <span style={{ fontSize: 13, color: "#3c3226" }}>{task.title}</span>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {futureDays.map(day => {
                            const isToday = day === todayName;
                            return (
                              <button key={day} onClick={() => {
                                const s = { ...activeSchedule };
                                DAYS.slice(0, todayIndex).forEach(pastDay => { s[pastDay] = (s[pastDay] || []).filter(e => (typeof e === "object" ? e.id : e) !== task.id); });
                                const destEntries = s[day] || [];
                                const destIds = destEntries.map(e => typeof e === "object" ? e.id : e);
                                if (!destIds.includes(task.id)) {
                                  const usedSlots = destEntries.map(e => {
                                    const id = typeof e === "object" ? e.id : e;
                                    const t = tasks.find(t => t.id === id);
                                    const time = typeof e === "object" ? e.time : null;
                                    if (!time || !t) return null;
                                    const [h, m] = time.split(":").map(Number);
                                    const start = h * 60 + (m || 0);
                                    const dur = t.durationType === "single" ? (t.estimatedMins || 30) : t.durationType === "multiday" ? (t.minsPerSession || 30) : (t.sessionMins || 30);
                                    return { start, end: start + dur };
                                  }).filter(Boolean);
                                  fixedBlocks.filter(b => b.day === day).forEach(b => usedSlots.push({ start: b.startHour * 60 - 15, end: b.endHour * 60 + 15 }));
                                  const dur = task.durationType === "single" ? (task.estimatedMins || 30) : (task.minsPerSession || 30);
                                  const slot = findSlot(day, dur, [], workHours[day]?.start ?? 9, usedSlots);
                                  s[day] = [...destEntries, { id: task.id, time: slot.time24 }];
                                }
                                saveWeekSchedule(weekOffset, s);
                                showToast(`"${task.title}" → ${day}`);
                              }}
                              style={{ background: isToday ? "#a8c4b020" : "#f4f0e8", border: `1px solid ${isToday ? "#a8c4b0" : "#d6d0c8"}`, color: isToday ? "#82b99a" : "#6c6255", borderRadius: 5, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontWeight: isToday ? "bold" : "normal" }}>
                                {isToday ? "Today" : day.slice(0, 3)}
                              </button>
                            );
                          })}
                          {/* Next week */}
                          <button onClick={() => {
                            const thisSched = { ...activeSchedule };
                            DAYS.slice(0, todayIndex).forEach(pastDay => { thisSched[pastDay] = (thisSched[pastDay] || []).filter(e => (typeof e === "object" ? e.id : e) !== task.id); });
                            saveWeekSchedule(weekOffset, thisSched);
                            const nextSched = (() => { try { return JSON.parse(localStorage.getItem(`planner_sched_week-1`) || "{}"); } catch { return {}; } })();
                            const monEntries = nextSched["Monday"] || [];
                            const monIds = monEntries.map(e => typeof e === "object" ? e.id : e);
                            if (!monIds.includes(task.id)) nextSched["Monday"] = [...monEntries, { id: task.id, time: null }];
                            localStorage.setItem(`planner_sched_week-1`, JSON.stringify(nextSched));
                            showToast(`"${task.title}" → Next Week`);
                          }}
                          style={{ background: "#e8e4f0", border: "1px solid #b8a4c8", color: "#8a7ea8", borderRadius: 5, padding: "4px 9px", fontSize: 11, cursor: "pointer" }}>
                            Next Wk →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: "1px solid #d6d0c8", paddingTop: 12, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: "#8a7e76", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Move all to</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {futureDays.map(day => {
                        const isToday = day === todayName;
                        return (
                          <button key={day} onClick={() => {
                            const s = { ...activeSchedule };
                            overdueTasks.forEach(task => {
                              DAYS.slice(0, todayIndex).forEach(pastDay => { s[pastDay] = (s[pastDay] || []).filter(e => (typeof e === "object" ? e.id : e) !== task.id); });
                              const destEntries = s[day] || [];
                              const destIds = destEntries.map(e => typeof e === "object" ? e.id : e);
                              if (!destIds.includes(task.id)) s[day] = [...(s[day] || []), { id: task.id, time: null }];
                            });
                            saveWeekSchedule(weekOffset, s);
                            setShowCarryOverPanel(false);
                            showToast(`${overdueTasks.length} tasks moved to ${day}`);
                          }}
                          style={{ background: isToday ? "linear-gradient(135deg,#8aa898,#a8c4b0)" : "#ece7df", border: `1px solid ${isToday ? "#8aa898" : "#d6d0c8"}`, color: isToday ? "#fff" : "#6c6255", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
                            {isToday ? "Today" : day.slice(0, 3)}
                          </button>
                        );
                      })}
                      {/* Next week option */}
                      <button onClick={() => {
                        const nextWeekSched = (() => { try { return JSON.parse(localStorage.getItem(`planner_sched_week-1`) || "{}"); } catch { return {}; } })();
                        const s = { ...nextWeekSched };
                        const targetDay = DAYS[0]; // Monday of next week
                        overdueTasks.forEach(task => {
                          // Remove from this week's past days
                          const thisSched = { ...activeSchedule };
                          DAYS.slice(0, todayIndex).forEach(pastDay => { thisSched[pastDay] = (thisSched[pastDay] || []).filter(e => (typeof e === "object" ? e.id : e) !== task.id); });
                          saveWeekSchedule(weekOffset, thisSched);
                          // Add to next week Monday
                          const destEntries = s[targetDay] || [];
                          const destIds = destEntries.map(e => typeof e === "object" ? e.id : e);
                          if (!destIds.includes(task.id)) s[targetDay] = [...(s[targetDay] || []), { id: task.id, time: null }];
                        });
                        localStorage.setItem(`planner_sched_week-1`, JSON.stringify(s));
                        setShowCarryOverPanel(false);
                        showToast(`${overdueTasks.length} tasks moved to next week`);
                      }}
                      style={{ background: "#e8e4f0", border: "1px solid #b8a4c8", color: "#8a7ea8", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: "bold" }}>
                        Next Week →
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setShowCarryOverPanel(false)} style={{ background: "none", border: "none", color: "#a09890", fontSize: 12, cursor: "pointer", marginTop: 14, width: "100%", textAlign: "center" }}>Close</button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#e6f0e8", border: "1px solid #8aa898", color: "#a8c4b0", padding: "8px 16px", borderRadius: 7, fontSize: 12, zIndex: 100 }}>{toast}</div>}
    </div>
  );
}
