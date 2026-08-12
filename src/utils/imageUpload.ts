import { supabase } from "../services/supabase";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface UploadImageResult {
  url: string | null;
  error: string | null;
}

// Envia uma imagem a um bucket público de Storage e devolve a URL pública —
// mesmo padrão usado pelo QR Code Pix (EditPlanModal), agora compartilhado
// com a nova aba "Landing Page" da Governança. Valida tipo e tamanho antes
// de subir, o que o fluxo do QR Code ainda não fazia.
export async function uploadImageToBucket(bucket: string, path: string, file: File): Promise<UploadImageResult> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Selecione um arquivo de imagem (PNG, JPG, SVG ou WebP)." };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { url: null, error: "A imagem deve ter no máximo 5MB." };
  }
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
