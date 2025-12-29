import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import './InstallerManager.css';

function InstallerManager() {
    const { user } = useAuth();
    const [installers, setInstallers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentInstaller, setCurrentInstaller] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        phone: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const users = await api.getUsers();
            setInstallers(users.filter(u => u.role === 'installer'));
        } catch (error) {
            console.error('Error loading installers:', error);
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: '', username: '', password: '', phone: '' });
        setShowModal(true);
    };

    const openEditModal = (installer) => {
        setIsEditing(true);
        setCurrentInstaller(installer);
        setFormData({
            name: installer.name,
            username: installer.username,
            password: installer.password,
            phone: installer.phone
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const submitData = {
                ...formData,
                role: 'installer',
                createdBy: user.id
            };

            if (isEditing) {
                await api.updateUser(currentInstaller.id, submitData);
            } else {
                await api.addUser(submitData);
            }

            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Error saving installer:', error);
            alert(error.message || 'Error saving installer');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this installer?')) {
            try {
                await api.deleteUser(id);
                loadData();
            } catch (error) {
                console.error('Error deleting installer:', error);
            }
        }
    };

    return (
        <div className="installer-manager">
            <div className="panel-header">
                <h2>Installer Management</h2>
                <button className="btn-primary" onClick={openAddModal}>
                    <FiPlus /> Add Installer
                </button>
            </div>

            <div className="installers-grid">
                {installers.map(installer => (
                    <div key={installer.id} className="installer-card">
                        <div className="card-header">
                            <div className="installer-avatar">
                                {installer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="installer-info">
                                <h3>{installer.name}</h3>
                                <p className="installer-id">{installer.id}</p>
                            </div>
                        </div>

                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Username:</span>
                                <span>{installer.username}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Phone:</span>
                                <span>{installer.phone}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Created:</span>
                                <span>{new Date(installer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="card-actions">
                            <button className="icon-btn edit" onClick={() => openEditModal(installer)}>
                                <FiEdit2 /> Edit
                            </button>
                            <button className="icon-btn delete" onClick={() => handleDelete(installer.id)}>
                                <FiTrash2 /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{isEditing ? 'Edit Installer' : 'Add Installer'}</h2>
                        {isEditing && <p className="installer-id-label">ID: {currentInstaller?.id}</p>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Username *</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {isEditing ? 'Update' : 'Add'} Installer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstallerManager;
