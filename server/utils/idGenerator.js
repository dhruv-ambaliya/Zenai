import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

// Helper to read and parse JSON
const readJSON = async (filename) => {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to format date as DDMMYY
const formatDateForId = (dateString) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '000000'; // Fallback

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}${month}${year}`;
    } catch (e) {
        return '000000';
    }
};

// Generate Display ID: DS-<date in ddmmyy>-001...
export const generateDisplayId = async (installedDate) => {
    try {
        const displays = await readJSON('displays.json');
        const dateStr = formatDateForId(installedDate);
        const prefix = `DS-${dateStr}`;

        // Find all IDs matching this prefix
        const relevantIds = displays
            .map(d => d.id)
            .filter(id => id && id.startsWith(prefix));

        // Extract existing numbers into a set
        const taken = new Set(
            relevantIds.map(id => {
                const part = id.split('-').pop();
                return parseInt(part, 10) || 0;
            })
        );

        // Find smallest missing positive integer starting at 1
        let n = 1;
        while (taken.has(n)) n++;
        return `${prefix}-${String(n).padStart(3, '0')}`;
    } catch (error) {
        console.error('Error generating display ID:', error);
        return `DS-${formatDateForId(new Date())}-001`;
    }
};

// Generate Ad ID: AD-<start date in ddmmyy>-001...
export const generateAdId = async (startDate) => {
    try {
        const ads = await readJSON('ads.json');
        const dateStr = formatDateForId(startDate);
        const prefix = `AD-${dateStr}`;

        const relevantIds = ads
            .map(a => a.id)
            .filter(id => id && id.startsWith(prefix));

        const taken = new Set(
            relevantIds.map(id => {
                const part = id.split('-').pop();
                return parseInt(part, 10) || 0;
            })
        );

        let n = 1;
        while (taken.has(n)) n++;
        return `${prefix}-${String(n).padStart(3, '0')}`;
    } catch (error) {
        console.error('Error generating ad ID:', error);
        return `AD-${formatDateForId(new Date())}-001`;
    }
};

// Generate Group ID with Hierarchy
// Root: GP-001
// Level 1 Subgroup: S1GP-001-001 (ParentNum-SubNum)
// Level 2 Subgroup: S2GP-001-001-001 (GrandParentNum-ParentNum-SubNum)
export const generateGroupId = async (parentId = null) => {
    try {
        const groups = await readJSON('groups.json');

        // Helper to find a group recursively
        const findGroup = (groupList, id) => {
            for (const group of groupList) {
                if (group.id === id) return group;
                if (group.subgroups) {
                    const found = findGroup(group.subgroups, id);
                    if (found) return found;
                }
            }
            return null;
        };

        if (!parentId) {
            // Root Level Group: GP-XXX
            // Only look at top-level groups
            const rootGroups = groups.map(g => g.id).filter(id => id && id.startsWith('GP-'));

            const taken = new Set(
                rootGroups.map(id => {
                    const match = id.match(/^GP-(\d+)$/);
                    return match ? parseInt(match[1], 10) : 0;
                })
            );
            let n = 1;
            while (taken.has(n)) n++;
            return `GP-${String(n).padStart(3, '0')}`;
        }
        else {
            // Subgroup Level
            const parent = findGroup(groups, parentId);
            if (!parent) return `ERR-${Date.now()}`; // Should not happen

            const subgroups = parent.subgroups || [];

            // Determine level based on parent ID format
            // GP-003 -> Level 1 -> S1GP-003-XXX
            // S1GP-003-001 -> Level 2 -> S2GP-003-001-XXX

            let newPrefix = '';

            if (parentId.startsWith('GP-')) {
                // Parent is root, creating Level 1 subgroup
                const parentNum = parentId.split('-')[1];
                newPrefix = `S1GP-${parentNum}`;
            } else if (parentId.startsWith('S1GP-')) {
                // Parent is Level 1, creating Level 2 subgroup
                // Parent ID: S1GP-003-001 -> Extract 003-001
                const parts = parentId.split('-');
                // parts[0]=S1GP, parts[1]=003, parts[2]=001
                newPrefix = `S2GP-${parts[1]}-${parts[2]}`;
            } else if (parentId.startsWith('S2GP-')) {
                // Level 3... logic continues if needed, but user examples stopped at S2
                // Assuming format follows: SXGP-...
                const parts = parentId.split('-');
                // Just append current parts to next level S(X+1)GP
                const currentLevel = parseInt(parts[0].charAt(1)); // Extract number after S
                newPrefix = `S${currentLevel + 1}GP-${parts.slice(1).join('-')}`;
            } else {
                // Fallback
                newPrefix = `Sub-${parentId}`;
            }

            // Count existing siblings to get next number
            const relevantIds = subgroups
                .map(sg => sg.id)
                .filter(id => id && id.startsWith(newPrefix));

            const taken = new Set(
                relevantIds.map(id => {
                    const part = id.split('-').pop();
                    return parseInt(part, 10) || 0;
                })
            );
            let n = 1;
            while (taken.has(n)) n++;
            return `${newPrefix}-${String(n).padStart(3, '0')}`;
        }
    } catch (error) {
        console.error('Error in group ID gen:', error);
        return `GP-${Date.now()}`;
    }
};

// Installer ID - Keep simpler or match pattern?
// User said "id of everything i said is wrong... i want simple id like..." listing DS, AD, GP.
// Didn't explicitly mention INST, but `users.json` showed INST-001. I'll stick to INST-001 for now.
export const generateInstallerId = async () => {
    // ... (Existing implementation is fine for INST-XXX)
    // Re-implementing briefly to ensure imports work
    try {
        const users = await readJSON('users.json');
        const installers = users.filter(u => u.role === 'installer');

        const taken = new Set(
            installers.map(i => {
                const match = i.id?.match(/^INST-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
        );
        let n = 1;
        while (taken.has(n)) n++;
        return `INST-${String(n).padStart(3, '0')}`;
    } catch (e) {
        return 'INST-001';
    }
};
