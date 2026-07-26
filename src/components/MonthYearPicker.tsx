import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS_FULL } from "../services/mockData";

interface MonthYearPickerProps {
  year: number;
  month: number; // 0-11
  onChange: (year: number, month: number) => void;
}

// Navegação de Mês/Ano padrão do app (botão `<` + rótulo com ícone de
// calendário abrindo um popover de mês/ano + botão `>`) — usado no Livro
// Caixa e na Trilha de Auditoria, para as duas telas navegarem por período
// de forma idêntica.
export default function MonthYearPicker({ year, month, onChange }: MonthYearPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const goPrevMonth = () => {
    if (month === 0) onChange(year - 1, 11);
    else onChange(year, month - 1);
  };
  const goNextMonth = () => {
    if (month === 11) onChange(year + 1, 0);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goPrevMonth}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20"
      >
        <ChevronLeft size={15} />
      </button>
      <div className="relative">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-2 font-display font-semibold text-sm min-w-[150px] justify-center px-3 py-1.5 rounded-md border border-transparent hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <CalendarDays size={14} className="text-neutral-400" />
          {MONTHS_FULL[month]} de {year}
        </button>

        {pickerOpen && (
          <div className="absolute z-20 top-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg shadow-md p-3.5 w-[260px]">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => onChange(year - 1, month)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-display font-semibold text-sm">{year}</span>
              <button
                onClick={() => onChange(year + 1, month)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_FULL.map((label, i) => (
                <button
                  key={label}
                  onClick={() => {
                    onChange(year, i);
                    setPickerOpen(false);
                  }}
                  className={`text-xs py-2 rounded-md font-medium ${
                    i === month
                      ? "bg-orla-blue text-white"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={goNextMonth}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
