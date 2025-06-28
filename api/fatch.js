import axios from 'axios';

const headers = {
  Authorization: `Bearer ${process.env.XATA_API_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  const { url, blogId, source } = req.query;

  if (!url || !blogId || !source)
    return res.status(400).json({ error: 'Missing url, blogId, or source' });

  try {
    // ✅ 1. Query Xata DB
    const { data } = await axios.post(
      `${process.env.XATA_DATABASE_URL}/tables/store/query`,
      { filter: { blogId, source } },
      { headers }
    );

    if (!data.records?.length)
      return res.status(403).json({ success: false, message: 'unauthorized' });

    const allowedOrigin = data.records[0].source;

    // ✅ 2. Set CORS
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ✅ 3. Follow redirect if pin.it
    let finalUrl = url.includes('pin.it')
      ? (await axios.get(url, { maxRedirects: 0, validateStatus: s => s < 400 })).headers.location
      : url;

    // ✅ 4. Scrape HTML
    const html = (await axios.get(finalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120 Safari/537.36' },
    })).data;

    // ✅ 5. Try to match video
    const videoMatch = html.match(/"contentUrl":"(https:[^"]+\.mp4[^"]*)"/);
    if (videoMatch) {
      return res.json({ success: true, type: 'video', video: videoMatch[1] });
    }

    // ✅ 6. Try to match image (fallback)
    const imageMatch =
      html.match(/"image":"(https:[^"]+\.jpg[^"]*)"/) || // pinterest direct
      html.match(/<meta property="og:image" content="(https:[^"]+)"/) || // og:image fallback
      html.match(/<img[^>]+src="(https:[^"]+\.(jpg|png|webp))"/); // generic <img>

    if (imageMatch) {
      return res.json({ success: true, type: 'image', image: imageMatch[1] });
    }

    // ❌ 7. If nothing found
    return res.status(404).json({ error: 'Media not found' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
