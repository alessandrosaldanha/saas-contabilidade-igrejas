import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Upload, Loader2, ImageOff, Trash2 } from "lucide-react";
import Card from "../../../components/Card";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../services/supabase";
import { uploadImageToBucket } from "../../../utils/imageUpload";
import { LANDING_IMAGE_SECTIONS, mapLandingImageRow } from "../../../utils/landingImages";
import type { LandingImageKey } from "../../../types";

const LANDING_IMAGES_BUCKET = "landing-images";

// Aba "Landing Page" da Governança — só o master chega aqui (rota /governanca
// restrita a `allowedRoles={["master"]}`, ver App.tsx). Um card por seção
// fixa da landing (seed da migration 0029); trocar a imagem aqui reflete
// direto em `src/pages/Landing/Landing.tsx`, que lê a mesma tabela sem login.
export default function LandingImagesPanel() {
  const { showToastMsg } = useApp();
  const [images, setImages] = useState<Partial<Record<LandingImageKey, string | null>>>({});
  const [uploadingKey, setUploadingKey] = useState<LandingImageKey | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("landing_images").select("key, image_url");
    if (data) {
      const map: Partial<Record<LandingImageKey, string | null>> = {};
      data.map(mapLandingImageRow).forEach((row) => {
        map[row.key] = row.imageUrl;
      });
      setImages(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveImageUrl = async (key: LandingImageKey, url: string | null) => {
    const { error } = await supabase
      .from("landing_images")
      .update({ image_url: url, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) {
      showToastMsg(`Falha ao salvar imagem: ${error.message}`);
      return;
    }
    setImages((prev) => ({ ...prev, [key]: url }));
    showToastMsg(url ? "Imagem atualizada com sucesso" : "Imagem removida");
  };

  const handleUpload = async (key: LandingImageKey, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingKey(key);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${key}-${Date.now()}.${ext}`;
    const { url, error } = await uploadImageToBucket(LANDING_IMAGES_BUCKET, path, file);
    setUploadingKey(null);
    if (error) {
      showToastMsg(`Falha ao enviar imagem: ${error}`);
      return;
    }
    await saveImageUrl(key, url);
  };

  return (
    <div>
      <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-4.5">
        Envie as imagens de produto exibidas na landing page. Uma seção sem imagem cadastrada continua exibindo
        normalmente, só com o texto — nenhuma quebra visual. Alterações refletem imediatamente na página pública.
      </p>

      {/* max-w-sm no card: sem isso, com só 1 seção (`sobre_nos`) sobrando
          aqui, o `auto-fit`/`1fr` da grade abaixo (pensada pra até 6 cards)
          estica o único card pra ocupar 100% da largura do painel — e o
          preview (h-52 fixo, não mais atado a essa largura via aspect-video)
          virava gigante, exigindo scroll. */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {LANDING_IMAGE_SECTIONS.map(({ key, label }) => {
          const imageUrl = images[key];
          const isUploading = uploadingKey === key;
          return (
            <Card key={key} className="flex flex-col gap-3.5 max-w-sm">
              <h4 className="font-display font-semibold text-sm m-0">{label}</h4>

              <div className="w-full h-52 rounded-md border border-neutral-300 dark:border-white/20 flex items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-950 shrink-0">
                {loading ? (
                  <Loader2 size={18} className="animate-spin text-neutral-400" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={20} className="text-neutral-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer">
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {isUploading ? "Enviando…" : imageUrl ? "Trocar imagem" : "Enviar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(key, e)}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                {imageUrl && (
                  <button
                    onClick={() => saveImageUrl(key, null)}
                    title="Remover imagem"
                    disabled={isUploading}
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
