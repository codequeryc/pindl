import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '❌ url is required' });

  try {
    // Step 1: Unshorten pin.it URL
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });

    const redirectedUrl = response.headers.location;

    if (!redirectedUrl) {
      return res.status(404).json({ error: '❌ Redirect failed' });
    }

    // Step 2: Visit redirected URL and scrape for video URL
    const page = await axios.get(redirectedUrl);
    const match = page.data.match(/"contentUrl":"(https:[^"]+\.mp4[^"]*)"/);

    if (match && match[1]) {
      return res.json({
        success: true,
        video: match[1]
      });
    } else {
      return res.status(404).json({ error: '❌ Video URL not found' });
    }

  } catch (err) {
    return res.status(500).json({ error: '❌ Something went wrong' });
  }
}
