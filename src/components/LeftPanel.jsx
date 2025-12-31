import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiChevronDown, FiChevronRight, FiMoreVertical } from 'react-icons/fi';
import './LeftPanel.css';

const LeftPanel = ({ selectedGroup, onGroupSelect, groups, onAddGroup, onAddSubgroup, onDeleteGroup, onRenameGroup, items = [], itemType = 'ad' }) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupError, setNewGroupError] = useState(false);
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [subgroupForms, setSubgroupForms] = useState({});
    const [subgroupErrors, setSubgroupErrors] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const panelRef = useRef(null);

    // Auto-expand panel when switching to desktop mode
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024 && isCollapsed) {
                setIsCollapsed(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed]);

    // Close menu and empty add-group/subgroup forms on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!panelRef.current || panelRef.current.contains(event.target)) return;

            if (menuOpenId) {
                setMenuOpenId(null);
            }

            if (showAddGroup && !newGroupName.trim()) {
                setShowAddGroup(false);
                setNewGroupName('');
                setNewGroupError(false);
            }

            // Close any empty subgroup form that is open
            const hasOpenEmptySubgroup = Object.values(subgroupForms).some(f => f?.showForm && !(f.name || '').trim());
            if (hasOpenEmptySubgroup) {
                setSubgroupForms(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                        const entry = next[k];
                        if (entry?.showForm && !(entry.name || '').trim()) {
                            next[k] = { ...entry, showForm: false, name: '' };
                        }
                    });
                    return next;
                });
                setSubgroupErrors(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                        if (next[k]) next[k] = false;
                    });
                    return next;
                });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId, showAddGroup, newGroupName, subgroupForms]);

    const handleAddGroup = () => {
        const trimmed = newGroupName.trim();
        if (!trimmed) {
            setNewGroupError(true);
            return;
        }
        onAddGroup(trimmed);
        setNewGroupName('');
        setNewGroupError(false);
        setShowAddGroup(false);
    };

    const handleAddSubgroup = (parentGroupId) => {
        const subgroupName = subgroupForms[parentGroupId]?.name || '';
        const trimmed = subgroupName.trim();
        if (!trimmed) {
            setSubgroupErrors(prev => ({ ...prev, [parentGroupId]: true }));
            setSubgroupForms(prev => ({
                ...prev,
                [parentGroupId]: { ...prev[parentGroupId], showForm: true }
            }));
            return;
        }

        onAddSubgroup(parentGroupId, trimmed);
        setSubgroupErrors(prev => ({ ...prev, [parentGroupId]: false }));
        setSubgroupForms(prev => ({
            ...prev,
            [parentGroupId]: { ...prev[parentGroupId], name: '', showForm: false }
        }));
    };

    const toggleExpand = (groupId) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    const openSubgroupForm = (groupId) => {
        setSubgroupForms(prev => ({
            ...prev,
            [groupId]: { ...prev[groupId], showForm: true }
        }));
    };

    const handleRename = (group) => {
        const current = group.name || '';
        const next = window.prompt('Rename group', current);
        if (!next || next.trim() === '' || next.trim() === current) {
            setMenuOpenId(null);
            return;
        }
        if (typeof onRenameGroup === 'function') {
            onRenameGroup(group.id, next.trim());
        } else {
            alert('Rename not available here. Please wire onRenameGroup in parent.');
        }
        setMenuOpenId(null);
    };

    const getGroupItemCount = (groupId) => {
        // Count items assigned to this group
        return items.filter(item => item.groupId === groupId).length;
    };

    const renderGroup = (group, level = 0) => {
        const isExpanded = expandedGroups.has(group.id);
        const hasSubgroups = group.subgroups && group.subgroups.length > 0;
        const itemCount = getGroupItemCount(group.id);
        const showSubgroupForm = subgroupForms[group.id]?.showForm;

        return (
            <div key={group.id} className="group-item" style={{ marginLeft: `${level * 15}px` }}>
                <div
                    className={`group-header ${selectedGroup === group.id ? 'active' : ''}`}
                    onClick={() => onGroupSelect(group.id)}
                >
                    {hasSubgroups && (
                        <button
                            className="expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(group.id);
                            }}
                        >
                            {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                        </button>
                    )}
                    <span className="group-name">{group.name}</span>
                    <span className="item-count">{itemCount}</span>
                    <button
                        className="group-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(prev => prev === group.id ? null : group.id);
                        }}
                        title="More actions"
                    >
                        <FiMoreVertical />
                    </button>
                </div>

                {menuOpenId === group.id && (
                    <div className={`group-menu ${selectedGroup === group.id ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <button className="group-menu-item" onClick={() => { openSubgroupForm(group.id); setMenuOpenId(null); }}>Add Subgroup</button>
                        <button className="group-menu-item" onClick={() => handleRename(group)}>Rename</button>
                        {onDeleteGroup && (
                            <button className="group-menu-item danger" onClick={() => { onDeleteGroup(group.id); setMenuOpenId(null); }}>Delete</button>
                        )}
                    </div>
                )}

                {showSubgroupForm && (
                    <div className="subgroup-form" style={{ marginLeft: `${(level + 1) * 15}px` }}>
                        <input
                            type="text"
                            className={subgroupErrors[group.id] ? 'input-error' : ''}
                            placeholder="Subgroup name"
                            value={subgroupForms[group.id]?.name || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSubgroupForms(prev => ({
                                    ...prev,
                                    [group.id]: { ...prev[group.id], name: val }
                                }));
                                if (subgroupErrors[group.id] && val.trim()) {
                                    setSubgroupErrors(prev => ({ ...prev, [group.id]: false }));
                                }
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSubgroup(group.id)}
                        />
                        <button onClick={() => handleAddSubgroup(group.id)}>Add</button>
                    </div>
                )}

                {isExpanded && hasSubgroups && (
                    <div className="subgroups">
                        {group.subgroups.map(subgroup => renderGroup(subgroup, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={panelRef} className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-title">
                <h3>Groups</h3>
                <div className="panel-actions">
                    <button
                        className="collapse-btn mobile-only"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Expand Groups' : 'Collapse Groups'}
                    >
                        {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                    </button>
                    <button
                        className="add-group-btn"
                        onClick={() => setShowAddGroup(!showAddGroup)}
                        title="Add Group"
                    >
                        <FiPlus />
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="panel-content">
                    {showAddGroup && (
                        <div className="add-group-form">
                            <input
                                type="text"
                                className={newGroupError ? 'input-error' : ''}
                                placeholder="Group name"
                                value={newGroupName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewGroupName(val);
                                    if (newGroupError && val.trim()) setNewGroupError(false);
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddGroup()}
                            />
                            <button onClick={handleAddGroup}>Add</button>
                        </div>
                    )}

                    <div
                        className={`group-header all-items ${selectedGroup === 'all' ? 'active' : ''}`}
                        onClick={() => onGroupSelect('all')}
                    >
                        <span className="group-name">All {itemType}s</span>
                        <span className="item-count">{items.length}</span>
                    </div>

                    <div
                        className={`group-header all-items ${selectedGroup === 'none' ? 'active' : ''}`}
                        onClick={() => onGroupSelect('none')}
                    >
                        <span className="group-name">Not grouped</span>
                        <span className="item-count">{items.filter(i => !i.groupId).length}</span>
                    </div>

                    <div className="groups-list">
                        {groups.map(group => renderGroup(group))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeftPanel;
