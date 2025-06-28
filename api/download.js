import axios from 'axios';
import crypto from 'crypto';

const SECRET_KEY = 'your_demo_secret'; // same secret in browser
const EXPIRE_TIME = 3600; // in seconds (1 hour)

function generateToken(url, source, ts) {
  const raw = `${url}|${source}|${ts}|${SECRET_KEY}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export default async function handler(req, res) {
  const { url, source, ts, token } = req.query;

  if (!url || !source || !ts || !token)
    return res.status(400).send('Missing parameters');

  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(ts) > EXPIRE_TIME)
    return res.status(403).send('⏰ Link expired');

  const expected = generateToken(url, source, ts);
  if (expected !== token)
    return res.status(403).send('❌ Invalid token');

  try {
    const decodedUrl = decodeURIComponent(url);
    const extMatch = decodedUrl.match(/\.(jpg|jpeg|png|gif|mp4|webm)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';

    const domain = new URL(source).hostname.replace(/^www\./, '');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${domain}-${date}.${ext}`;

    const file = await axios.get(decodedUrl, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', file.headers['content-type'] || 'application/octet-stream');
    file.data.pipe(res);
  } catch (err) {
    res.status(500).send('Download failed');
  }
}
