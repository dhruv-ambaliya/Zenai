import { useState, useEffect } from 'react';
import { api } from '../api';
import './DisplayForm.css';

function DisplayForm({ display, isEditing, onClose, onSuccess, user, isInstaller = false }) {
    const [installers, setInstallers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        gpsCoordinates: '',
        googleMapsLink: '',
        address: '',
        installedDate: new Date().toISOString().split('T')[0],
        installerId: '',
        status: 'active',
        impressions: 100000,
        groupId: ''
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        loadAuxData();
        if (isEditing && display) {
            setFormData({
                gpsCoordinates: display.gpsCoordinates,
                googleMapsLink: display.googleMapsLink,
                address: display.address,
                installedDate: display.installedDate,
                installerId: display.installerId,
                status: display.status,
                impressions: display.impressions || 100000,
                groupId: display.groupId || ''
            });
            if (display.photoUrl) {
                setPhotoPreview(`http://localhost:3001${display.photoUrl}`);
            }
        } else if (isInstaller) {
            // Pre-fill installer ID if installer is adding
            setFormData(prev => ({
                ...prev,
                installerId: user.id
            }));
        }
    }, [isEditing, display, isInstaller, user]);

    const loadAuxData = async () => {
        try {
            const [usersData, groupsData] = await Promise.all([
                api.getUsers(),
                api.getGroups()
            ]);
            setInstallers(usersData.filter(u => u.role === 'installer'));
            setGroups(groupsData);
        } catch (error) {
            console.error('Error loading form data:', error);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate photo is mandatory for new displays
        if (!photoFile && !isEditing) {
            alert('Display photo is required. Please select a photo before submitting.');
            return;
        }

        try {
            setIsSubmitting(true);
            setUploadProgress(10);
            const submitData = new FormData();

            submitData.append('gpsCoordinates', formData.gpsCoordinates);
            submitData.append('googleMapsLink', formData.googleMapsLink);
            submitData.append('address', formData.address);
            submitData.append('installedDate', formData.installedDate);
            submitData.append('installerId', formData.installerId);
            submitData.append('status', formData.status);

            // Installer form should not edit impressions or group
            if (isInstaller) {
                submitData.append('impressions', 100000);
                submitData.append('groupId', '');
            } else {
                submitData.append('impressions', formData.impressions);
                submitData.append('groupId', formData.groupId);
            }

            if (photoFile) {
                submitData.append('photo', photoFile);
            }

            // Get installer name from ID
            const installer = installers.find(i => i.id === formData.installerId);
            submitData.append('installerName', installer ? installer.name : (user.role === 'installer' ? user.name : 'Unknown'));
            submitData.append('createdBy', user.id);

            setUploadProgress(40);
            
            if (isEditing) {
                await api.updateDisplay(display.id, submitData);
            } else {
                await api.addDisplay(submitData);
            }
            
            setUploadProgress(100);

            onSuccess();
        } catch (error) {
            console.error('Error saving display:', error);
            alert('Error saving display');
            setUploadProgress(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Recursive group options renderer
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content display-form-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{isEditing ? 'Edit Display' : 'Add Display'}</h2>
                {isEditing && <div className="display-id-badge">ID: {display?.id}</div>}

                <form onSubmit={handleSubmit} className="display-form">
                    <div className="details-layout">
                        {/* Left: Photo Preview */}
                        <div className="display-preview-panel">
                            <label>Display Photo</label>
                            <div className="photo-preview-container">
                                {photoPreview && (
                                    <div className="photo-preview-box">
                                        <img src={photoPreview} alt="Preview" />
                                    </div>
                                )}
                            </div>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    required={!isEditing}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Right: Form Fields */}
                        <div className="details-info form-inputs">
                            <div className="form-group">
                                <label>GPS Coordinates *</label>
                                <input
                                    type="text"
                                    value={formData.gpsCoordinates}
                                    onChange={(e) => setFormData({ ...formData, gpsCoordinates: e.target.value })}
                                    placeholder="21.1702° N, 72.8311° E"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Google Maps Link</label>
                                <input
                                    type="url"
                                    value={formData.googleMapsLink}
                                    onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                                    placeholder="https://maps.google.com/..."
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Full Address *</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    required
                                    rows="2"
                                />
                            </div>

                            <div className="form-group">
                                <label>Installed Date *</label>
                                <input
                                    type="date"
                                    value={formData.installedDate}
                                    onChange={(e) => setFormData({ ...formData, installedDate: e.target.value })}
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                    disabled={isEditing}
                                />
                                {isEditing && <small>Date locked to preserve ID</small>}
                            </div>

                            <div className="form-group">
                                <label>Installer *</label>
                                {isInstaller ? (
                                    <input type="text" value={user.name} disabled />
                                ) : (
                                    <select
                                        value={formData.installerId}
                                        onChange={(e) => setFormData({ ...formData, installerId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Installer</option>
                                        {installers.map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>


                            {!isInstaller && (
                                <div className="form-group">
                                    <label>Group</label>
                                    <select
                                        value={formData.groupId}
                                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                    >
                                        <option value="">No Group</option>
                                        {renderGroupOptions(groups)}
                                    </select>
                                </div>
                            )}

                            {!isInstaller && (
                                <div className="form-group">
                                    <label>Impressions</label>
                                    <input
                                        type="number"
                                        value={formData.impressions}
                                        onChange={(e) => setFormData({ ...formData, impressions: parseInt(e.target.value) })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add')} Display
                        </button>
                    </div>
                    {isSubmitting && (
                        <div className="saving-progress">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <span className="progress-text">{uploadProgress}% - Saving display...</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default DisplayForm;
