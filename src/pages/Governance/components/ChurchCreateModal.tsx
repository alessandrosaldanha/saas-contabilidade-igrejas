import { useState } from "react";
import { X } from "lucide-react";
import ChurchFormFields, { ChurchFormState, EMPTY_CHURCH_FORM } from "../../../components/ChurchFormFields";
import { supabase } from "../../../services/supabase";
import { useApp } from "../../../context/AppContext";

interface ChurchCreateModalProps {
  parentOptions: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: ChurchFormState): string | null {
  if (!values.name.trim()) return "Informe o nome da igreja.";
  if (!values.cep.replace(/\D/g, "")) return "Informe o CEP.";
  if (!values.street.trim()) return "Informe a rua.";
  if (!values.number.trim()) return "Informe o número.";
  if (!values.neighborhood.trim()) return "Informe o bairro.";
  if (!values.city.trim()) return "Informe a cidade.";
  if (!values.uf.trim() || values.uf.trim().length !== 2) return "Informe a UF (2 letras).";
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) return "E-mail inválido.";
  return null;
}

export default function ChurchCreateModal({ parentOptions, onClose, onCreated }: ChurchCreateModalProps) {
  const { showToastMsg } = useApp();
  const [values, setValues] = useState<ChurchFormState>(EMPTY_CHURCH_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const patch = (p: Partial<ChurchFormState>) => setValues((v) => ({ ...v, ...p }));

  const submit = async () => {
    const error = validate(values);
    if (error) {
      showToastMsg(error);
      return;
    }
    setIsSaving(true);
    const { error: dbError } = await supabase.from("churches").insert({
      name: values.name.trim(),
      email: values.email.trim() || null,
      cnpj: values.cnpj.trim() || null,
      phone: values.phone.trim() || null,
      cep: values.cep.trim(),
      street: values.street.trim(),
      number: values.number.trim(),
      neighborhood: values.neighborhood.trim(),
      city: values.city.trim(),
      uf: values.uf.trim().toUpperCase(),
      parent_church_id: values.parentChurchId || null,
    });
    setIsSaving(false);
    if (dbError) {
      showToastMsg(`Falha ao cadastrar igreja: ${dbError.message}`);
      return;
    }
    showToastMsg(`Igreja "${values.name.trim()}" cadastrada com sucesso`);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg m-0">Nova Igreja</h3>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>

        <ChurchFormFields values={values} onChange={patch} parentOptions={parentOptions} />

        <div className="flex justify-end gap-2.5 mt-6.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Cadastrando…" : "Cadastrar Igreja"}
          </button>
        </div>
      </div>
    </div>
  );
}
