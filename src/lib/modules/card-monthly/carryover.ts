export const CARRYOVER_DESCRIPTION_PREFIX = "Saldo pendiente ";

export function isCarryoverDescription(description: string | null | undefined): boolean {
  return !!description && description.startsWith(CARRYOVER_DESCRIPTION_PREFIX);
}