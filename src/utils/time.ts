export function formatTimeGMT7(dateString: string | undefined): string {
  if (!dateString) return '';
  let parseString = dateString;
  if (!dateString.includes('Z') && !dateString.match(/[+-]\d{2}:?\d{2}$/)) {
    parseString += 'Z';
  }
  const date = new Date(parseString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
}

export function formatDateGMT7(dateString: string | undefined): string {
  if (!dateString) return '';
  let parseString = dateString;
  if (!dateString.includes('Z') && !dateString.match(/[+-]\d{2}:?\d{2}$/)) {
    parseString += 'Z';
  }
  const date = new Date(parseString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' });
}
