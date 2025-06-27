import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '❌ URL is required' });

  try {
    let finalUrl = url;

    // 1. If it's a short URL like pin.it, expand it
    if (url.includes('pin.it')) {
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
      });
      finalUrl = response.headers.location || url;
    }

    // 2. Fetch actual Pinterest page (whether short or full)
    const page = await axios.get(finalUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // 3. Extract .mp4 video link from page HTML
    const match = page.data.match(/"contentUrl":"(https:[^"]+\.mp4[^"]*)"/);

    if (match && match[1]) {
      return res.status(200).json({
        success: true,
        video: match[1],
      });
    } else {
      return res.status(404).json({ error: '❌ Video URL not found in page' });
    }
  } catch (err) {
    return res.status(500).json({
      error: '❌ Failed to process URL',
      details: err.message,
    });
  }
}
