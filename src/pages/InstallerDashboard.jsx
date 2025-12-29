import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { FiMonitor, FiPlus, FiLogOut, FiMapPin, FiCalendar, FiEye, FiEdit2, FiSearch } from 'react-icons/fi';
import DisplayForm from '../components/DisplayForm';
import './InstallerDashboard.css';

function InstallerDashboard() {
    const { user, logout } = useAuth();
    const [displays, setDisplays] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDisplay, setEditingDisplay] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allDisplays = await api.getDisplays();
            // Filter displays for this installer
            const myDisplays = allDisplays.filter(d => d.installerId === user.id);
            setDisplays(myDisplays);
        } catch (error) {
            console.error('Error loading displays:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Apply search, filter, sort
        let list = [...displays];
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(d =>
                (d.id || '').toLowerCase().includes(q) ||
                (d.address || '').toLowerCase().includes(q) ||
                (d.gpsCoordinates || '').toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            list = list.filter(d => d.status === statusFilter);
        }
        list.sort((a, b) => {
            if (sortBy === 'date') return new Date(b.installedDate) - new Date(a.installedDate);
            if (sortBy === 'id') return (a.id || '').localeCompare(b.id || '');
            return 0;
        });
        setFiltered(list);
    }, [displays, searchTerm, statusFilter, sortBy]);

    const handleAddClick = () => {
        setEditingDisplay(null);
        setShowModal(true);
    };

    const handleEditClick = (display) => {
        setEditingDisplay(display);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDisplay(null);
        loadData();
    };

    const totalDisplays = displays.length;

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="installer-dashboard">
            <header className="installer-header">
                <div className="brand">
                    <span className="brand-icon">Z</span>
                    <h2>Zenai Installer</h2>
                </div>
                <div className="header-right">
                    <span>Welcome, {user?.name}</span>
                    <button onClick={logout} className="logout-btn">
                        <FiLogOut /> Logout
                    </button>
                </div>
            </header>

            <main className="main-content">
                {/* Stats Section */}
                <div className="stats-row">
                    <div className="installer-stat-card">
                        <div className="icon-wrapper">
                            <FiMonitor />
                        </div>
                        <div className="stat-details">
                            <h3>Total Displays Installed</h3>
                            <p className="stat-number">{totalDisplays}</p>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="action-bar">
                    <h2>My Displays</h2>
                    <div className="toolbar">
                        <div className="search-box">
                            <FiSearch />
                            <input
                                type="text"
                                placeholder="Search by ID, address, GPS"
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
                        </select>
                    </div>
                    <button className="btn-primary" onClick={handleAddClick}>
                        <FiPlus /> Add Display
                    </button>
                </div>

                {/* Displays Grid - Simplified View (Matched with Admin styles conceptually but specific to installer) */}
                <div className="displays-grid">
                    {filtered.length === 0 ? (
                        <div className="no-data">
                            <p>No displays installed yet. Click "Add Display" to get started.</p>
                        </div>
                    ) : (
                        filtered.map(display => (
                            <div key={display.id} className="display-card-simple">
                                <div className="card-header-simple">
                                    <h3 className="display-unique-id">
                                        {display.id}
                                        <span className={`status-dot ${display.status}`}></span>
                                    </h3>
                                    <span className="internal-id">Installed: {new Date(display.installedDate).toLocaleDateString()}</span>
                                </div>

                                <div className="card-body-simple">
                                    <div className="info-item">
                                        <FiMapPin />
                                        <span>{display.gpsCoordinates || 'No GPS'}</span>
                                    </div>
                                    <div className="info-item">
                                        <FiCalendar />
                                        <span>Address: {display.address}</span>
                                    </div>
                                </div>

                                <div className="card-footer-simple">
                                    <button className="btn-edit-simple" onClick={() => { setShowViewModal(true); setEditingDisplay(display); }}>
                                        <FiEye /> View
                                    </button>
                                    <button className="btn-edit-simple" onClick={() => handleEditClick(display)}>
                                        <FiEdit2 /> Edit Details
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal for Add/Edit using DisplayForm */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDisplay ? 'Edit Display' : 'Add New Display'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <DisplayForm
                                display={editingDisplay}
                                isEditing={Boolean(editingDisplay)}
                                onClose={handleCloseModal}
                                onSuccess={handleCloseModal}
                                user={user}
                                isInstaller={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal without impressions/installer/group */}
            {showViewModal && editingDisplay && (
                <div className="modal-overlay" onClick={() => { setShowViewModal(false); setEditingDisplay(null); }}>
                    <div className="modal-content details-view" onClick={(e) => e.stopPropagation()}>
                        <h2>Display Info</h2>
                        <div className="details-layout">
                            <div className="details-media">
                                {editingDisplay.photoUrl ? (
                                    <img src={`http://localhost:3001${editingDisplay.photoUrl}`} alt={editingDisplay.id} />
                                ) : (
                                    <div className="no-media">No Photo Available</div>
                                )}
                            </div>
                            <div className="details-info">
                                <div className="detail-row"><strong>ID:</strong> {editingDisplay.id}</div>
                                <div className="detail-row"><strong>GPS:</strong> {editingDisplay.gpsCoordinates}</div>
                                <div className="detail-row"><strong>Address:</strong> {editingDisplay.address}</div>
                                <div className="detail-row"><strong>Maps:</strong> {editingDisplay.googleMapsLink ? (<a href={editingDisplay.googleMapsLink} target="_blank" rel="noreferrer">Open Link</a>) : 'N/A'}</div>
                                <div className="detail-row"><strong>Status:</strong> <span className={`status-badge ${editingDisplay.status}`}>{editingDisplay.status}</span></div>
                                <div className="detail-row"><strong>Date:</strong> {new Date(editingDisplay.installedDate).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={() => { setShowViewModal(false); setEditingDisplay(null); }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstallerDashboard;
