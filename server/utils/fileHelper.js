import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

export const readData = async (fileName) => {
    try {
        const filePath = path.join(DATA_DIR, fileName);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${fileName}:`, error);
        return [];
    }
};

export const writeData = async (fileName, data) => {
    try {
        const filePath = path.join(DATA_DIR, fileName);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${fileName}:`, error);
        return false;
    }
};
