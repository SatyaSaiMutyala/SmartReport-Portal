import 'dotenv/config';
import dns from 'node:dns';
import app from './app.js';
import { connectDB } from './config/db.js';

// Some networks' local DNS refuses SRV lookups needed by mongodb+srv:// URIs
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartreport';

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
connectDB(MONGO_URI);
