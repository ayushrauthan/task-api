import * as cheerio from 'cheerio';

export function absoluteUrl(href, pageUrl) {
  return new URL(href, pageUrl).href;
}

export function parseCatalogue(html, pageUrl) {
  const $ = cheerio.load(html);
  const bookUrls = [];

  $('article.product_pod h3 a').each((_, element) => {
    const href = $(element).attr('href');
    if (href) bookUrls.push(absoluteUrl(href, pageUrl));
  });

  const nextHref = $('li.next a').attr('href') ?? null;
  const nextUrl = nextHref ? absoluteUrl(nextHref, pageUrl) : null;

  return { bookUrls, nextUrl };
}

export function parseBook(html, productUrl, sourcePage, fetchedAt) {
  const $ = cheerio.load(html);
  const product = $('article.product_page').first();

  if (!product.length) throw new Error(`Product area not found for ${productUrl}`);

  const title = product.find('h1').first().text().trim() || null;
  const priceText = product.find('.price_color').first().text().trim() || null;
  const availabilityText = product.find('.availability').first().text().replace(/\s+/g, ' ').trim() || null;
  const ratingClass = product.find('.star-rating').first().attr('class') ?? '';
  const ratingText = ratingClass.split(/\s+/).find((value) => value !== 'star-rating') ?? null;

  const descriptionHeading = product.find('#product_description').first();
  const description = descriptionHeading.length
    ? descriptionHeading.next('p').text().replace(/\s+/g, ' ').trim() || null
    : null;

  return {
    title,
    product_url: productUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: sourcePage,
    fetched_at: fetchedAt,
  };
}
