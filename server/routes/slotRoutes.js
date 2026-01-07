import express from 'express';
import { readData, writeData } from '../utils/fileHelper.js';
import { loadSchedules, saveSchedules, pruneExpired, findEarliestStart, SLOT_LIMIT_SECONDS } from '../utils/scheduleHelper.js';

const router = express.Router();

const normalizeDateStr = (d) => {
    const date = new Date(d);
    return date.toISOString().split('T')[0];
};

const toDate = (value) => {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const buildGroupIndex = (groups) => {
    const index = new Map();
    const walk = (node, parentId = null, path = []) => {
        const currentPath = [...path, node.name];
        index.set(node.id, { node, parentId, path: currentPath, children: (node.subgroups || []).map(sg => sg.id) });
        (node.subgroups || []).forEach(sg => walk(sg, node.id, currentPath));
    };
    (groups || []).forEach(g => walk(g, null, []));
    return index;
};

const collectAncestors = (groupId, index) => {
    const ancestors = [];
    let current = groupId;
    while (current && index.has(current)) {
        const parentId = index.get(current).parentId;
        if (parentId) ancestors.push(parentId);
        current = parentId;
    }
    return ancestors;
};

const displayCountsByGroup = (groups, displays) => {
    const index = buildGroupIndex(groups);
    const counts = new Map();

    const bump = (id) => counts.set(id, (counts.get(id) || 0) + 1);

    (displays || []).forEach(display => {
        const gid = display.groupId;
        if (!gid) return;
        bump(gid);
        collectAncestors(gid, index).forEach(bump);
    });

    return { counts, index };
};

const collectDescWithDisplays = (rootId, index, counts) => {
    const out = [];
    const walk = (id) => {
        if (!index.has(id)) return;
        if ((counts.get(id) || 0) > 0) out.push(id);
        const children = index.get(id).children || [];
        children.forEach(walk);
    };
    walk(rootId);
    return Array.from(new Set(out));
};

const expandGroupsToDisplayBearing = (inputIds, index, counts) => {
    const expanded = new Set();
    (inputIds || []).forEach(id => {
        collectDescWithDisplays(id, index, counts).forEach(gid => expanded.add(gid));
    });
    return Array.from(expanded);
};

const parseGroupIds = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return value.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    return [];
};

router.post('/availability', async (req, res) => {
    try {
        const { groupIds, durationSeconds, weeks, startFrom } = req.body || {};

        if (!Array.isArray(groupIds) || groupIds.length === 0) {
            return res.status(400).json({ success: false, message: 'groupIds array is required' });
        }
        const duration = parseFloat(durationSeconds);
        if (!duration || duration <= 0) {
            return res.status(400).json({ success: false, message: 'durationSeconds must be > 0' });
        }
        const weeksInt = parseInt(weeks, 10) || 1;

        const groups = await readData('groups.json');
        const displays = await readData('displays.json');
        const schedulesRaw = await loadSchedules();
        const { cleaned, changed } = pruneExpired(schedulesRaw);
        const schedules = cleaned;
        if (changed) {
            await saveSchedules(cleaned);
        }

        const { counts, index } = displayCountsByGroup(groups, displays);
        const missingGroups = groupIds.filter(id => !index.has(id));
        if (missingGroups.length) {
            return res.status(400).json({ success: false, message: `Unknown groupIds: ${missingGroups.join(', ')}` });
        }

        const expandedGroupIds = expandGroupsToDisplayBearing(groupIds, index, counts);
        if (!expandedGroupIds.length) {
            return res.status(400).json({ success: false, message: 'Selected groups have no displays in subtree' });
        }

        const targetStart = startFrom ? toDate(startFrom) : new Date();
        const earliest = findEarliestStart(schedules, expandedGroupIds, duration, weeksInt, targetStart);

        const perGroup = (earliest.perGroup || []).map(item => ({
            ...item,
            hasDisplays: (counts.get(item.groupId) || 0) > 0,
            totalDisplays: counts.get(item.groupId) || 0
        }));

        const earliestDateStr = earliest.date ? normalizeDateStr(earliest.date) : null;
        const fitsNow = earliest.date ? normalizeDateStr(targetStart) === earliestDateStr : false;

        res.json({
            success: true,
            earliestStartDate: earliestDateStr,
            fitsNow,
            slotSeconds: SLOT_LIMIT_SECONDS,
            weeks: weeksInt,
            durationSeconds: duration,
            groups: perGroup,
            expandedGroupIds
        });
    } catch (error) {
        console.error('Error in availability:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Slot checker (GET) for quick probing
router.get('/next', async (req, res) => {
    try {
        const groupIds = parseGroupIds(req.query.groupIds || req.query.groupId);
        const duration = parseFloat(req.query.durationSeconds || req.query.duration);
        const weeksInt = parseInt(req.query.weeks, 10) || 1;
        const startFrom = req.query.startFrom ? toDate(req.query.startFrom) : new Date();

        if (!groupIds.length) return res.status(400).json({ success: false, message: 'groupIds is required' });
        if (!duration || duration <= 0) return res.status(400).json({ success: false, message: 'durationSeconds must be > 0' });

        const groups = await readData('groups.json');
        const displays = await readData('displays.json');
        const schedulesRaw = await loadSchedules();
        const { cleaned, changed } = pruneExpired(schedulesRaw);
        const schedules = cleaned;
        if (changed) await saveSchedules(cleaned);

        const { counts, index } = displayCountsByGroup(groups, displays);
        const missingGroups = groupIds.filter(id => !index.has(id));
        if (missingGroups.length) {
            return res.status(400).json({ success: false, message: `Unknown groupIds: ${missingGroups.join(', ')}` });
        }

        const expandedGroupIds = expandGroupsToDisplayBearing(groupIds, index, counts);
        if (!expandedGroupIds.length) {
            return res.status(400).json({ success: false, message: 'Selected groups have no displays in subtree' });
        }

        const earliest = findEarliestStart(schedules, expandedGroupIds, duration, weeksInt, startFrom);
        const earliestDateStr = earliest.date ? normalizeDateStr(earliest.date) : null;
        const perGroup = (earliest.perGroup || []).map(item => ({
            ...item,
            hasDisplays: (counts.get(item.groupId) || 0) > 0,
            totalDisplays: counts.get(item.groupId) || 0
        }));

        res.json({
            success: true,
            earliestStartDate: earliestDateStr,
            slotSeconds: SLOT_LIMIT_SECONDS,
            weeks: weeksInt,
            durationSeconds: duration,
            groups: perGroup,
            expandedGroupIds
        });
    } catch (error) {
        console.error('Error in /next:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
