import axios from 'axios';

export default async function handler(req, res) {
  const { url, source } = req.query;

  if (!url || !source) {
    return res.status(400).send('Missing url or source');
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const decodedSource = decodeURIComponent(source);
    const extMatch = decodedUrl.match(/\.(jpg|jpeg|png|gif|mp4|webm)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';

    const domain = new URL(decodedSource).hostname.replace(/^www\./, '');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${domain}-${date}.${ext}`;

    const file = await axios.get(decodedUrl, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', file.headers['content-type'] || 'application/octet-stream');

    file.data.pipe(res);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Download failed');
  }
}
