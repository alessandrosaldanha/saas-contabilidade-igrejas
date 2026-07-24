export function fmt(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  const s = abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "- R$ " : "+ R$ ") + s;
}

export function fmtPlain(n: number): string {
  return "R$ " + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtK(v: number): string {
  return `R$ ${Math.round(v)}k`;
}

export function fmtBRLFull(v: number): string {
  return "R$ " + (v * 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
