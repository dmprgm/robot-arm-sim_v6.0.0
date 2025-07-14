// src/utils/saveAsCSV.ts

export function saveAsCSV(rows: string[][], filename: string) {
  const csvContent = rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url =  URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
