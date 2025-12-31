import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch, FiGrid, FiList, FiMoreVertical } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import AdForm from '../../components/AdForm';
import './AdManager.css';

function AdManager() {
    const { user } = useAuth();
    const [ads, setAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [currentAd, setCurrentAd] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Search & filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
    const [openMenu, setOpenMenu] = useState(null); // Track which ad's menu is open

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        applyFilters();
    }, [ads, searchTerm, statusFilter, sortBy]);

    const loadData = async () => {
        try {
            const adsData = await api.getAds();
            setAds(adsData);
        } catch (error) {
            console.error('Error loading ads:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...ads];

        if (searchTerm) {
            filtered = filtered.filter(a =>
                a.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            } else if (sortBy === 'price') {
                return (b.finalPrice || 0) - (a.finalPrice || 0);
            } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });

        setFilteredAds(filtered);
    };

    const handleFormSuccess = () => {
        setShowModal(false);
        loadData();
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentAd(null);
        setShowModal(true);
    };

    const openEditModal = (ad) => {
        setIsEditing(true);
        setCurrentAd(ad);
        setShowModal(true);
    };

    const openDetailsModal = (ad) => {
        setCurrentAd(ad);
        setShowDetailsModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this ad?')) {
            try {
                await api.deleteAd(id);
                loadData();
            } catch (error) {
                console.error('Error deleting ad:', error);
            }
        }
    };

    const getRemainingDays = (ad) => {
        const start = new Date(ad.startDate);
        const end = ad.endDate ? new Date(ad.endDate) : (() => {
            const e = new Date(start);
            e.setDate(e.getDate() + ((parseInt(ad.weeks) || 1) * 7));
            return e;
        })();

        // If campaign not started yet, show full duration (start->end); otherwise count down to end
        const now = new Date();
        const anchor = now < start ? start : now;
        const diffTime = end - anchor;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="ad-manager">
            <div className="panel-header">
                <h2>Ads Management</h2>
                <button className="btn-primary" onClick={openAddModal}>
                    <FiPlus /> Add Ad
                </button>
            </div>

            <div className="toolbar">
                <div className="search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search IDs, Names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="date">Sort by Date</option>
                    <option value="price">Sort by Price</option>
                    <option value="name">Sort by Name</option>
                </select>

                <div className="view-toggle">
                    <button
                        className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
                        onClick={() => setViewMode('card')}
                        title="Card View"
                    >
                        <FiGrid />
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List View"
                    >
                        <FiList />
                    </button>
                </div>

                <div className="total-count">
                    Total: {filteredAds.length}
                </div>
            </div>

            <div className={viewMode === 'card' ? 'ads-grid vertical-view' : 'ads-grid list-view'}>
                {filteredAds.map(ad => (
                    <div key={ad.id} className={viewMode === 'card' ? 'ad-card vertical' : 'ad-card list'}>
                        {viewMode === 'card' ? (
                            <>
                                <div className="card-preview">
                                    <div className="preview-container">
                                        {ad.mediaUrl ? (
                                            ad.mediaType === 'video' ? (
                                                <video src={`http://localhost:3001${ad.mediaUrl}`} className="fit-content" />
                                            ) : (
                                                <img src={`http://localhost:3001${ad.mediaUrl}`} alt={ad.name} className="fit-content" />
                                            )
                                        ) : (
                                            <div className="no-media">No Media</div>
                                        )}
                                    </div>                                    <div className="card-menu-wrapper mobile-only">
                                        <button className="corner-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === ad.id ? null : ad.id); }} title="More options">
                                            <FiMoreVertical />
                                        </button>
                                        {openMenu === ad.id && (
                                            <div className="dropdown-menu corner">
                                                <button onClick={() => { openDetailsModal(ad); setOpenMenu(null); }}>View</button>
                                                <button onClick={() => { openEditModal(ad); setOpenMenu(null); }}>Edit</button>
                                                <button onClick={() => { handleDelete(ad.id); setOpenMenu(null); }}>Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="card-content">
                                    <h3>{ad.name}</h3>
                                    <h6 className="ad-id">{ad.id} &nbsp; <span className={`status-dot ${ad.status}`}></span></h6>
                                    <div className="ad-metrics">
                                        <span>Rem. Days: <strong>{getRemainingDays(ad)}</strong></span>
                                        <span>Price: <strong>₹{ad.finalPrice?.toLocaleString()}</strong></span>
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button className="icon-btn view desktop-only" onClick={() => openDetailsModal(ad)} title="View Details">
                                        <FiEye />
                                    </button>
                                    <button className="icon-btn edit desktop-only" onClick={() => openEditModal(ad)} title="Edit">
                                        <FiEdit2 />
                                    </button>
                                    <button className="icon-btn delete desktop-only" onClick={() => handleDelete(ad.id)} title="Delete">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="list-content">
                                <div className="list-item-preview">
                                    {ad.mediaUrl ? (
                                        ad.mediaType === 'video' ? (
                                            <video src={`http://localhost:3001${ad.mediaUrl}`} className="fit-content" />
                                        ) : (
                                            <img src={`http://localhost:3001${ad.mediaUrl}`} alt={ad.name} className="fit-content" />
                                        )
                                    ) : (
                                        <div className="no-media">No Media</div>
                                    )}
                                </div>
                                <div className="list-item-info">
                                    <div className="list-item-header">
                                        <h3>{ad.name}</h3>
                                        <span className={`status-dot ${ad.status}`}></span>
                                    </div>
                                    <p className="ad-id">{ad.id}</p>
                                    <p className="company">Company: {ad.companyName}</p>
                                    <div className="list-metrics">
                                        <span>Duration: <strong>{ad.videoDuration}</strong></span>
                                        <span>Displays: <strong>{ad.numDisplays}</strong></span>
                                        <span>Days Remaining: <strong>{getRemainingDays(ad)}</strong></span>
                                        <span>Price: <strong>₹{ad.finalPrice?.toLocaleString()}</strong></span>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button className="icon-btn view desktop-only" onClick={() => openDetailsModal(ad)} title="View Details">
                                        <FiEye />
                                    </button>
                                    <button className="icon-btn edit desktop-only" onClick={() => openEditModal(ad)} title="Edit">
                                        <FiEdit2 />
                                    </button>
                                    <button className="icon-btn delete desktop-only" onClick={() => handleDelete(ad.id)} title="Delete">
                                        <FiTrash2 />
                                    </button>

                                    <div className="menu-wrapper mobile-only" style={{ position: 'relative' }}>
                                        <button className="icon-btn menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === ad.id ? null : ad.id); }} title="More options">
                                            <FiMoreVertical />
                                        </button>
                                        {openMenu === ad.id && (
                                            <div className="dropdown-menu" style={{ right: 0, top: '100%', zIndex: 1000 }}>
                                                <button onClick={() => { openDetailsModal(ad); setOpenMenu(null); }}>View</button>
                                                <button onClick={() => { openEditModal(ad); setOpenMenu(null); }}>Edit</button>
                                                <button onClick={() => { handleDelete(ad.id); setOpenMenu(null); }}>Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <AdForm
                    ad={currentAd}
                    isEditing={isEditing}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleFormSuccess}
                    user={user}
                />
            )}

            {/* Details Modal */}
            {showDetailsModal && currentAd && (
                <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="modal-content details-view large" onClick={(e) => e.stopPropagation()}>
                        <h2>Ad Details</h2>

                        <div className="details-layout">
                            <div className="details-media vertical-mockup">
                                {currentAd.mediaUrl ? (
                                    currentAd.mediaType === 'video' ? (
                                        <video src={`http://localhost:3001${currentAd.mediaUrl}`} controls className="fit-content" />
                                    ) : (
                                        <img src={`http://localhost:3001${currentAd.mediaUrl}`} alt={currentAd.name} className="fit-content" />
                                    )
                                ) : (
                                    <div className="no-media">No Media</div>
                                )}
                            </div>

                            <div className="details-info">
                                <div className="detail-row">
                                    <strong>ID:</strong> {currentAd.id}
                                </div>
                                <div className="detail-row">
                                    <strong>Campaign:</strong> {currentAd.name}
                                </div>
                                <div className="detail-row">
                                    <strong>Company:</strong> {currentAd.companyName}
                                </div>
                                <div className="detail-row">
                                    <strong>Contact:</strong> {currentAd.contactNo}
                                </div>
                                <div className="detail-row">
                                    <strong>Status:</strong> <span className={`status-badge ${currentAd.status}`}>{currentAd.status}</span>
                                </div>
                                <div className="detail-row">
                                    <strong>Video duration:</strong> {currentAd.videoDuration}
                                </div>
                                <div className="detail-row">
                                    <strong>Start Date:</strong> {new Date(currentAd.startDate).toLocaleDateString()}
                                </div>
                                <div className="detail-row">
                                    <strong>Duration:</strong> {currentAd.weeks} Weeks
                                </div>
                                <div className="detail-row">
                                    <strong>End Date:</strong> {(currentAd.endDate ? new Date(currentAd.endDate) : (() => {
                                        const start = new Date(currentAd.startDate);
                                        const end = new Date(start);
                                        end.setDate(end.getDate() + ((parseInt(currentAd.weeks) || 1) * 7));
                                        return end;
                                    })()).toLocaleDateString()}
                                </div>
                                <div className="detail-row">
                                    <strong>Days Remaining:</strong> {getRemainingDays(currentAd)} Days
                                </div>
                                <div className="detail-row">
                                    <strong>Displays:</strong> {currentAd.numDisplays}
                                </div>
                                <div className="detail-row">
                                    <strong>Final Price:</strong> ₹{currentAd.finalPrice?.toLocaleString()}
                                </div>
                                {currentAd.discount > 0 && (
                                    <div className="detail-row">
                                        <strong>Discount:</strong> -{currentAd.discountPercent}%
                                    </div>
                                )}
                                <div className="detail-row">
                                    <strong>Added by:</strong> {currentAd.createdBy}
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

export default AdManager;
