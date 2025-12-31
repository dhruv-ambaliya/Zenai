import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { readData, writeData } from '../utils/fileHelper.js';
import { generateAdId } from '../utils/idGenerator.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const FILE_NAME = 'ads.json';
const ADS_UPLOAD_DIR = path.join(__dirname, '../uploads/ads');

// Ensure ads upload directory exists
if (!fs.existsSync(ADS_UPLOAD_DIR)) {
    fs.mkdirSync(ADS_UPLOAD_DIR, { recursive: true });
}

// Configure multer for video/image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, ADS_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Will be renamed after ID generation
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'));
        }
    }
});



// Helper to get video duration using ffprobe
const getVideoDuration = async (filePath) => {
    try {
        const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        return parseFloat(stdout);
    } catch (error) {
        console.error('Error getting video duration:', error);
        return 0;
    }
};

const getDateInfo = (startDateValue, weeksValue) => {
    if (!startDateValue) {
        return { endDate: '', remainingDays: 0 };
    }

    const startDate = new Date(startDateValue);
    const endDate = new Date(startDate);
    const weeks = parseInt(weeksValue) || 1;
    endDate.setDate(endDate.getDate() + (weeks * 7));

    const diffTime = endDate - startDate;
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        endDate: endDate.toISOString().split('T')[0],
        remainingDays: remainingDays > 0 ? remainingDays : 0
    };
};

const getLiveStatus = (startDateValue, endDateValue) => {
    const now = new Date();
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);

    if (now < start) return 'paused';
    if (now > end) return 'completed';
    return 'active';
};

const getLiveRemainingDays = (startDateValue, endDateValue) => {
    const now = new Date();
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);

    // If campaign not started yet, show full duration (start -> end)
    const anchor = now < start ? start : now;
    const diffTime = end - anchor;
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return remainingDays > 0 ? remainingDays : 0;
};

const withLiveFields = (ad) => {
    // Ensure endDate exists based on start/weeks if missing
    const { endDate } = getDateInfo(ad.startDate, ad.weeks);
    const resolvedEnd = ad.endDate || endDate;

    const status = getLiveStatus(ad.startDate, resolvedEnd);
    const remainingDays = getLiveRemainingDays(ad.startDate, resolvedEnd);

    return {
        ...ad,
        endDate: resolvedEnd,
        status,
        remainingDays
    };
};

// Get all ads
router.get('/', async (req, res) => {
    const ads = await readData(FILE_NAME);
    // Return with live status/remainingDays without persisting remainingDays
    const enriched = ads.map(withLiveFields);
    res.json(enriched);
});

