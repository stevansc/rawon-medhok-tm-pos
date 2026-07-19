export function formatTimeGMT7(dateString: string): string {
  if (!dateString) return '';
  const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
  const date = new Date(utcString);
  return date.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta' });
}

export function formatDateGMT7(dateString: string): string {
  if (!dateString) return '';
  const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
  const date = new Date(utcString);
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta' });
}
