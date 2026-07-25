import { lookupCep } from "../utils/cep";

export interface ChurchFormState {
  name: string;
  email: string;
  cnpj: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  parentChurchId: string; // "" = nenhuma (Igreja Principal)
}

export const EMPTY_CHURCH_FORM: ChurchFormState = {
  name: "",
  email: "",
  cnpj: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  uf: "",
  parentChurchId: "",
};

const inputCls =
  "w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none";
const labelCls = "block text-sm font-medium mb-1.5";

interface ChurchFormFieldsProps {
  values: ChurchFormState;
  onChange: (patch: Partial<ChurchFormState>) => void;
  parentOptions: { id: string; name: string }[];
}

export default function ChurchFormFields({ values, onChange, parentOptions }: ChurchFormFieldsProps) {
  const handleCepBlur = async () => {
    const result = await lookupCep(values.cep);
    if (result) {
      onChange({
        street: result.street || values.street,
        neighborhood: result.neighborhood || values.neighborhood,
        city: result.city || values.city,
        uf: result.uf || values.uf,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <label className="block">
        <span className={labelCls}>Nome da Igreja *</span>
        <input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Igreja Batista Reformada"
          className={inputCls}
        />
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="block sm:w-[160px]">
          <span className={labelCls}>CEP *</span>
          <input
            value={values.cep}
            onChange={(e) => onChange({ cep: e.target.value })}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            className={inputCls}
          />
        </label>
        <label className="block flex-1">
          <span className={labelCls}>Rua *</span>
          <input
            value={values.street}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="Preenchido automaticamente pelo CEP"
            className={inputCls}
          />
        </label>
        <label className="block sm:w-[120px]">
          <span className={labelCls}>Número *</span>
          <input
            value={values.number}
            onChange={(e) => onChange({ number: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="block flex-1">
          <span className={labelCls}>Bairro *</span>
          <input
            value={values.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block flex-1">
          <span className={labelCls}>Cidade *</span>
          <input value={values.city} onChange={(e) => onChange({ city: e.target.value })} className={inputCls} />
        </label>
        <label className="block sm:w-[100px]">
          <span className={labelCls}>UF *</span>
          <input
            value={values.uf}
            onChange={(e) => onChange({ uf: e.target.value.toUpperCase().slice(0, 2) })}
            maxLength={2}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="block flex-1">
          <span className={labelCls}>E-mail da Igreja</span>
          <input
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="contato@igreja.org"
            className={inputCls}
          />
        </label>
        <label className="block flex-1">
          <span className={labelCls}>Telefone</span>
          <input value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>CNPJ</span>
        <input value={values.cnpj} onChange={(e) => onChange({ cnpj: e.target.value })} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Igreja Mãe</span>
        <select
          value={values.parentChurchId}
          onChange={(e) => onChange({ parentChurchId: e.target.value })}
          className={inputCls}
        >
          <option value="">Nenhuma (Igreja Principal)</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
