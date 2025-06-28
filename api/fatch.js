import axios from 'axios';

const headers = {
  Authorization: Bearer ${process.env.XATA_API_KEY},
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  const { url, blogId, source } = req.query;

  if (!url || !blogId || !source)
    return res.status(400).json({ error: 'Missing url, blogId, or source' });

  try {
    const { data } = await axios.post(
      ${process.env.XATA_DATABASE_URL}/tables/store/query,
      { filter: { blogId, source } },
      { headers }
    );

    if (!data.records?.length)
      return res.status(403).json({ success: false, message: 'unauthorized' });

    const allowedOrigin = data.records[0].source;

    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let finalUrl = url.includes('pin.it')
      ? (await axios.get(url, { maxRedirects: 0, validateStatus: s => s < 400 })).headers.location
      : url;

    const html = (await axios.get(finalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120 Safari/537.36' },
    })).data;

    const match = html.match(/"contentUrl":"(https:[^"]+\.mp4[^"]*)"/);

    return match
      ? res.json({ success: true, video: match[1] })
      : res.status(404).json({ error: 'Video not found' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
