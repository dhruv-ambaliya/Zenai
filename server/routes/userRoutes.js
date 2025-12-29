import express from 'express';
import { readData, writeData } from '../utils/fileHelper.js';
import { generateInstallerId } from '../utils/idGenerator.js';

const router = express.Router();
const FILE_NAME = 'users.json';

// Get all users
router.get('/', async (req, res) => {
    const users = await readData(FILE_NAME);
    res.json(users);
});

// Add a user
router.post('/', async (req, res) => {
    try {
        const users = await readData(FILE_NAME);
        const newId = await generateInstallerId();

        const newUser = {
            id: newId,
            name: req.body.name,
            role: req.body.role || 'installer',
            username: req.body.username,
            password: req.body.password,
            phone: req.body.phone,
            createdBy: req.body.createdBy || 'ADMIN-001',
            createdAt: new Date().toISOString()
        };

        // Check unique username
        if (users.some(u => u.username === newUser.username)) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        users.push(newUser);
        await writeData(FILE_NAME, users);
        res.json({ success: true, user: newUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const users = await readData(FILE_NAME);
    const index = users.findIndex(u => u.id === id);

    if (index !== -1) {
        users[index] = { ...users[index], ...req.body };
        await writeData(FILE_NAME, users);
        res.json({ success: true, user: users[index] });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// Delete a user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let users = await readData(FILE_NAME);
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);

    if (users.length < initialLength) {
        await writeData(FILE_NAME, users);
        res.json({ success: true, message: 'User deleted' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

export default router;
