export function maskCedula(cedula: string): string {
  if (cedula.length <= 4) return '****';
  return `${cedula.slice(0, 2)}******${cedula.slice(-2)}`;
}

export function maskTicketCode(code: string): string {
  if (code.length <= 2) return '••••••';
  return `${code.slice(0, 2)}••••`;
}

export function formatPoints(points: number): string {
  return `${points.toLocaleString('es-EC')} pts`;
}

export function normalizeCedula(value: string): string {
  return value.replace(/\D/g, '').slice(0, 13);
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
