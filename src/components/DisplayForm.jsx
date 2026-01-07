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
        groupId: '',
        propertyType: 'commercial',
        propertyName: '',
        numberOfShops: '',
        avgActualFootfall: '',
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFiles, setPhotoFiles] = useState([]); // Multiple photos
    const [photoPreviews, setPhotoPreviews] = useState([]); // Multiple previews
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0); // Gallery navigation

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
                groupId: display.groupId || '',
                propertyType: display.propertyType || 'commercial',
                propertyName: display.propertyName || '',
                numberOfShops: display.numberOfShops || '',
                avgActualFootfall: display.avgActualFootfall || ''
            });
            // Load existing photos for gallery
            if (display.photos && Array.isArray(display.photos)) {
                const previews = display.photos.map(photo => `http://localhost:3001${photo}`);
                setPhotoPreviews(previews);
            } else if (display.photoUrl) {
                // Fallback for single photo
                setPhotoPreviews([`http://localhost:3001${display.photoUrl}`]);
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
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setPhotoFiles(files);
            const newPreviews = [];
            let loadedCount = 0;

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result);
                    loadedCount++;
                    if (loadedCount === files.length) {
                        setPhotoPreviews(newPreviews);
                        setCurrentPhotoIndex(0);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate photos are mandatory for new displays
        if (photoFiles.length === 0 && !isEditing && photoPreviews.length === 0) {
            alert('At least one display photo is required. Please select photos before submitting.');
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

            // Calculate and append property data
            submitData.append('propertyType', formData.propertyType);
            if (formData.propertyType === 'commercial') {
                submitData.append('propertyName', formData.propertyName);
                submitData.append('numberOfShops', formData.numberOfShops);
                // Calculate Avg Actual Footfall
                const avgActualFootfall = calculateAvgActualFootfall(formData.numberOfShops);
                submitData.append('avgActualFootfall', avgActualFootfall);
            } else {
                submitData.append('avgActualFootfall', '0'); // Default for non-commercial
            }

            // Group can only be set by admin
            if (!isInstaller) {
                submitData.append('groupId', formData.groupId);
            } else {
                submitData.append('groupId', '');
            }

            // Add multiple photos
            if (photoFiles.length > 0) {
                photoFiles.forEach((file) => {
                    submitData.append('photos', file);
                });
            }

            // Get installer name from ID
            const installer = installers.find(i => i.id === formData.installerId);
            submitData.append('installerName', installer ? installer.name : (user.role === 'installer' ? user.name : 'Unknown'));
            submitData.append('createdBy', user.id);

            setUploadProgress(40);
            
            let response;
            if (isEditing) {
                response = await api.updateDisplay(display.id, submitData);
            } else {
                response = await api.addDisplay(submitData);
            }
            
            console.log('Server response:', response);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to save display');
            }
            
            setUploadProgress(100);

            onSuccess();
        } catch (error) {
            console.error('Error saving display:', error);
            alert('Error saving display: ' + error.message);
            setUploadProgress(0);
        } finally {
            setIsSubmitting(false);
        }
    };
    // Calculate Avg Actual Footfall based on formula
    const calculateAvgActualFootfall = (numShops) => {
        const shops = parseFloat(numShops) || 0;
        if (shops === 0) return 0;

        // Step 1: Repetitive footfall = Num of shops * 2.28
        const repetitiveFootfall = shops * 2.28;

        // Step 2: Number of local SMEs = Num of shops * 0.75
        const numberOfLocalSMEs = shops * 0.75;

        // Step 3: Expected new footfall = Repetitive footfall + 0
        const expectedNewFootfall = repetitiveFootfall + 0;

        // Step 4: Total min footfall = Number of local SMEs + Expected new footfall
        const totalMinFootfall = numberOfLocalSMEs + expectedNewFootfall;

        // Step 5: Total maximum footfall = Total min footfall * 2
        const totalMaximumFootfall = totalMinFootfall * 2;

        // Step 6: Avg actual footfall = Average of all four values
        const avgActualFootfall = (repetitiveFootfall + expectedNewFootfall + totalMinFootfall + totalMaximumFootfall) / 4;

        return Math.round(avgActualFootfall);
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
                                {photoPreviews.length > 0 ? (
                                    <div className="photo-gallery">
                                        <div className="photo-preview-box">
                                            <img src={photoPreviews[currentPhotoIndex]} alt={`Preview ${currentPhotoIndex + 1}`} />
                                        </div>
                                        {photoPreviews.length > 1 && (
                                            <div className="gallery-nav">
                                                <button 
                                                    type="button"
                                                    onClick={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : photoPreviews.length - 1)}
                                                    className="nav-btn prev"
                                                >
                                                    ← Prev
                                                </button>
                                                <span className="photo-counter">{currentPhotoIndex + 1} / {photoPreviews.length}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setCurrentPhotoIndex(prev => prev < photoPreviews.length - 1 ? prev + 1 : 0)}
                                                    className="nav-btn next"
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        )}
                                        <div className="thumbnail-strip">
                                            {photoPreviews.map((preview, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={preview} 
                                                    alt={`Thumb ${idx + 1}`}
                                                    className={`thumbnail ${idx === currentPhotoIndex ? 'active' : ''}`}
                                                    onClick={() => setCurrentPhotoIndex(idx)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="photo-preview-box empty">
                                        <p>No photos selected</p>
                                    </div>
                                )}
                            </div>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoChange}
                                    required={!isEditing && photoPreviews.length === 0}
                                    disabled={isSubmitting}
                                />
                                <small>Select one or more images (up to 10)</small>
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

                            <div className="form-group">
                                <label>Property Type *</label>
                                <select
                                    value={formData.propertyType}
                                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value, propertyName: '', numberOfShops: '' })}
                                    required
                                >
                                    <option value="commercial">Commercial</option>
                                    <option value="public">Public (Coming Soon)</option>
                                    <option value="residential">Residential (Coming Soon)</option>
                                </select>
                            </div>

                            {formData.propertyType === 'commercial' && (
                                <>
                                    <div className="form-group">
                                        <label>Property Name *</label>
                                        <input
                                            type="text"
                                            value={formData.propertyName}
                                            onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                                            placeholder="Enter property name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Number of Shops *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.numberOfShops}
                                            onChange={(e) => setFormData({ ...formData, numberOfShops: e.target.value })}
                                            placeholder="Enter number of shops"
                                            required
                                        />
                                    </div>

                                    {formData.numberOfShops && (
                                        <div className="form-group footfall-display">
                                            <label>Avg Actual Footfall (Calculated)</label>
                                            <div className="footfall-value">
                                                {calculateAvgActualFootfall(formData.numberOfShops).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {(formData.propertyType === 'public' || formData.propertyType === 'residential') && (
                                <div className="form-group coming-soon-notice">
                                    <p>🚧 Coming Soon</p>
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
