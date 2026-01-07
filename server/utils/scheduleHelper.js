import { readData, writeData } from './fileHelper.js';

const FILE_NAME = 'schedules.json';
const SLOT_SECONDS = 60;

const toDate = (value) => {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

const normalizeSchedules = (schedules) => Array.isArray(schedules) ? schedules : [];

export const loadSchedules = async () => {
    const data = await readData(FILE_NAME);
    return normalizeSchedules(data);
};

export const saveSchedules = async (schedules) => {
    await writeData(FILE_NAME, schedules);
};

export const pruneExpired = (schedules, today = new Date()) => {
    const todayMid = toDate(today).getTime();
    let changed = false;

    const cleaned = normalizeSchedules(schedules).map(group => {
        const bookings = Array.isArray(group.bookings) ? group.bookings : [];
        const filtered = bookings.filter(b => {
            const end = toDate(b.endDate).getTime();
            return end > todayMid;
        });
        if (filtered.length !== bookings.length) changed = true;
        return { ...group, bookings: filtered };
    });

    return { cleaned, changed };
};

const ensureGroupSchedule = (schedules, groupId) => {
    const existing = schedules.find(g => g.groupId === groupId);
    if (existing) return existing;
    const created = { groupId, bookings: [] };
    schedules.push(created);
    return created;
};

const usageByWeek = (groupSchedule, candidateStart, weeks) => {
    const usage = Array.from({ length: weeks }, () => 0);
    const bookings = groupSchedule?.bookings || [];

    for (const booking of bookings) {
        const bStart = toDate(booking.startDate);
        const bEnd = toDate(booking.endDate);

        for (let i = 0; i < weeks; i++) {
            const weekStart = addDays(candidateStart, i * 7);
            const weekEnd = addDays(weekStart, 7);
            if (overlaps(bStart, bEnd, weekStart, weekEnd)) {
                usage[i] += booking.durationSeconds;
            }
        }
    }

    return usage;
};

const canFit = (groupSchedule, candidateStart, weeks, durationSeconds) => {
    const usage = usageByWeek(groupSchedule, candidateStart, weeks);
    return usage.every(u => u + durationSeconds <= SLOT_SECONDS);
};

export const findEarliestStart = (schedules, groupIds, durationSeconds, weeks, startFrom = new Date(), horizonDays = 365) => {
    const start = toDate(startFrom);
    for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset++) {
        const candidate = addDays(start, dayOffset);
        const fitsAll = groupIds.every(id => {
            const schedule = schedules.find(g => g.groupId === id) || { bookings: [] };
            return canFit(schedule, candidate, weeks, durationSeconds);
        });
        if (fitsAll) {
            const perGroup = groupIds.map(id => {
                const schedule = schedules.find(g => g.groupId === id) || { bookings: [] };
                const usage = usageByWeek(schedule, candidate, weeks);
                return {
                    groupId: id,
                    freeSecondsByWeek: usage.map(u => SLOT_SECONDS - u)
                };
            });
            return { date: candidate, perGroup };
        }
    }
    return { date: null, perGroup: [] };
};

export const addBookings = (schedules, groupIds, booking) => {
    groupIds.forEach(groupId => {
        const target = ensureGroupSchedule(schedules, groupId);
        target.bookings.push(booking);
    });
    return schedules;
};

export const removeAdBookings = (schedules, adId) => {
    let changed = false;
    const cleaned = normalizeSchedules(schedules).map(group => {
        const bookings = Array.isArray(group.bookings) ? group.bookings : [];
        const filtered = bookings.filter(b => b.adId !== adId);
        if (filtered.length !== bookings.length) changed = true;
        return { ...group, bookings: filtered };
    });
    return { cleaned, changed };
};

const normalizeDateStr = (date) => toDate(date).toISOString().split('T')[0];

export const bookEarliest = (schedules, adId, groupIds, durationSeconds, weeks, startFrom = new Date()) => {
    const earliest = findEarliestStart(schedules, groupIds, durationSeconds, weeks, startFrom);
    if (!earliest.date) return { booked: false, schedules, booking: null, perGroup: earliest.perGroup };

    const startDate = normalizeDateStr(earliest.date);
    const endDate = normalizeDateStr(addDays(earliest.date, weeks * 7));
    const booking = { adId, startDate, endDate, durationSeconds };
    addBookings(schedules, groupIds, booking);
    return {
        booked: true,
        schedules,
        booking,
        perGroup: earliest.perGroup,
        startDate,
        endDate
    };
};

export const SLOT_LIMIT_SECONDS = SLOT_SECONDS;
