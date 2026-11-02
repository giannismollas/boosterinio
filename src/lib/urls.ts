import { CATEGORIES, type ListingCategoryKey } from "./catalog";

export const gameUrl = (gameSlug: string) => `/${gameSlug}`;
export const boostingUrl = (gameSlug: string) => `/${gameSlug}/boosting`;
export const serviceUrl = (gameSlug: string, serviceSlug: string) => `/${gameSlug}/boosting/${serviceSlug}`;
export const categoryUrl = (gameSlug: string, category: ListingCategoryKey) => `/${gameSlug}/${CATEGORIES[category].slug}`;
export const listingUrl = (l: { slug: string; category: ListingCategoryKey | string; game: { slug: string } }) =>
  `/${l.game.slug}/${CATEGORIES[l.category as ListingCategoryKey].slug}/${l.slug}`;
export const sellerUrl = (slug: string) => `/sellers/${slug}`;
export const orderUrl = (number: string) => `/orders/${number}`;
