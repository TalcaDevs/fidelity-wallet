export const validateRUT = (rut: string): boolean => {
  const clean = rut.replace(/[\.\-]/g, '');
  if (!/^[0-9]+[0-9kK]$/.test(clean) || clean.length < 7) return false;
  
  const num = clean.slice(0, -1);
  if (parseInt(num, 10) === 0) return false;

  const dv = clean.slice(-1).toLowerCase();
  
  let M = 0, S = 1;
  let T = parseInt(num, 10);
  for (; T; T = Math.floor(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  const calcDv = (S ? S - 1 : 'k').toString();
  return calcDv === dv;
};

export const isPhone = (val: string): boolean => {
  return /^\+?[0-9]{8,15}$/.test(val.replace(/\s/g, ''));
};
