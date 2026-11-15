export function getDropdownPosition(trigger: HTMLElement) {
  const { top, bottom, left, width } = trigger.getBoundingClientRect();
  const gap = 4;
  const margin = 8;
  const above = top - gap - margin;
  const below = window.innerHeight - bottom - gap - margin;
  const openAbove = below < 180 && above > below;
  const popupWidth = Math.min(width, window.innerWidth - margin * 2);
  return {
    top: openAbove ? undefined : bottom + gap,
    bottom: openAbove ? window.innerHeight - top + gap : undefined,
    left: Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin)),
    width: popupWidth,
    maxHeight: Math.max(0, openAbove ? above : below),
  };
}
