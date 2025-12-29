import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { readData, writeData } from '../utils/fileHelper.js';
import { generateDisplayId } from '../utils/idGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const FILE_NAME = 'displays.json';
const DISPLAYS_UPLOAD_DIR = path.join(__dirname, '../uploads/displays');

// Ensure displays upload directory exists
if (!fs.existsSync(DISPLAYS_UPLOAD_DIR)) {
    fs.mkdirSync(DISPLAYS_UPLOAD_DIR, { recursive: true });
}

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, DISPLAYS_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Will be renamed after ID generation
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});



// Get all displays
router.get('/', async (req, res) => {
    const displays = await readData(FILE_NAME);
    res.json(displays);
});

// Add a display
router.post('/', upload.single('photo'), async (req, res) => {
    try {
        const displays = await readData(FILE_NAME);
        // Ensure installedDate is present, default to today if not
        const installedDate = req.body.installedDate || new Date().toISOString();
        const newId = await generateDisplayId(installedDate);

        let photoUrl = '';

        if (req.file) {
            const tempPath = path.join(DISPLAYS_UPLOAD_DIR, req.file.filename);
            const ext = path.extname(req.file.originalname);
            const newFilename = `${newId}${ext}`;
            const newPath = path.join(DISPLAYS_UPLOAD_DIR, newFilename);

            fs.renameSync(tempPath, newPath);

            photoUrl = `/uploads/displays/${newFilename}`;
        }

        const newDisplay = {
            id: newId,
            // uniqueId is removed as per user request, using ID as primary ref
            gpsCoordinates: req.body.gpsCoordinates,
            googleMapsLink: req.body.googleMapsLink,
            address: req.body.address,
            photoUrl: photoUrl,
            installedDate: installedDate,
            installerId: req.body.installerId,
            installerName: req.body.installerName,
            status: req.body.status || 'active',
            impressions: parseInt(req.body.impressions) || 100000,
            createdBy: req.body.createdBy || 'ADMIN-001',
            createdAt: new Date().toISOString(),
            groupId: req.body.groupId || ''
        };

        displays.push(newDisplay);
        await writeData(FILE_NAME, displays);
        res.json({ success: true, display: newDisplay });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a display
router.put('/:id', upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const displays = await readData(FILE_NAME);
        const index = displays.findIndex(d => d.id === id);

        if (index !== -1) {
            const updatedDisplay = {
                ...displays[index],
                ...req.body,
                impressions: req.body.impressions ? parseInt(req.body.impressions) : displays[index].impressions
            };

            if (req.file) {
                const tempPath = path.join(DISPLAYS_UPLOAD_DIR, req.file.filename);
                const newFilename = `${id}.webp`;
                const compressedPath = path.join(DISPLAYS_UPLOAD_DIR, newFilename);

                await compressImage(tempPath, compressedPath);
                fs.unlinkSync(tempPath);

                updatedDisplay.photoUrl = `/uploads/displays/${newFilename}`;
            }

            displays[index] = updatedDisplay;
            await writeData(FILE_NAME, displays);
            res.json({ success: true, display: updatedDisplay });
        } else {
            res.status(404).json({ success: false, message: 'Display not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete a display
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let displays = await readData(FILE_NAME);
    const displayToDelete = displays.find(d => d.id === id);
    const initialLength = displays.length;
    displays = displays.filter(d => d.id !== id);

    if (displays.length < initialLength) {
        // Delete the photo file if it exists
        if (displayToDelete && displayToDelete.photoUrl) {
            const fileName = path.basename(displayToDelete.photoUrl);
            const filePath = path.join(DISPLAYS_UPLOAD_DIR, fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await writeData(FILE_NAME, displays);
        res.json({ success: true, message: 'Display deleted' });
    } else {
        res.status(404).json({ success: false, message: 'Display not found' });
    }
});

export default router;
