import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = index === openIndex;
        return (
          <div
            key={item.question}
            className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
            >
              <span className="font-medium text-sm sm:text-base">{item.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-neutral-700 dark:text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
