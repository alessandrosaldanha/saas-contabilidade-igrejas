import { Instagram, Facebook, Youtube, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SocialLink, SocialPlatform } from "../types";

// Metadados das 4 redes pré-cadastradas (seed da migration 0030) — a chave
// (`platform`) é o que casa com o banco; ícone é o mesmo padrão lucide-react
// já usado no resto do projeto (ex.: MessageCircle para WhatsApp no Contato).
export const SOCIAL_PLATFORM_META: { platform: SocialPlatform; label: string; icon: LucideIcon }[] = [
  { platform: "instagram", label: "Instagram", icon: Instagram },
  { platform: "facebook", label: "Facebook", icon: Facebook },
  { platform: "youtube", label: "YouTube", icon: Youtube },
  { platform: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

interface SocialLinkRow {
  platform: string;
  url: string | null;
  display_order: number;
  is_active: boolean;
}

export function mapSocialLinkRow(row: SocialLinkRow): SocialLink {
  return {
    platform: row.platform as SocialPlatform,
    url: row.url,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

// Validação básica exigida antes de salvar: precisa ser https:// e uma URL
// bem formada — evita link quebrado indo pro footer público.
export function isValidSocialUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
