// Cycle math for the "Ciclo" tab. The naive version (`daysSinceStart % length`)
// silently starts a new cycle when the period is late, which is exactly the
// moment the user most needs the app to say "you're 3 days late". Here the
// count keeps going (day 31, 32…) while she's late, and future days on the
// calendar assume the period starts tomorrow.
// Simplified from the app (which uses date-fns); dates are ISO "YYYY-MM-DD".

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/** Days the period is late today (0 when it isn't due yet). */
function lateDays(cycle, today) {
  const sinceStart = dayNumber(today) - dayNumber(cycle.lastPeriodStart);
  return Math.max(0, sinceStart + 1 - cycle.cycleLength);
}

/** Day of the cycle (1-based) on `date`, as seen from `today`. */
function dayInCycle(cycle, date, today) {
  const offset = dayNumber(date) - dayNumber(cycle.lastPeriodStart);
  const todayOffset = dayNumber(today) - dayNumber(cycle.lastPeriodStart);
  const L = cycle.cycleLength;
  if (offset < 0 || todayOffset < L) return mod(offset, L) + 1;
  if (offset <= todayOffset) return offset + 1; // late: keep counting
  return mod(offset - todayOffset - 1, L) + 1; // future: assume it starts tomorrow
}

function cyclePhase(cycle, date, today = date) {
  const day = dayInCycle(cycle, date, today);
  if (day <= cycle.periodLength) return 'menstrual';
  if (day <= cycle.cycleLength / 2 - 1) return 'follicular';
  if (day <= cycle.cycleLength / 2 + 2) return 'ovulation';
  return 'luteal';
}

const MIN_CYCLE = 15;
const MAX_CYCLE = 60;
const AVERAGE_OVER = 6;

/**
 * Average of the recent real cycles between logged period starts (like
 * Flo/Clue), or null until there's one complete cycle. Gaps outside 15-60
 * days are a forgotten or mistyped log, not a cycle, so they're skipped.
 */
function averageCycleLength(starts) {
  const sorted = [...new Set(starts)].sort();
  const lengths = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = dayNumber(sorted[i]) - dayNumber(sorted[i - 1]);
    if (days >= MIN_CYCLE && days <= MAX_CYCLE) lengths.push(days);
  }
  const recent = lengths.slice(-AVERAGE_OVER);
  if (!recent.length) return null;
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

module.exports = { lateDays, dayInCycle, cyclePhase, averageCycleLength };
