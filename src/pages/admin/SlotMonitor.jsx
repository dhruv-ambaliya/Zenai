import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import './SlotMonitor.css';

const buildIndex = (groups) => {
    const index = new Map();
    const walk = (node, parentId = null, path = []) => {
        const currentPath = [...path, node.name];
        index.set(node.id, { node, parentId, path: currentPath });
        (node.subgroups || []).forEach(sg => walk(sg, node.id, currentPath));
    };
    (groups || []).forEach(g => walk(g, null, []));
    return index;
};

const computeDisplayCounts = (index, displays) => {
    const counts = new Map();
    const bump = (id) => counts.set(id, (counts.get(id) || 0) + 1);
    (displays || []).forEach(d => {
        const gid = d.groupId;
        if (!gid || !index.has(gid)) return;
        let current = gid;
        while (current) {
            bump(current);
            current = index.get(current)?.parentId;
        }
    });
    return counts;
};

const flattenGroups = (index, counts) => {
    const rows = [];
    for (const [id, info] of index.entries()) {
        const displayCount = counts.get(id) || 0;
        if (displayCount > 0) {
            rows.push({
                id,
                label: info.path.join(' / '),
                level: info.path.length - 1,
                displays: displayCount
            });
        }
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label));
};

function SlotMonitor() {
    const [groups, setGroups] = useState([]);
    const [displays, setDisplays] = useState([]);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availMap, setAvailMap] = useState(new Map());

    useEffect(() => {
        const load = async () => {
            try {
                const [g, d, a] = await Promise.all([
                    api.getGroups(),
                    api.getDisplays(),
                    api.getAds()
                ]);
                setGroups(g || []);
                setDisplays(d || []);
                setAds(a || []);
            } catch (err) {
                console.error('Error loading slot monitor data', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const index = useMemo(() => buildIndex(groups), [groups]);
    const counts = useMemo(() => computeDisplayCounts(index, displays), [index, displays]);
    const rows = useMemo(() => flattenGroups(index, counts), [index, counts]);

    useEffect(() => {
        const fetchAvail = async () => {
            try {
                const entries = await Promise.all(rows.map(async row => {
                    const resp = await api.slotsNext({ groupIds: [row.id], durationSeconds: 5, weeks: 1 });
                    return [row.id, resp?.earliestStartDate || null];
                }));
                setAvailMap(new Map(entries));
            } catch (err) {
                console.error('Error fetching availability', err);
            }
        };
        if (rows.length) fetchAvail();
    }, [rows]);

    const activeAdsByGroup = useMemo(() => {
        const map = new Map();
        (ads || []).forEach(ad => {
            (ad.placements || []).forEach(p => {
                const list = map.get(p.groupId) || [];
                list.push({ ad, placement: p });
                map.set(p.groupId, list);
            });
        });
        return map;
    }, [ads]);

    if (loading) return <div className="slot-monitor"><div className="loading">Loading...</div></div>;

    return (
        <div className="slot-monitor">
            <div className="header">
                <h2>Slot Monitor</h2>
                <p className="muted">View group slots, displays, and current ads. Read-only.</p>
            </div>
            <div className="table">
                <div className="table-head">
                    <div>Group</div>
                    <div>Displays</div>
                    <div>Next slot (5s)</div>
                    <div>Active ads</div>
                </div>
                <div className="table-body">
                    {rows.map(row => (
                        <div className="table-row" key={row.id}>
                            <div className="cell group" style={{ paddingLeft: `${row.level * 14}px` }}>
                                <div className="group-name">{row.label}</div>
                                <div className="group-id muted">{row.id}</div>
                            </div>
                            <div className="cell">{row.displays}</div>
                            <div className="cell">{availMap.get(row.id) || 'n/a'}</div>
                            <div className="cell ads-cell">
                                {activeAdsByGroup.get(row.id)?.length ? (
                                    activeAdsByGroup.get(row.id).map(({ ad, placement }) => (
                                        <div key={`${ad.id}-${placement.groupId}`} className="pill">
                                            <span className={`status-dot ${ad.status}`}></span>
                                            {ad.id} · {ad.videoDuration} · {placement.startDate}→{placement.endDate}
                                        </div>
                                    ))
                                ) : (
                                    <span className="muted">None</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SlotMonitor;
