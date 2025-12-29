import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save to server/uploads
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Upload Endpoint
router.post('/', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the path relative to the server so frontend can access via /uploads/...
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, filePath: filePath });
});

export default router;
