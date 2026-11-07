export const CARRYOVER_DESCRIPTION_PREFIX = "Saldo pendiente ";

export function isCardCarryover(description: string | null): boolean {
  return !!description?.startsWith(CARRYOVER_DESCRIPTION_PREFIX) &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(description.slice(CARRYOVER_DESCRIPTION_PREFIX.length));
}
