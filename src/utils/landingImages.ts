import type { LandingImage, LandingImageKey } from "../types";

// Metadados das 6 seções editáveis (ordem = ordem de exibição no Painel de
// Governança); a chave é o que casa com o seed da migration 0029 e com o
// que a Landing usa para buscar cada imagem.
export const LANDING_IMAGE_SECTIONS: { key: LandingImageKey; label: string }[] = [
  { key: "hero", label: "Topo da página (Hero)" },
  { key: "feature_livro_caixa", label: "Como Funciona — Livro Caixa automático" },
  { key: "feature_ia", label: "Como Funciona — Importação de extrato com IA" },
  { key: "feature_multi_igreja", label: "Como Funciona — Multi-igreja (matriz/filial)" },
  { key: "feature_auditoria", label: "Como Funciona — Trilha de auditoria" },
  { key: "sobre_nos", label: "Sobre Nós" },
];

interface LandingImageRow {
  key: string;
  image_url: string | null;
}

export function mapLandingImageRow(row: LandingImageRow): LandingImage {
  return { key: row.key as LandingImageKey, imageUrl: row.image_url };
}
