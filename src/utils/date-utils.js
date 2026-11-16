/**
 * Date and calendar calculation utilities (evaluated in student's local timezone).
 */

/**
 * Checks if two dates refer to the exact same calendar day in local time.
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Categorizes a due date relative to the reference date (evaluated in local time).
 * @param {Date|string} dueDate
 * @param {Date|string} [refDate=new Date()]
 * @returns {{ status: 'overdue'|'today'|'tomorrow'|'upcoming', text: string, timeStr: string, dateStr: string }}
 */
export function formatDueRelative(dueDate, refDate = new Date()) {
  const target = new Date(dueDate);
  const now = new Date(refDate);

  const timeStr = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = target.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Compare local calendar midnights
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (target.getTime() < now.getTime() && diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'overdue',
      text: daysAgo === 1 ? 'Overdue (Yesterday)' : `Overdue (${daysAgo} days ago)`,
      timeStr,
      dateStr,
    };
  }

  if (diffDays === 0) {
    return {
      status: 'today',
      text: `Due Today at ${timeStr}`,
      timeStr,
      dateStr,
    };
  }

  if (diffDays === 1) {
    return {
      status: 'tomorrow',
      text: `Due Tomorrow at ${timeStr}`,
      timeStr,
      dateStr,
    };
  }

  if (diffDays > 1 && diffDays <= 7) {
    const weekday = target.toLocaleDateString([], { weekday: 'short' });
    return {
      status: 'upcoming',
      text: `Due ${weekday}, ${dateStr} at ${timeStr}`,
      timeStr,
      dateStr,
    };
  }

  return {
    status: 'upcoming',
    text: `Due ${dateStr} at ${timeStr}`,
    timeStr,
    dateStr,
  };
}

/**
 * Returns grid cells for a given month in local time (Sunday through Saturday).
 * @param {number} year - e.g. 2026
 * @param {number} month - 0-indexed (0 = Jan, 11 = Dec)
 * @returns {Array<{ date: Date, dayNum: number, isCurrentMonth: boolean, dateKey: string }>}
 */
export function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const totalDays = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const cells = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    cells.push({
      date,
      dayNum: day,
      isCurrentMonth: false,
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    cells.push({
      date,
      dayNum: day,
      isCurrentMonth: true,
      dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  // Next month leading days to complete full 7-day rows (up to 35 or 42 cells)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day);
    cells.push({
      date,
      dayNum: day,
      isCurrentMonth: false,
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  return cells;
}

/**
 * Extracts bold date and subtitle components matching timeline UI styling.
 * @param {Date|string} date
 * @param {Date|string} [refDate=new Date()]
 * @returns {{ bold: string, subtitle: string, isToday: boolean, isOverdue: boolean }}
 */
export function getTimelineDateComponents(date, refDate = new Date()) {
  const target = new Date(date);
  const now = new Date(refDate);

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  const monthDay = target.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const weekday = target.toLocaleDateString([], { weekday: 'long' });

  if (diffDays === 0) {
    return { bold: 'Today', subtitle: `${weekday}, ${monthDay}`, isToday: true, isOverdue: false };
  }
  if (diffDays === 1) {
    return { bold: 'Tomorrow', subtitle: `${weekday}, ${monthDay}`, isToday: false, isOverdue: false };
  }
  if (diffDays < 0) {
    return { bold: monthDay, subtitle: `${weekday} (Overdue)`, isToday: false, isOverdue: true };
  }
  return { bold: monthDay, subtitle: weekday, isToday: false, isOverdue: false };
}

/**
 * Returns a human-friendly header for a date group in the popup list view.
 * @param {Date|string} date
 * @param {Date|string} [refDate=new Date()]
 * @returns {string}
 */
export function formatDateGroupHeader(date, refDate = new Date()) {
  const target = new Date(date);
  const now = new Date(refDate);

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  const monthDay = target.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const weekday = target.toLocaleDateString([], { weekday: 'short' });

  if (diffDays === 0) return `Today · ${monthDay}`;
  if (diffDays === 1) return `Tomorrow · ${monthDay}`;
  if (diffDays === -1) return `Yesterday · ${monthDay}`;
  if (diffDays < -1) return `${monthDay} · ${Math.abs(diffDays)} days ago`;
  if (diffDays > 1 && diffDays <= 6) return `${weekday} · ${monthDay}`;

  return `${weekday}, ${monthDay}`;
}

/**
 * Groups an array of dues into chronological date buckets for the popup list view.
 * @param {Array<object>} dues
 * @returns {{ overdue: Array<object>, dateGroups: Array<{ dateKey: string, header: string, items: Array<object> }>, completed: Array<object> }}
 */
export function groupDuesByDate(dues, refDate = new Date()) {
  const now = new Date(refDate);
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const overdue = [];
  const completed = [];
  const dateMap = new Map();

  for (const due of dues || []) {
    if (due.completed) {
      completed.push(due);
      continue;
    }

    const dueTime = new Date(due.dueDate);
    const dueMidnight = new Date(dueTime.getFullYear(), dueTime.getMonth(), dueTime.getDate()).getTime();

    if (dueMidnight < nowMidnight) {
      overdue.push(due);
    } else {
      const dateKey = `${dueTime.getFullYear()}-${String(dueTime.getMonth() + 1).padStart(2, '0')}-${String(dueTime.getDate()).padStart(2, '0')}`;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey,
          sampleDate: dueTime,
          items: [],
        });
      }
      dateMap.get(dateKey).items.push(due);
    }
  }

  // Sort date keys chronologically
  const sortedKeys = Array.from(dateMap.keys()).sort();
  const dateGroups = sortedKeys.map((key) => {
    const group = dateMap.get(key);
    // Sort items within each day by time
    group.items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return {
      dateKey: key,
      sampleDate: group.sampleDate,
      header: formatDateGroupHeader(group.sampleDate, now),
      components: getTimelineDateComponents(group.sampleDate, now),
      items: group.items,
    };
  });

  return {
    overdue,
    dateGroups,
    completed,
  };
}
