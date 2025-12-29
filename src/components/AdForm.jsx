import { useState, useEffect } from 'react';
import { FiDollarSign } from 'react-icons/fi';
import { api } from '../api';
import './AdForm.css';

function AdForm({ ad, isEditing, onClose, onSuccess, user }) {
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        contactNo: '',
        videoDuration: '5s',
        startDate: new Date().toISOString().split('T')[0],
        weeks: 1,
        numDisplays: 1,
        customPrice: null
    });

    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [priceCalculation, setPriceCalculation] = useState({
        calculatedPrice: 0,
        finalPrice: 0,
        discount: 0,
        discountPercent: 0
    });

    const [dateInfo, setDateInfo] = useState({
        endDate: '',
        remainingDays: 0
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (isEditing && ad) {
            setFormData({
                name: ad.name,
                companyName: ad.companyName,
                contactNo: ad.contactNo,
                videoDuration: ad.videoDuration,
                startDate: ad.startDate,
                weeks: ad.weeks,
                numDisplays: ad.numDisplays,
                customPrice: ad.customPrice
            });

            const infoFromAd = getDateInfo(ad.startDate, ad.weeks);
            setDateInfo({
                endDate: ad.endDate || infoFromAd.endDate,
                remainingDays: ad.remainingDays !== undefined ? ad.remainingDays : infoFromAd.remainingDays
            });

            if (ad.mediaUrl) {
                setMediaPreview(`http://localhost:3001${ad.mediaUrl}`);
                setMediaType(ad.mediaType);
            }
        }
    }, [isEditing, ad]);

    useEffect(() => {
        calculatePrice();
        calculateEndDateAndDays();
    }, [formData.weeks, formData.numDisplays, formData.videoDuration, formData.customPrice, formData.startDate]);

    const calculatePrice = () => {
        const baseRate = 5000;
        const weeks = parseInt(formData.weeks) || 1;
        const numDisplays = parseInt(formData.numDisplays) || 1;
        const multiplier = formData.videoDuration === '10s' ? 1.5 : 1;
        const calculatedPrice = baseRate * weeks * numDisplays * multiplier;

        const customPrice = formData.customPrice ? parseFloat(formData.customPrice) : null;
        const finalPrice = customPrice !== null ? customPrice : calculatedPrice;
        const discount = customPrice !== null ? calculatedPrice - customPrice : 0;
        const discountPercent = customPrice !== null ? ((discount / calculatedPrice) * 100).toFixed(2) : 0;

        setPriceCalculation({
            calculatedPrice,
            finalPrice,
            discount,
            discountPercent
        });
    };

    const getDateInfo = (startDateValue, weeksValue) => {
        if (!startDateValue) {
            return { endDate: '', remainingDays: 0 };
        }

        const startDate = new Date(startDateValue);
        const endDate = new Date(startDate);
        const weeks = parseInt(weeksValue) || 1;
        endDate.setDate(endDate.getDate() + (weeks * 7));

        // Remaining days should reflect full campaign duration (start to end), not time elapsed since today
        const diffTime = endDate - startDate;
        const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            endDate: endDate.toISOString().split('T')[0],
            remainingDays: remainingDays > 0 ? remainingDays : 0
        };
    };

    const calculateEndDateAndDays = () => {
        const info = getDateInfo(formData.startDate, formData.weeks);
        setDateInfo(info);
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setFormData({ ...formData, contactNo: value });
        }
    };

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        setMediaType(fileType);
        setMediaFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaPreview(reader.result);
        };
        reader.readAsDataURL(file);

        if (fileType === 'video') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                const duration = video.duration;

                if (duration < 5 || duration > 10) {
                    alert(`Video must be between 5-10 seconds. Current: ${duration.toFixed(1)}s`);
                    setMediaFile(null);
                    setMediaPreview(null);
                    return;
                }

                const tier = duration <= 5 ? '5s' : '10s';
                setFormData(prev => ({ ...prev, videoDuration: tier }));
            };
            video.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!mediaFile && !isEditing && !mediaPreview) {
            alert('Please select a video or image');
            return;
        }

        try {
            setIsSubmitting(true);
            setUploadProgress(10);
            const submitData = new FormData();

            // Explicitly append fields, handling generic types
            submitData.append('name', formData.name);
            submitData.append('companyName', formData.companyName);
            submitData.append('contactNo', formData.contactNo);
            submitData.append('videoDuration', formData.videoDuration);
            submitData.append('startDate', formData.startDate);
            submitData.append('weeks', formData.weeks);
            submitData.append('numDisplays', formData.numDisplays);

            if (formData.customPrice !== null) {
                submitData.append('customPrice', formData.customPrice);
            }

            if (mediaFile) {
                submitData.append('media', mediaFile);
            }

            submitData.append('createdBy', user.id);

            setUploadProgress(40);

            if (isEditing) {
                await api.updateAd(ad.id, submitData);
            } else {
                await api.addAd(submitData);
            }
            
            setUploadProgress(100);

            onSuccess();
        } catch (error) {
            console.error('Error saving ad:', error);
            alert(error.message || 'Error saving ad');
            setUploadProgress(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                <h2>{isEditing ? 'Edit Ad' : 'Add Ad'}</h2>
                {isEditing && <p className="ad-id-label">ID: {ad?.id}</p>}

                <form onSubmit={handleSubmit} className="ad-form">
                    <div className="details-layout">
                        {/* Left: Preview */}
                        <div className="ad-preview-panel">
                            <label>Vertical Display Preview</label>
                            <div className="vertical-display-mockup">
                                {mediaPreview ? (
                                    mediaType === 'video' ? (
                                        <video
                                            src={mediaPreview}
                                            controls
                                            autoPlay
                                            loop
                                            muted
                                            className="preview-content fit-mode"
                                            disabled={isSubmitting}
                                        />
                                    ) : (
                                        <img
                                            src={mediaPreview}
                                            alt="Preview"
                                            className="preview-content fit-mode"
                                        />
                                    )
                                ) : (
                                    <div className="upload-placeholder">
                                        <p>Select Media to Preview</p>
                                        <input hidden
                                            type="file"
                                            accept="video/*,image/*"
                                            onChange={handleMediaChange}
                                            id="media-upload"
                                        />
                                        <label htmlFor="media-upload" className="upload-btn-label">Choose File</label>
                                    </div>
                                )}
                            </div>
                            {mediaPreview && (
                                <div className="change-media-wrapper">
                                    <input
                                        type="file"
                                        accept="video/*,image/*"
                                        onChange={handleMediaChange}
                                        id="media-change"
                                        className="hidden-input"
                                    />
                                    <label htmlFor="media-change" className="text-btn">Change Media</label>
                                </div>
                            )}
                        </div>

                        {/* Right: Form Fields */}
                        <div className="details-info form-inputs">
                            <div className="form-group">
                                <label>Campaign Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Contact Number *</label>
                                <input
                                    type="tel"
                                    value={formData.contactNo}
                                    onChange={handlePhoneChange}
                                    placeholder="Numbers only"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duration (Weeks) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.weeks}
                                        onChange={(e) => setFormData({ ...formData, weeks: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={dateInfo.endDate}
                                        readOnly
                                        disabled
                                        className="readonly-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Days Remaining</label>
                                    <input
                                        type="text"
                                        value={dateInfo.remainingDays}
                                        readOnly
                                        disabled
                                        className="readonly-input"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Num Displays *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.numDisplays}
                                        onChange={(e) => setFormData({ ...formData, numDisplays: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Video Duration</label>
                                    <select
                                        value={formData.videoDuration}
                                        onChange={(e) => setFormData({ ...formData, videoDuration: e.target.value })}
                                        disabled={mediaType === 'video'}
                                    >
                                        <option value="5s">5s</option>
                                        <option value="10s">10s</option>
                                    </select>
                                </div>
                            </div>

                            <div className="price-display">
                                <div className="price-row">
                                    <span>Calculated:</span>
                                    <span className={formData.customPrice ? 'strikethrough' : ''}>
                                        ₹{priceCalculation.calculatedPrice.toLocaleString()}
                                    </span>
                                </div>
                                {formData.customPrice && (
                                    <div className="price-row discount">
                                        <span>Discount:</span>
                                        <span>{priceCalculation.discountPercent}%</span>
                                    </div>
                                )}
                                <div className="price-row final">
                                    <span>Final Price:</span>
                                    <span>₹{priceCalculation.finalPrice.toLocaleString()}</span>
                                </div>

                                <button
                                    type="button"
                                    className="custom-price-btn"
                                    onClick={() => {
                                        const custom = prompt('Enter custom price:', priceCalculation.calculatedPrice);
                                        if (custom && !isNaN(custom)) {
                                            setFormData({ ...formData, customPrice: parseFloat(custom) });
                                        } else if (custom === '') {
                                            setFormData({ ...formData, customPrice: null });
                                        }
                                    }}
                                >
                                    <FiDollarSign /> Set Custom Price
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
                        </button>
                    </div>
                    {isSubmitting && (
                        <div className="saving-progress">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <span className="progress-text">{uploadProgress}% - Saving ad campaign...</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default AdForm;
