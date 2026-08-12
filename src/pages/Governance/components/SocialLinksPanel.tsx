import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Check, Loader2 } from "lucide-react";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../services/supabase";
import { SOCIAL_PLATFORM_META, isValidSocialUrl, mapSocialLinkRow } from "../../../utils/socialLinks";
import type { SocialLink, SocialPlatform } from "../../../types";

// Seção "Redes Sociais" da aba "Landing Page" da Governança — só o master
// chega aqui (rota /governanca restrita a `allowedRoles={["master"]}`, ver
// App.tsx). As 4 redes já vêm seedadas (migration 0030); aqui só edita URL,
// liga/desliga e reordena — sem criar/remover linha, mesmo espírito de
// LandingImagesPanel (seções fixas).
export default function SocialLinksPanel() {
  const { showToastMsg } = useApp();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [urlDrafts, setUrlDrafts] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [savingPlatform, setSavingPlatform] = useState<SocialPlatform | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("social_links").select("*").order("display_order");
    if (data) {
      const rows = data.map(mapSocialLinkRow);
      setLinks(rows);
      setUrlDrafts(Object.fromEntries(rows.map((r) => [r.platform, r.url ?? ""])));
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveUrl = async (platform: SocialPlatform) => {
    const draft = (urlDrafts[platform] ?? "").trim();
    if (draft && !isValidSocialUrl(draft)) {
      showToastMsg("URL inválida — use um endereço completo iniciando com https://");
      return;
    }
    setSavingPlatform(platform);
    const { error } = await supabase
      .from("social_links")
      .update({ url: draft || null, updated_at: new Date().toISOString() })
      .eq("platform", platform);
    setSavingPlatform(null);
    if (error) {
      showToastMsg(`Falha ao salvar URL: ${error.message}`);
      return;
    }
    setLinks((prev) => prev.map((l) => (l.platform === platform ? { ...l, url: draft || null } : l)));
    showToastMsg("URL atualizada com sucesso");
  };

  const toggleActive = async (link: SocialLink) => {
    if (!link.isActive && !isValidSocialUrl(link.url ?? "")) {
      showToastMsg("Cadastre uma URL válida (https://) antes de ativar esta rede social.");
      return;
    }
    const nextActive = !link.isActive;
    setLinks((prev) => prev.map((l) => (l.platform === link.platform ? { ...l, isActive: nextActive } : l)));
    const { error } = await supabase
      .from("social_links")
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq("platform", link.platform);
    if (error) {
      showToastMsg(`Falha ao atualizar status: ${error.message}`);
      refresh();
      return;
    }
    showToastMsg(nextActive ? "Rede social ativada" : "Rede social desativada");
  };

  const moveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const current = links[index];
    const target = links[targetIndex];
    const reordered = [...links];
    reordered[index] = { ...target, displayOrder: current.displayOrder };
    reordered[targetIndex] = { ...current, displayOrder: target.displayOrder };
    reordered.sort((a, b) => a.displayOrder - b.displayOrder);
    setLinks(reordered);
    const { error } = await supabase.from("social_links").upsert([
      { platform: current.platform, display_order: target.displayOrder },
      { platform: target.platform, display_order: current.displayOrder },
    ]);
    if (error) {
      showToastMsg(`Falha ao reordenar: ${error.message}`);
      refresh();
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h4 className="font-display font-semibold text-sm m-0">Redes Sociais</h4>
        <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1">
          Cadastre a URL de cada rede e ative as que devem aparecer no footer da landing, na ordem definida aqui. Uma
          rede sem URL válida não pode ser ativada.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        ) : (
          links.map((link, index) => {
            const meta = SOCIAL_PLATFORM_META.find((m) => m.platform === link.platform);
            if (!meta) return null;
            const Icon = meta.icon;
            const isSaving = savingPlatform === link.platform;
            return (
              <div
                key={link.platform}
                className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-md border border-neutral-300 dark:border-white/10"
              >
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Icon size={16} className="text-orla-blue" />
                  <span className="text-sm font-medium">{meta.label}</span>
                </div>

                <input
                  value={urlDrafts[link.platform] ?? ""}
                  onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [link.platform]: e.target.value }))}
                  placeholder="https://…"
                  className="flex-1 min-w-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded-md px-3 py-2 text-sm outline-none"
                />

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => saveUrl(link.platform)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Salvar
                  </button>
                  <button
                    onClick={() => toggleActive(link)}
                    title={link.isActive ? "Clique para desativar" : "Clique para ativar"}
                    className="px-3 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5"
                  >
                    <Badge tone={link.isActive ? "success" : "neutral"} appearance="outline" dot>
                      {link.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </button>
                  <button
                    onClick={() => moveOrder(index, -1)}
                    disabled={index === 0}
                    title="Mover para cima"
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveOrder(index, 1)}
                    disabled={index === links.length - 1}
                    title="Mover para baixo"
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
