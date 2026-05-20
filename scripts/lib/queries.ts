/**
 * Default search-query strings per caliber. Most Finnish ammo retailers
 * search their catalog as full-text against product names that include the
 * word "patruuna" (cartridge), so the longer form is the right default.
 * The shorter form (no "patruuna" suffix) is used by Wix-based stores
 * whose search engines apply AND-logic across query terms.
 */
export const CALIBER_QUERIES_PATRUUNA: Record<string, string> = {
  '22 LR': '22+lr+patruuna',
  '222 Remington': '222+rem+patruuna',
  '223 Remington': '223+rem+patruuna',
  '6.5 Creedmoor': '6.5+creedmoor+patruuna',
  '30-06 Springfield': '30-06+sprg+patruuna',
  '308 Winchester': '308+win+patruuna',
  '7.62x39': '7.62x39+patruuna',
  '9mm': '9mm+luger+patruuna',
};

export const CALIBER_QUERIES_SHORT: Record<string, string> = {
  '22 LR': '22+lr',
  '222 Remington': '222+rem',
  '223 Remington': '223+rem',
  '6.5 Creedmoor': '6.5+creedmoor',
  '30-06 Springfield': '30-06',
  '308 Winchester': '308+win',
  '7.62x39': '7.62x39',
  '9mm': '9mm',
};
