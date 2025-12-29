import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch, FiFolderPlus, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import LeftPanel from '../../components/LeftPanel';
import DisplayForm from '../../components/DisplayForm';
import './DisplayManager.css';

function DisplayManager() {
    const { user } = useAuth();
    const [displays, setDisplays] = useState([]);
    const [filteredDisplays, setFilteredDisplays] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [currentDisplay, setCurrentDisplay] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Search & filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    // Group selection for "Add to Group" quick action
    const [quickGroupSelect, setQuickGroupSelect] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [displays, searchTerm, statusFilter, sortBy, selectedGroup]);

    const loadData = async () => {
        try {
            const [displaysData, groupsData] = await Promise.all([
                api.getDisplays(),
                api.getGroups()
            ]);
            setDisplays(displaysData);
            setGroups(groupsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...displays];

        // Search
        if (searchTerm) {
            filtered = filtered.filter(d =>
                d.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.installerName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => d.status === statusFilter);
        }

        // Group filter
        if (selectedGroup === 'none') {
            filtered = filtered.filter(d => !d.groupId);
        } else if (selectedGroup !== 'all') {
            filtered = filtered.filter(d => d.groupId === selectedGroup);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.installedDate) - new Date(a.installedDate);
            } else if (sortBy === 'id') {
                return a.id.localeCompare(b.id);
            } else if (sortBy === 'impressions') {
                return (b.impressions || 0) - (a.impressions || 0);
            }
            return 0;
        });

        setFilteredDisplays(filtered);
    };

    const handleFormSuccess = () => {
        setShowModal(false);
        loadData();
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentDisplay(null);
        setShowModal(true);
    };

    const openEditModal = (display) => {
        setIsEditing(true);
        setCurrentDisplay(display);
        setShowModal(true);
    };

    const openDetailsModal = (display) => {
        setCurrentDisplay(display);
        setShowDetailsModal(true);
    };

    const openGroupModal = (display) => {
        setCurrentDisplay(display);
        setQuickGroupSelect('');
        setShowGroupModal(true);
    };

    const handleQuickGroupAdd = async () => {
        if (!quickGroupSelect || !currentDisplay) return;

        try {
            // We need to update the display with the new groupId
            // Since our backend doesn't support PATCH, we construct a FormData to update
            const submitData = new FormData();
            submitData.append('groupId', quickGroupSelect);

            // Re-append other required fields to keep them safe if PUT replaces all
            // Ideally backend handles partial, but keeping it safe based on existing code
            submitData.append('gpsCoordinates', currentDisplay.gpsCoordinates);
            submitData.append('address', currentDisplay.address);
            submitData.append('installedDate', currentDisplay.installedDate);
            submitData.append('installerId', currentDisplay.installerId);
            submitData.append('status', currentDisplay.status);
            submitData.append('installerName', currentDisplay.installerName);

            await api.updateDisplay(currentDisplay.id, submitData);

            setShowGroupModal(false);
            loadData();
            alert('Added to group successfully');
        } catch (error) {
            console.error('Error adding to group', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this display?')) {
            try {
                await api.deleteDisplay(id);
                loadData();
            } catch (error) {
                console.error('Error deleting display:', error);
            }
        }
    };

    const handleGroupSelect = (groupId) => {
        setSelectedGroup(groupId);
    };

    // Group creation logic handled in LeftPanel, just need to refresh
    // Helpers to modify group tree
    const addGroup = async (name) => {
        try {
            const newGroups = [...groups, { name, subgroups: [] }];
            const result = await api.saveGroups(newGroups);
            if (result.success) {
                setGroups(result.groups);
            }
        } catch (e) { console.error('Add group failed', e); }
    };

    const addSubgroup = async (parentId, name) => {
        try {
            const clone = JSON.parse(JSON.stringify(groups));

            const insertSubgroup = (list) => {
                for (const g of list) {
                    if (g.id === parentId) {
                        if (!g.subgroups) g.subgroups = [];
                        g.subgroups.push({ name, subgroups: [] });
                        return true;
                    }
                    if (g.subgroups && insertSubgroup(g.subgroups)) return true;
                }
                return false;
            };

            insertSubgroup(clone);
            const result = await api.saveGroups(clone);
            if (result.success) {
                setGroups(result.groups);
            }
        } catch (e) { console.error('Add subgroup failed', e); }
    };

    // Recursive options for quick add
    const renderGroupOptions = (groupList, level = 0) => {
        return groupList.map(group => (
            <>
                <option key={group.id} value={group.id}>
                    {'\u00A0'.repeat(level * 4)}{group.name}
                </option>
                {group.subgroups && group.subgroups.length > 0 &&
                    renderGroupOptions(group.subgroups, level + 1)}
            </>
        ));
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="display-manager">
            <div className="manager-layout">
                <LeftPanel
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    groups={groups}
                    onAddGroup={addGroup}
                    onAddSubgroup={addSubgroup}
                    onDeleteGroup={async (groupId) => {
                        if (!groupId) return;
                        if (!window.confirm('Delete this group and unassign its displays?')) return;
                        try {
                            const result = await api.deleteGroup(groupId);
                            if (result.success) {
                                await loadData();
                                alert(`Group deleted. ${result.reassigned || 0} displays unassigned.`);
                            } else {
                                alert(result.message || 'Failed to delete group');
                            }
                        } catch (e) {
                            console.error('Delete group failed', e);
                            alert('Error deleting group');
                        }
                    }}
                    items={displays}
                    itemType="display"
                />

                <div className="main-panel">
                    <div className="panel-header">
                        <h2>Display Management</h2>
                        <button className="btn-primary" onClick={openAddModal}>
                            <FiPlus /> Add Display
                        </button>
                    </div>

                    <div className="toolbar">
                        <div className="search-box">
                            <FiSearch />
                            <input
                                type="text"
                                placeholder="Search by ID, Address, Installer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                        </select>

                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="date">Sort by Date</option>
                            <option value="id">Sort by ID</option>
                            <option value="impressions">Sort by Impressions</option>
                        </select>

                        <div className="total-count">
                            Total: {filteredDisplays.length}
                        </div>
                    </div>

                    <div className="displays-grid simple-card-view">
                        {filteredDisplays.map(display => (
                            <div key={display.id} className="display-card simple">
                                <div className="card-header">
                                    <h3 className="display-id">{display.id} <span className={`status-dot ${display.status}`}></span></h3>
                                </div>

                                <div className="card-content">
                                    <div className="info-row" title="Direct Map Link">
                                        <FiMapPin />
                                        {display.gpsCoordinates ? (
                                            <a
                                                href={display.googleMapsLink || `https://www.google.com/maps?q=${display.gpsCoordinates}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {display.gpsCoordinates}
                                            </a>
                                        ) : <span>No GPS</span>}
                                    </div>
                                    <p className="address-truncate">{display.address}</p>
                                    <div className="meta-info">
                                        <span>Installed: {new Date(display.installedDate).toLocaleDateString()}</span>
                                        <span>By: {display.installerName}</span>
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button className="icon-btn view" onClick={() => openDetailsModal(display)} title="View Details">
                                        <FiEye />
                                    </button>
                                    <button className="icon-btn edit" onClick={() => openEditModal(display)} title="Edit">
                                        <FiEdit2 />
                                    </button>
                                    <button className="icon-btn group-add" onClick={() => openGroupModal(display)} title="Add to Group">
                                        <FiFolderPlus />
                                    </button>
                                    <button className="icon-btn delete" onClick={() => handleDelete(display.id)} title="Delete">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal using DisplayForm */}
            {showModal && (
                <DisplayForm
                    display={currentDisplay}
                    isEditing={isEditing}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleFormSuccess}
                    user={user}
                />
            )}

            {/* Quick Group Add Modal */}
            {showGroupModal && (
                <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
                    <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
                        <h2>Add to Group</h2>
                        <p>Select a group for Display: <strong>{currentDisplay?.id}</strong></p>
                        <select
                            value={quickGroupSelect}
                            onChange={(e) => setQuickGroupSelect(e.target.value)}
                            className="group-select"
                        >
                            <option value="">Select Group</option>
                            {renderGroupOptions(groups)}
                        </select>
                        <div className="modal-actions">
                            <button onClick={() => setShowGroupModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleQuickGroupAdd} className="btn-primary">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal - FULL VIEW per request */}
            {showDetailsModal && currentDisplay && (
                <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="modal-content details-view" onClick={(e) => e.stopPropagation()}>
                        <h2>Display Details</h2>

                        <div className="details-layout">
                            <div className="details-media">
                                {currentDisplay.photoUrl ? (
                                    <img src={`http://localhost:3001${currentDisplay.photoUrl}`} alt={currentDisplay.id} />
                                ) : (
                                    <div className="no-media">No Photo Available</div>
                                )}
                            </div>

                            <div className="details-info">
                                <div className="detail-row">
                                    <strong>ID:</strong> {currentDisplay.id}
                                </div>
                                <div className="detail-row">
                                    <strong>GPS:</strong> {currentDisplay.gpsCoordinates}
                                </div>
                                <div className="detail-row">
                                    <strong>Address:</strong> {currentDisplay.address}
                                </div>
                                <div className="detail-row">
                                    <strong>Maps:</strong>
                                    {currentDisplay.googleMapsLink && <a href={currentDisplay.googleMapsLink} target="_blank" rel="noreferrer">Open Link</a>}
                                </div>
                                <div className="detail-row">
                                    <strong>Status:</strong> <span className={`status-badge ${currentDisplay.status}`}>{currentDisplay.status}</span>
                                </div>
                                <div className="detail-row">
                                    <strong>Installer:</strong> {currentDisplay.installerName}
                                </div>
                                <div className="detail-row">
                                    <strong>Installer ID:</strong> {currentDisplay.installerId}
                                </div>
                                <div className="detail-row">
                                    <strong>Date:</strong> {new Date(currentDisplay.installedDate).toLocaleDateString()}
                                </div>
                                <div className="detail-row">
                                    <strong>Impressions:</strong> {(currentDisplay.impressions || 0).toLocaleString()}
                                </div>
                                <div className="detail-row">
                                    <strong>Group:</strong> {currentDisplay.groupId || 'None'}
                                </div>
                                <div className="detail-row">
                                    <strong>Added by:</strong> {currentDisplay.createdBy}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setShowDetailsModal(false)} className="btn-primary">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DisplayManager;
