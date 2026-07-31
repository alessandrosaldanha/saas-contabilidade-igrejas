import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../../services/supabase";
import { useApp } from "../../../context/AppContext";

interface AddChildChurchModalProps {
  parentChurchId: string;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  "w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none";
const labelCls = "block text-sm font-medium mb-1.5";

// Cadastro rápido de igreja filha/subcongregação — só o essencial (nome +
// responsável); endereço completo e o login do responsável são preenchidos
// depois, na própria página de Detalhes da subcongregação recém-criada.
export default function AddChildChurchModal({ parentChurchId, onClose, onCreated }: AddChildChurchModalProps) {
  const { showToastMsg } = useApp();
  const [name, setName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      showToastMsg("Informe o nome da igreja filha.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.rpc("create_child_church", {
      p_parent_church_id: parentChurchId,
      p_name: name.trim(),
      p_responsible_name: responsibleName.trim() || null,
      p_email: email.trim() || null,
      p_phone: phone.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao cadastrar igreja filha: ${error.message}`);
      return;
    }
    showToastMsg(`Igreja filha "${name.trim()}" cadastrada com sucesso`);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg m-0">Adicionar Igreja Filha</h3>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className={labelCls}>Nome da Igreja Filha</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Igreja Batista Reformada - Pilar"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Nome do Responsável</span>
            <input
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              placeholder="Quem responde por esta subcongregação"
              className={inputCls}
            />
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="block flex-1">
              <span className={labelCls}>E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" className={inputCls} />
            </label>
            <label className="block flex-1">
              <span className={labelCls}>Telefone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-neutral-700 dark:text-neutral-400 -mt-1">
            Endereço completo e o login do responsável podem ser preenchidos depois, na página de detalhes da
            subcongregação.
          </p>
        </div>

        <div className="flex justify-end gap-2.5 mt-6.5">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Cadastrando…" : "Cadastrar Igreja Filha"}
          </button>
        </div>
      </div>
    </div>
  );
}
