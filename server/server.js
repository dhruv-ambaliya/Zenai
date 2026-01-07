import express from 'express'; // Restart Trigger 2
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
// We ensure the directory exists first
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Zenai Prototype Server is Running' });
});

// Import Routes
import authRoutes from './routes/authRoutes.js';
import displayRoutes from './routes/displayRoutes.js';
import adRoutes from './routes/adRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import slotRoutes from './routes/slotRoutes.js';

app.use('/api', authRoutes);
app.use('/api/displays', displayRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/slots', slotRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
