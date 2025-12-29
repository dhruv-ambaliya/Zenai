import express from 'express';
import { readData, writeData } from '../utils/fileHelper.js';
import { generateGroupId } from '../utils/idGenerator.js';

const router = express.Router();
const FILE_NAME = 'groups.json';
const DISPLAYS_FILE = 'displays.json';

// Get all groups
router.get('/', async (req, res) => {
    const groups = await readData(FILE_NAME);
    res.json(groups);
});

// Save all groups (with ID generation for new groups)
router.post('/', async (req, res) => {
    try {
        const groups = req.body;
        if (!Array.isArray(groups)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        // Process groups to ensure IDs are set
        const processGroup = async (group, parentId = null) => {
            // Only generate an ID if it's missing; preserve existing IDs
            if (!group.id) {
                group.id = await generateGroupId(parentId);
            }

            if (group.subgroups && group.subgroups.length > 0) {
                for (let subgroup of group.subgroups) {
                    await processGroup(subgroup, group.id);
                }
            }

            return group;
        };

        const processedGroups = [];
        for (let group of groups) {
            processedGroups.push(await processGroup(group));
        }

        await writeData(FILE_NAME, processedGroups);
        res.json({ success: true, groups: processedGroups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;

// Delete a group (any level) and unassign displays belonging to it or its subtree
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const groups = await readData(FILE_NAME);
        const displays = await readData(DISPLAYS_FILE);

        // Collect all IDs in subtree to remove
        const collectIds = (group) => {
            const ids = [group.id];
            if (group.subgroups && group.subgroups.length) {
                for (const sg of group.subgroups) ids.push(...collectIds(sg));
            }
            return ids;
        };

        // Find subtree and remove
        let removedIds = [];
        const removeById = (list, targetId) => {
            return list
                .filter(g => g.id !== targetId)
                .map(g => ({
                    ...g,
                    subgroups: g.subgroups ? removeById(g.subgroups, targetId) : []
                }));
        };

        // Find target group to get subtree ids
        const findGroup = (list) => {
            for (const g of list) {
                if (g.id === id) return g;
                if (g.subgroups) {
                    const found = findGroup(g.subgroups);
                    if (found) return found;
                }
            }
            return null;
        };

        const target = findGroup(groups);
        if (!target) return res.status(404).json({ success: false, message: 'Group not found' });
        removedIds = collectIds(target);

        // Remove group from groups tree
        const newGroups = removeById(groups, id);

        // Unassign displays that belong to any removed group id
        let reassigned = 0;
        const updatedDisplays = displays.map(d => {
            if (d.groupId && removedIds.includes(d.groupId)) {
                reassigned += 1;
                return { ...d, groupId: '' };
            }
            return d;
        });

        await writeData(FILE_NAME, newGroups);
        await writeData(DISPLAYS_FILE, updatedDisplays);

        res.json({ success: true, removedIds, reassigned });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
