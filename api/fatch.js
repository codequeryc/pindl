import axios from 'axios';

const XATA_API_KEY = process.env.XATA_API_KEY;
const XATA_URL = process.env.XATA_DATABASE_URL;

export default async function handler(req, res) {
  const { url, blogId, source } = req.query;

  if (!url || !blogId || !source) {
    return res.status(400).json({ error: '❌ url, blogId & source are required' });
  }

  try {
    // ✅ Step 1: Check if blogId & source exist in store table
    const xataRes = await axios.post(
      `${XATA_URL}/tables/store/query`,
      {
        filter: {
          blogId: blogId,
          source: source
        }
      },
      {
        headers: {
          Authorization: `Bearer ${XATA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const matched = xataRes.data.records && xataRes.data.records.length > 0;

    if (!matched) {
      return res.status(403).json({ success: false, message: 'unauthorized' });
    }

    // 🔁 Step 2: Expand pin.it short URL
    let finalUrl = url;
    if (url.includes('pin.it')) {
      const redirectRes = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
      });
      finalUrl = redirectRes.headers.location || url;
    }

    // 🔍 Step 3: Scrape Pinterest page for video
    const page = await axios.get(finalUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const match = page.data.match(/"contentUrl":"(https:[^"]+\.mp4[^"]*)"/);

    if (match && match[1]) {
      return res.status(200).json({
        success: true,
        video: match[1],
      });
    } else {
      return res.status(404).json({ error: '❌ Video not found' });
    }

  } catch (err) {
    return res.status(500).json({
      error: '❌ Server error',
      details: err.message,
    });
  }
}
