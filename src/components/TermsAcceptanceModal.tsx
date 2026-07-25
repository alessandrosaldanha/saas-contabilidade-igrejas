import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";

// Versão vigente do termo — precisa bater com o valor gravado por
// accept_terms() (supabase/migrations/0011_terms_acceptance.sql). Alterar o
// texto abaixo de forma relevante deve vir acompanhado de um incremento desta
// constante, para que usuários que já aceitaram uma versão anterior sejam
// obrigados a aceitar a nova (não é feito automaticamente — a coluna
// profiles.termo_aceito só vira false de novo via migration dedicada, se e
// quando isso for necessário).
export const TERMS_VERSION = "1.0";

export default function TermsAcceptanceModal() {
  const { refreshProfile } = useAuth();
  const { showToastMsg } = useApp();

  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!checked || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("accept_terms", { p_versao_termo: TERMS_VERSION });
      if (error) throw new Error(error.message);
      await refreshProfile();
    } catch (err) {
      showToastMsg(`Falha ao registrar aceite: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[640px] max-h-[90vh] flex flex-col rounded-lg shadow-md">
        <div className="flex items-center gap-3 p-5 sm:p-8 pb-4 sm:pb-4 border-b border-neutral-200 dark:border-white/10">
          <span className="w-10 h-10 rounded-full bg-orla-blue/15 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} className="text-orla-blue" />
          </span>
          <div>
            <h3 className="font-display font-semibold text-lg m-0">Termos de Uso e Responsabilidade</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Versão {TERMS_VERSION} — leitura obrigatória antes de continuar
            </p>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-8 py-5 flex flex-col gap-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <p>
            Esta plataforma oferece serviços de <strong>gestão contábil e financeira para igrejas locais</strong>,
            incluindo controle de lançamentos (Livro Caixa), leitura e categorização automatizada de extratos
            bancários por Inteligência Artificial, geração de relatórios e trilha de auditoria. Ao clicar em
            "Li e Aceito os Termos" abaixo, você declara ter lido, compreendido e concordado integralmente com
            as cláusulas a seguir.
          </p>

          <div>
            <h4 className="font-semibold text-black dark:text-white mb-1">1. Responsabilidade pela guarda das credenciais</h4>
            <p>
              O acesso à plataforma é individual e intransferível. A guarda do login, senha e de qualquer outro
              método de autenticação é de <strong>responsabilidade exclusiva do usuário</strong>, que deve
              adotar senhas fortes, não compartilhá-las com terceiros e manter seu dispositivo livre de
              malware. O usuário é o único responsável por qualquer ação realizada em sua conta, tenha sido
              feita por ele ou por terceiro que tenha obtido acesso às suas credenciais.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-black dark:text-white mb-1">2. Isenção de responsabilidade por vazamento de dados</h4>
            <p>
              O desenvolvedor e mantenedor da plataforma <strong>não se responsabiliza</strong> por vazamento,
              acesso indevido ou uso não autorizado de dados decorrente de ação, omissão ou descuido do
              usuário — incluindo, mas não se limitando a: compartilhamento de senha, uso de senha fraca ou
              reaproveitada, sessão deixada aberta em dispositivo compartilhado, engenharia social (phishing e
              similares) e infecção por malware no dispositivo do usuário. Nesses casos, a responsabilidade
              civil e/ou criminal recai integralmente sobre quem deu causa ao incidente.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-black dark:text-white mb-1">3. Uso de Inteligência Artificial como ferramenta auxiliar</h4>
            <p>
              A leitura e categorização de extratos bancários por IA é uma <strong>ferramenta de apoio</strong>,
              não um serviço de contabilidade certificada. Toda categorização, valor extraído ou lançamento
              sugerido pela IA exige <strong>conferência prévia do gestor/tesoureiro responsável</strong> antes
              de sua aprovação definitiva no Livro Caixa. A plataforma não se responsabiliza por decisões
              tomadas com base em dados gerados pela IA sem essa revisão humana.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-black dark:text-white mb-1">4. Isenção sobre a exatidão de dados e relatórios</h4>
            <p>
              Os relatórios, saldos e demais informações exibidos refletem exclusivamente os dados, arquivos
              (PDF, imagens ou planilhas) e lançamentos inseridos pelos próprios usuários da igreja. A
              plataforma não audita nem valida a veracidade desses dados na origem — eventuais
              inconsistências, erros de digitação, arquivos ilegíveis ou informações incorretas fornecidas
              pelo usuário são de responsabilidade exclusiva de quem os inseriu ou enviou, isentando o
              desenvolvedor de qualquer responsabilidade por decisões tomadas com base em relatórios não
              revisados.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-black dark:text-white mb-1">5. Vigência e aceite</h4>
            <p>
              Este termo se aplica a partir do primeiro acesso e permanece vigente enquanto durar o uso da
              plataforma. O aceite é registrado de forma auditável (data, hora, IP e versão do termo) e pode
              ser exigido novamente caso o conteúdo deste termo seja revisado de forma relevante.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-8 pt-4 border-t border-neutral-200 dark:border-white/10">
          <label className="flex items-start gap-2.5 text-sm mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>
              Declaro que li e concordo integralmente com os Termos de Uso e Responsabilidade acima,
              incluindo a isenção de responsabilidade da plataforma sobre o mau uso das minhas credenciais e
              sobre a exatidão dos dados que eu mesmo inserir ou enviar.
            </span>
          </label>
          <div className="flex justify-end">
            <button
              onClick={handleAccept}
              disabled={!checked || submitting}
              className="px-5 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Registrando aceite…" : "Li e Aceito os Termos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
