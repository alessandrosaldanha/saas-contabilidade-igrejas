import type { LandingHeroImage } from "../types";

interface LandingHeroImageRow {
  id: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export function mapLandingHeroImageRow(row: LandingHeroImageRow): LandingHeroImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}
