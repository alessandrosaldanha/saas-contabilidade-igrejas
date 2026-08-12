import type { LandingImage, LandingImageKey } from "../types";

// Metadados das seções editáveis 1:1 (ordem = ordem de exibição no Painel
// de Governança); a chave é o que casa com o seed da migration 0029 e com
// o que a Landing usa para buscar cada imagem. O Hero saiu daqui na
// migration 0031 — agora é um carrossel (1:N) gerenciado por
// `landingHeroImages.ts` / `HeroImagesPanel.tsx`.
export const LANDING_IMAGE_SECTIONS: { key: LandingImageKey; label: string }[] = [
  { key: "sobre_nos", label: "Sobre Nós" },
];

interface LandingImageRow {
  key: string;
  image_url: string | null;
}

export function mapLandingImageRow(row: LandingImageRow): LandingImage {
  return { key: row.key as LandingImageKey, imageUrl: row.image_url };
}
