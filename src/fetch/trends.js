/**
 * Fetch trending keywords from Google Trends via RSS feed.
 * More reliable than the unofficial JSON API.
 */

const TRENDS_RSS_URL = 'https://trends.google.com/trending/rss';

/**
 * Fetch the top trending keyword from Google Trends.
 * @param {string} geo - Country code (default: 'US').
 * @returns {Promise<{keyword: string, traffic: string, rawTraffic: number}>}
 */
export async function fetchTopTrend(geo = 'US') {
  const url = `${TRENDS_RSS_URL}?geo=${geo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trends RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const items = parseRssItems(xml);

  if (items.length === 0) {
    throw new Error('No trending items found in RSS feed');
  }

  const top = items[0];
  return {
    keyword: top.title,
    traffic: top.traffic,
    rawTraffic: parseTraffic(top.traffic),
  };
}

/**
 * Fetch multiple trending keywords.
 */
export async function fetchTrends(geo = 'US', count = 5) {
  const url = `${TRENDS_RSS_URL}?geo=${geo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trends RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const items = parseRssItems(xml);

  return items.slice(0, count).map((item) => ({
    keyword: item.title,
    traffic: item.traffic,
    rawTraffic: parseTraffic(item.traffic),
  }));
}

/**
 * Parse RSS XML to extract items with title and traffic.
 */
function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const traffic = extractTag(block, 'ht:approx_traffic');

    if (title) {
      items.push({ title, traffic: traffic || '1,000+' });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parse traffic string like "2,000+" into a number.
 */
function parseTraffic(trafficStr) {
  if (!trafficStr || trafficStr === 'N/A') return 50000;
  const cleaned = trafficStr.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 50000;
}

/**
 * Convert trend traffic volume to a mix weight (0.2 - 0.8).
 * Higher traffic = more trend audio in the mix.
 */
export function intensityToWeight(rawTraffic) {
  const num = Math.max(rawTraffic, 1000);
  const log = Math.log10(num);
  // Map log10(1000)=3 → 0.2, log10(10M)=7 → 0.8
  return Math.min(0.8, Math.max(0.2, (log - 3) / 5 + 0.2));
}
