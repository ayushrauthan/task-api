import { z } from 'zod';

export const bookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url().refine((value) => value.startsWith('https://'), 'product_url must use https://'),
  price_text: z.string().min(1),
  price_gbp: z.number().finite().nonnegative(),
  availability_text: z.string().min(1),
  rating_text: z.string().min(1),
  description: z.string().nullable(),
  source_page: z.string().url().refine((value) => value.startsWith('https://'), 'source_page must use https://'),
  fetched_at: z.string().datetime(),
});

export function normalizeRecord(raw) {
  const priceMatch = raw.price_text.match(/£\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!priceMatch) throw new Error(`Could not normalize price: ${raw.price_text}`);

  const productUrl = new URL(raw.product_url);
  const sourcePage = new URL(raw.source_page);

  return {
    ...raw,
    product_url: productUrl.href,
    source_page: sourcePage.href,
    price_gbp: Number(priceMatch[1]),
  };
}

export function validateRecord(record) {
  return bookSchema.safeParse(record);
}
