import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Upload, Loader2, ArrowUp, ArrowDown, Trash2, GalleryHorizontal } from "lucide-react";
import Card from "../../../components/Card";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../services/supabase";
import { uploadImageToBucket } from "../../../utils/imageUpload";
import { mapLandingHeroImageRow } from "../../../utils/landingHeroImages";
import type { LandingHeroImage } from "../../../types";

const LANDING_IMAGES_BUCKET = "landing-images";

// Seção "Hero (carrossel)" da aba "Landing Page" da Governança — só o
// master chega aqui (rota /governanca restrita a `allowedRoles={["master"]}`,
// ver App.tsx). Diferente de `LandingImagesPanel` (1 imagem fixa por seção),
// aqui o master pode adicionar, remover e reordenar várias imagens — ver
// migration 0031 (`landing_hero_images`) e `HeroCarousel.tsx`, que decide
// estático (1 imagem) vs. carrossel (2+) na landing pública.
export default function HeroImagesPanel() {
  const { showToastMsg } = useApp();
  const [images, setImages] = useState<LandingHeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("landing_hero_images").select("*").order("display_order");
    if (data) setImages(data.map(mapLandingHeroImageRow));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `hero-${Date.now()}.${ext}`;
    const { url, error } = await uploadImageToBucket(LANDING_IMAGES_BUCKET, path, file);
    if (error || !url) {
      setUploading(false);
      showToastMsg(`Falha ao enviar imagem: ${error}`);
      return;
    }
    const nextOrder = images.length > 0 ? Math.max(...images.map((i) => i.displayOrder)) + 1 : 0;
    const { error: insertError } = await supabase
      .from("landing_hero_images")
      .insert({ image_url: url, display_order: nextOrder });
    setUploading(false);
    if (insertError) {
      showToastMsg(`Falha ao salvar imagem: ${insertError.message}`);
      return;
    }
    showToastMsg("Imagem adicionada ao carrossel");
    refresh();
  };

  const handleRemove = async (image: LandingHeroImage) => {
    const { error } = await supabase.from("landing_hero_images").delete().eq("id", image.id);
    if (error) {
      showToastMsg(`Falha ao remover imagem: ${error.message}`);
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    showToastMsg("Imagem removida do carrossel");
  };

  const moveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const current = images[index];
    const target = images[targetIndex];
    const reordered = [...images];
    reordered[index] = { ...target, displayOrder: current.displayOrder };
    reordered[targetIndex] = { ...current, displayOrder: target.displayOrder };
    reordered.sort((a, b) => a.displayOrder - b.displayOrder);
    setImages(reordered);
    const { error } = await supabase.from("landing_hero_images").upsert([
      { id: current.id, image_url: current.imageUrl, display_order: target.displayOrder },
      { id: target.id, image_url: target.imageUrl, display_order: current.displayOrder },
    ]);
    if (error) {
      showToastMsg(`Falha ao reordenar: ${error.message}`);
      refresh();
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-display font-semibold text-sm m-0 flex items-center gap-2">
            <GalleryHorizontal size={15} className="text-orla-blue" />
            Hero (carrossel)
          </h4>
          <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1">
            Com 1 imagem, o Hero exibe ela fixa. Com 2 ou mais, gira automaticamente em carrossel na ordem definida
            aqui.
          </p>
        </div>
        <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer shrink-0">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Enviando…" : "Adicionar imagem"}
          <input type="file" accept="image/*" onChange={handleAdd} disabled={uploading} className="hidden" />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-neutral-400" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-sm text-neutral-700 dark:text-neutral-400 text-center py-4">
          Nenhuma imagem cadastrada — o Hero exibe só o texto.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex items-center gap-3 p-3 rounded-md border border-neutral-300 dark:border-white/10"
            >
              <div className="w-24 aspect-video rounded-md overflow-hidden border border-neutral-300 dark:border-white/20 shrink-0 bg-neutral-100 dark:bg-neutral-950">
                <img src={image.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="flex-1 text-xs text-neutral-700 dark:text-neutral-400">Posição {index + 1}</span>
              <div className="flex items-center gap-2 shrink-0">
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
                  disabled={index === images.length - 1}
                  title="Mover para baixo"
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-30"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => handleRemove(image)}
                  title="Remover imagem"
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
