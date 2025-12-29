import { useState, useEffect } from 'react';
import { FiPlus, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import './LeftPanel.css';

const LeftPanel = ({ selectedGroup, onGroupSelect, groups, onAddGroup, onAddSubgroup, onDeleteGroup, items = [], itemType = 'ad' }) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [subgroupForms, setSubgroupForms] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            onAddGroup(newGroupName);
            setNewGroupName('');
            setShowAddGroup(false);
        }
    };

    const handleAddSubgroup = (parentGroupId) => {
        const subgroupName = subgroupForms[parentGroupId]?.name || '';
        if (subgroupName.trim()) {
            onAddSubgroup(parentGroupId, subgroupName);
            setSubgroupForms(prev => ({
                ...prev,
                [parentGroupId]: { ...prev[parentGroupId], name: '', showForm: false }
            }));
        }
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
                    {onDeleteGroup && (
                        <button
                            className="delete-group-btn"
                            title="Delete Group"
                            onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                        >
                            ×
                        </button>
                    )}
                    <button
                        className="add-subgroup-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSubgroupForms(prev => ({
                                ...prev,
                                [group.id]: { ...prev[group.id], showForm: !showSubgroupForm }
                            }));
                        }}
                        title="Add Subgroup"
                    >
                        <FiPlus />
                    </button>
                </div>

                {showSubgroupForm && (
                    <div className="subgroup-form" style={{ marginLeft: `${(level + 1) * 15}px` }}>
                        <input
                            type="text"
                            placeholder="Subgroup name"
                            value={subgroupForms[group.id]?.name || ''}
                            onChange={(e) => setSubgroupForms(prev => ({
                                ...prev,
                                [group.id]: { ...prev[group.id], name: e.target.value }
                            }))}
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
        <div className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}>
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
                                placeholder="Group name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
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
