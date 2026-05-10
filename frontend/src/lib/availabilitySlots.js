/** Two half-open-style intervals [start, end) in hours overlap if they share any instant (touching at boundary does not overlap). */
export function hourIntervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/** Returns conflicting slot or null. Optionally skip one id when editing. */
export function findAvailabilityConflict(slots, dayOfWeek, startHour, endHour, excludeId = null) {
  for (const s of slots ?? []) {
    if (s.dayOfWeek !== dayOfWeek) continue;
    if (excludeId != null && s.id === excludeId) continue;
    if (hourIntervalsOverlap(startHour, endHour, s.startHour, s.endHour)) {
      return s;
    }
  }
  return null;
}

export function availabilityConflictMessage(dayOfWeek, startHour, endHour, conflict) {
  if (
    conflict &&
    conflict.startHour === startHour &&
    conflict.endHour === endHour
  ) {
    return `You already have this slot on ${dayOfWeek} (${startHour}:00–${endHour}:00).`;
  }
  return `That time overlaps another slot on ${dayOfWeek}. Adjust or remove the existing entry first.`;
}
