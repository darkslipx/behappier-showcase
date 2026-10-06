// Contas do ciclo da aba "Ciclo". A versão ingênua (`diasDesdeOInicio % duração`)
// começa um ciclo novo em silêncio quando a menstruação atrasa, que é
// justamente quando a usuária mais precisa que o app diga "você está 3 dias
// atrasada". Aqui a contagem continua (dia 31, 32…) durante o atraso, e os
// dias futuros no calendário supõem que a menstruação vem amanhã.
// Simplificado do app (que usa date-fns); datas no formato ISO "AAAA-MM-DD".

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/** Dias de atraso hoje (0 quando ainda não está na data). */
function lateDays(cycle, today) {
  const sinceStart = dayNumber(today) - dayNumber(cycle.lastPeriodStart);
  return Math.max(0, sinceStart + 1 - cycle.cycleLength);
}

/** Dia do ciclo (começando em 1) em `date`, visto a partir de `today`. */
function dayInCycle(cycle, date, today) {
  const offset = dayNumber(date) - dayNumber(cycle.lastPeriodStart);
  const todayOffset = dayNumber(today) - dayNumber(cycle.lastPeriodStart);
  const L = cycle.cycleLength;
  if (offset < 0 || todayOffset < L) return mod(offset, L) + 1;
  if (offset <= todayOffset) return offset + 1; // atrasada: continua contando
  return mod(offset - todayOffset - 1, L) + 1; // futuro: supõe que vem amanhã
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
 * Média dos ciclos reais mais recentes entre os inícios registrados (como o
 * Flo e o Clue), ou null até existir um ciclo completo. Intervalos fora de
 * 15 a 60 dias são um registro esquecido ou digitado errado, não um ciclo,
 * então ficam de fora.
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
