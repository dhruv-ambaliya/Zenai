import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

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

// Helper function to get video duration
const getVideoDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
        });
    });
};

// Helper function to crop video to target duration
const cropVideo = (inputPath, outputPath, targetDuration) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .duration(targetDuration)
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};

// Upload Endpoint
router.post('/', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const inputPath = req.file.path;
        const fileExt = path.extname(req.file.filename);
        const croppedFilename = req.file.filename.replace(fileExt, '-cropped' + fileExt);
        const outputPath = path.join(path.dirname(inputPath), croppedFilename);

        // Check if it's a video file
        if (req.file.mimetype.startsWith('video/')) {
            // Get the actual duration
            const duration = await getVideoDuration(inputPath);

            // Determine target duration and crop if needed
            let targetDuration = duration;
            if (duration > 5.5) {
                targetDuration = 10; // Crop to 10 seconds
            } else if (duration > 5) {
                targetDuration = 5; // Crop to 5 seconds
            }

            // Only crop if duration differs from target
            if (Math.abs(duration - targetDuration) > 0.1) {
                await cropVideo(inputPath, outputPath, targetDuration);
                // Delete original file and rename cropped to original
                fs.unlinkSync(inputPath);
                fs.renameSync(outputPath, inputPath);
            }
        }

        // Return the path relative to the server so frontend can access via /uploads/...
        const filePath = `/uploads/${req.file.filename}`;
        res.json({ success: true, filePath: filePath });
    } catch (error) {
        console.error('Error processing video:', error);
        // Delete the uploaded file if there was an error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                // File might not exist
            }
        }
        res.status(500).json({ success: false, message: 'Error processing video: ' + error.message });
    }
});

export default router;