// Add an ad
router.post('/', upload.single('media'), async (req, res) => {
    try {
        const ads = await readData(FILE_NAME);
        // Ensure startDate is present
        const startDate = req.body.startDate || new Date().toISOString();
        const newId = await generateAdId(startDate);

        let duration = 5;
        let durationTier = '5s';

        let finalMediaUrl = '';
        let finalMediaType = 'image';

        if (req.file) {
            const tempPath = path.join(ADS_UPLOAD_DIR, req.file.filename);

            if (req.file.mimetype.startsWith('video/')) {
                // Video duration
                duration = await getVideoDuration(tempPath);

                // Strict validation: must be in one of two tiers
                const isInFiveSecTier = duration >= 5.00 && duration <= 5.50;
                const isInTenSecTier = duration >= 10.00 && duration <= 10.50;

                if (!isInFiveSecTier && !isInTenSecTier) {
                    fs.unlinkSync(tempPath); // Clean up uploaded file
                    return res.status(400).json({
                        success: false,
                        message: `Video must be 5.00-5.50 seconds or 10.00-10.50 seconds. Current duration: ${duration.toFixed(2)}s`
                    });
                }

                // Determine target duration and crop
                const targetSeconds = isInFiveSecTier ? 5 : 10;
                durationTier = targetSeconds === 5 ? '5s' : '10s';

                // Crop to exact target length - NO re-encoding, just trim
                const newFilename = `${newId}.mp4`;
                const newPath = path.join(ADS_UPLOAD_DIR, newFilename);
                try {
                    // Stream copy only - no re-encoding, just crop duration
                    await execPromise(`ffmpeg -y -i "${tempPath}" -t ${targetSeconds} -c copy -movflags +faststart "${newPath}"`);
                    fs.unlinkSync(tempPath);
                } catch (err) {
                    console.error('Error cropping/transcoding video:', err);
                    // Fallback: move original file if ffmpeg fails
                    fs.renameSync(tempPath, newPath);
                }

                finalMediaUrl = `/uploads/ads/${newFilename}`;
                finalMediaType = 'video';
                duration = targetSeconds; // store actual after crop
            } else {
                // Image path
                const ext = path.extname(req.file.originalname);
                const newFilename = `${newId}${ext}`;
                const newPath = path.join(ADS_UPLOAD_DIR, newFilename);
                fs.renameSync(tempPath, newPath);

                finalMediaUrl = `/uploads/ads/${newFilename}`;
                finalMediaType = 'image';

                // Use selected duration
                durationTier = req.body.videoDuration || '5s';
            }
        } else {
            // No media provided (shouldn't happen on create)
            durationTier = req.body.videoDuration || '5s';
        }

        // Calculate price
        const baseRate = 5000;
        const weeks = parseInt(req.body.weeks) || 1;
        const numDisplays = parseInt(req.body.numDisplays) || 1;
        const multiplier = durationTier === '10s' ? 1.5 : 1;
        const calculatedPrice = baseRate * weeks * numDisplays * multiplier;

        // Custom price handling
        const customPrice = req.body.customPrice ? parseFloat(req.body.customPrice) : null;
        const finalPrice = customPrice || calculatedPrice;
        const discount = customPrice ? calculatedPrice - customPrice : 0;
        const discountPercent = customPrice ? ((discount / calculatedPrice) * 100).toFixed(2) : 0;

        const { endDate } = getDateInfo(startDate, weeks);
        const status = getLiveStatus(startDate, endDate);

        const newAd = {
            id: newId,
            name: req.body.name,
            companyName: req.body.companyName,
            contactNo: req.body.contactNo,
            mediaUrl: finalMediaUrl,
            mediaType: finalMediaType,
            videoDuration: durationTier,
            actualDuration: duration,
            startDate,
            endDate,
            weeks: weeks,
            numDisplays: numDisplays,
            calculatedPrice: calculatedPrice,
            customPrice: customPrice,
            finalPrice: finalPrice,
            discount: discount,
            discountPercent: discountPercent,
            status,
            createdBy: req.body.createdBy || 'ADMIN-001',
            createdAt: new Date().toISOString()
        };

        const storedAd = { ...newAd, status };
        ads.push(storedAd);
        await writeData(FILE_NAME, ads);
        res.json({ success: true, ad: withLiveFields(storedAd) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update an ad
router.put('/:id', upload.single('media'), async (req, res) => {
    try {
        const { id } = req.params;
        const ads = await readData(FILE_NAME);
        const index = ads.findIndex(a => a.id === id);

        if (index !== -1) {
            const updatedAd = {
                ...ads[index],
                ...req.body
            };

            // Normalize numeric fields
            updatedAd.weeks = parseInt(updatedAd.weeks) || 1;
            updatedAd.numDisplays = parseInt(updatedAd.numDisplays) || 1;

            if (req.file) {
                const tempPath = path.join(ADS_UPLOAD_DIR, req.file.filename);

                if (req.file.mimetype.startsWith('video/')) {
                    const newFilename = `${id}.mp4`;
                    const compressedPath = path.join(ADS_UPLOAD_DIR, newFilename);
                    await transcodeVideo(tempPath, compressedPath);
                    fs.unlinkSync(tempPath);

                    updatedAd.mediaUrl = `/uploads/ads/${newFilename}`;
                    updatedAd.mediaType = 'video';
                } else {
                    const newFilename = `${id}.webp`;
                    const compressedPath = path.join(ADS_UPLOAD_DIR, newFilename);
                    await compressImage(tempPath, compressedPath);
                    fs.unlinkSync(tempPath);

                    updatedAd.mediaUrl = `/uploads/ads/${newFilename}`;
                    updatedAd.mediaType = 'image';
                }
            }

            // Recalculate date info when start date or weeks change
            if (req.body.startDate !== undefined || req.body.weeks !== undefined || !updatedAd.endDate) {
                const { endDate } = getDateInfo(updatedAd.startDate, updatedAd.weeks);
                updatedAd.endDate = endDate;
            }

            // Recalculate price if relevant fields changed
            if (req.body.weeks !== undefined || req.body.numDisplays !== undefined || req.body.videoDuration !== undefined || req.body.customPrice !== undefined) {
                const baseRate = 5000;
                const multiplier = updatedAd.videoDuration === '10s' ? 1.5 : 1;
                updatedAd.calculatedPrice = baseRate * updatedAd.weeks * updatedAd.numDisplays * multiplier;

                if (req.body.customPrice !== undefined) {
                    if (req.body.customPrice === '' || req.body.customPrice === null) {
                        updatedAd.customPrice = null;
                    } else {
                        updatedAd.customPrice = parseFloat(req.body.customPrice);
                    }
                }

                const customPriceValue = updatedAd.customPrice !== null && updatedAd.customPrice !== undefined
                    ? parseFloat(updatedAd.customPrice)
                    : null;

                updatedAd.finalPrice = customPriceValue !== null ? customPriceValue : updatedAd.calculatedPrice;
                updatedAd.discount = customPriceValue !== null ? updatedAd.calculatedPrice - customPriceValue : 0;
                updatedAd.discountPercent = customPriceValue !== null
                    ? ((updatedAd.discount / updatedAd.calculatedPrice) * 100).toFixed(2)
                    : 0;
            }

            // Refresh status based on live dates
            const withStatus = withLiveFields(updatedAd);
            ads[index] = { ...updatedAd, status: withStatus.status };
            await writeData(FILE_NAME, ads);
            res.json({ success: true, ad: withLiveFields(ads[index]) });
        } else {
            res.status(404).json({ success: false, message: 'Ad not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete an ad
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let ads = await readData(FILE_NAME);
    const adToDelete = ads.find(a => a.id === id);
    const initialLength = ads.length;
    ads = ads.filter(a => a.id !== id);

    if (ads.length < initialLength) {
        // Delete the media file if it exists
        if (adToDelete && adToDelete.mediaUrl) {
            const fileName = path.basename(adToDelete.mediaUrl);
            const filePath = path.join(ADS_UPLOAD_DIR, fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await writeData(FILE_NAME, ads);
        res.json({ success: true, message: 'Ad deleted' });
    } else {
        res.status(404).json({ success: false, message: 'Ad not found' });
    }
});

export default router;
