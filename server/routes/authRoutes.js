import express from 'express';
import { readData } from '../utils/fileHelper.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await readData('users.json');

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // In a real app, we would issue a JWT token here.
        // For this prototype, we return the user info directly.
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

export default router;
