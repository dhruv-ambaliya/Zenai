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
        // Will be renamed after ID generation - use random suffix to ensure uniqueness for multiple files
        cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
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
router.post('/', upload.array('photos', 10), async (req, res) => {
    let uploadedFiles = []; // Track uploaded files for cleanup on error
    try {
        console.log('Display POST request received');
        console.log('Files uploaded:', req.files ? req.files.length : 0);
        console.log('Body:', req.body);
        
        const displays = await readData(FILE_NAME);
        // Ensure installedDate is present, default to today if not
        const installedDate = req.body.installedDate || new Date().toISOString();
        const newId = await generateDisplayId(installedDate);

        let photoUrl = '';
        let photoUrls = [];

        // Save ALL uploaded images with sequential numbering
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, photoIndex) => {
                try {
                    const tempPath = path.join(DISPLAYS_UPLOAD_DIR, file.filename);
                    const ext = path.extname(file.originalname);
                    // Format: DS-221225-001-1, DS-221225-001-2, etc.
                    const imageNumber = photoIndex + 1;
                    const newFilename = `${newId}-${imageNumber}${ext}`;
                    const newPath = path.join(DISPLAYS_UPLOAD_DIR, newFilename);

                    if (!fs.existsSync(tempPath)) {
                        throw new Error(`Uploaded file not found: ${file.filename}`);
                    }

                    fs.renameSync(tempPath, newPath);
                    uploadedFiles.push(newPath);
                    photoUrls.push(`/uploads/displays/${newFilename}`);
                    console.log(`Renamed file: ${file.filename} -> ${newFilename}`);
                } catch (fileError) {
                    console.error(`Error processing file ${photoIndex}:`, fileError);
                    throw fileError;
                }
            });
            
            photoUrl = photoUrls[0]; // First image as main thumbnail
        }

        const newDisplay = {
            id: newId,
            // uniqueId is removed as per user request, using ID as primary ref
            gpsCoordinates: req.body.gpsCoordinates,
            googleMapsLink: req.body.googleMapsLink,
            address: req.body.address,
            photoUrl: photoUrl, // First photo as main thumbnail
            photos: photoUrls, // Array with all selected photos
            installedDate: installedDate,
            installerId: req.body.installerId,
            installerName: req.body.installerName,
            status: req.body.status || 'active',
            createdBy: req.body.createdBy || 'ADMIN-001',
            createdAt: new Date().toISOString(),
            groupId: req.body.groupId || '',
            propertyType: req.body.propertyType || 'commercial',
            propertyName: req.body.propertyName || '',
            numberOfShops: req.body.numberOfShops || '',
            avgActualFootfall: parseInt(req.body.avgActualFootfall) || 0
        };

        displays.push(newDisplay);
        await writeData(FILE_NAME, displays);
        console.log('Display saved successfully:', newDisplay.id);
        res.json({ success: true, display: newDisplay });
    } catch (error) {
        console.error('Error in display POST:', error);
        // Clean up uploaded files on error
        uploadedFiles.forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Cleaned up file:', filePath);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        });
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a display
router.put('/:id', upload.array('photos', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const displays = await readData(FILE_NAME);
        const index = displays.findIndex(d => d.id === id);

        if (index !== -1) {
            const updatedDisplay = {
                ...displays[index],
                ...req.body,
                propertyType: req.body.propertyType || displays[index].propertyType || 'commercial',
                propertyName: req.body.propertyName || displays[index].propertyName || '',
                numberOfShops: req.body.numberOfShops || displays[index].numberOfShops || '',
                avgActualFootfall: req.body.avgActualFootfall ? parseInt(req.body.avgActualFootfall) : displays[index].avgActualFootfall
            };

            if (req.files && req.files.length > 0) {
                let photoUrls = [];
                req.files.forEach((file, photoIndex) => {
                    const tempPath = path.join(DISPLAYS_UPLOAD_DIR, file.filename);
                    const ext = path.extname(file.originalname);
                    // Format: DS-221225-001-1 (first), DS-221225-001-2 (second), etc.
                    const imageNumber = photoIndex + 1;
                    const newFilename = `${id}-${imageNumber}${ext}`;
                    const newPath = path.join(DISPLAYS_UPLOAD_DIR, newFilename);

                    fs.renameSync(tempPath, newPath);
                    photoUrls.push(`/uploads/displays/${newFilename}`);
                });

                updatedDisplay.photos = photoUrls;
                updatedDisplay.photoUrl = photoUrls[0]; // First image as main
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
        // Delete all photo files (supporting both single and multiple photos)
        if (displayToDelete) {
            // Check for multiple photos
            if (displayToDelete.photos && Array.isArray(displayToDelete.photos)) {
                displayToDelete.photos.forEach(photoUrl => {
                    const fileName = path.basename(photoUrl);
                    const filePath = path.join(DISPLAYS_UPLOAD_DIR, fileName);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            } else if (displayToDelete.photoUrl) {
                // Fallback for single photo
                const fileName = path.basename(displayToDelete.photoUrl);
                const filePath = path.join(DISPLAYS_UPLOAD_DIR, fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

        await writeData(FILE_NAME, displays);
        res.json({ success: true, message: 'Display deleted' });
    } else {
        res.status(404).json({ success: false, message: 'Display not found' });
    }
});

export default router;
