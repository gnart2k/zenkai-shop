/**
 * Stored under Store.metadata.branding (JSON). File fields reference Medusa File Module IDs.
 */
export type StoreBrandingMetadata = {
  tagline?: string;
  primary_color?: string;
  logo_file_id?: string;
  hero_file_id?: string;
  favicon_file_id?: string;
};

export type StoreBrandingPublicResponse = {
  store_name: string;
  tagline: string | null;
  primary_color: string | null;
  logo_url: string | null;
  hero_url: string | null;
  favicon_url: string | null;
};
