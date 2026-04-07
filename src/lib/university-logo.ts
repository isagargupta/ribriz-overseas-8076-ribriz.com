/**
 * Derives the best available logo/image URL for a university.
 *
 * Priority:
 *   1. Manually curated `logoUrl` stored in DB
 *   2. Google high-res favicon from the university's website domain
 *   3. null (caller should render a fallback)
 */
export function getUniversityLogoUrl(
  logoUrl: string | null | undefined,
  websiteUrl: string | null | undefined
): string | null {
  if (logoUrl) return logoUrl;

  if (websiteUrl) {
    try {
      const domain = new URL(websiteUrl).hostname;
      // Google's favicon service returns high-quality icons at the requested size
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      // malformed URL — fall through
    }
  }

  return null;
}
