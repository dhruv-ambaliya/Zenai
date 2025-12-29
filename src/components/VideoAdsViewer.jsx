import { useState, useEffect } from 'react';
import { fetchVideoAds, fetchVideoAdById } from '../services/adsApi';
import './VideoAdsViewer.css';

const VideoAdsViewer = () => {
    const [videoAds, setVideoAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAd, setSelectedAd] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // Fetch video ads on component mount
    useEffect(() => {
        loadVideoAds();
    }, []);

    const loadVideoAds = async () => {
        setLoading(true);
        setError(null);

        const response = await fetchVideoAds();

        if (response.success) {
            setVideoAds(response.data);
            setLastFetchTime(response.timestamp);
        } else {
            setError(response.error);
        }

        setLoading(false);
    };

    const handleViewDetails = async (adId) => {
        const response = await fetchVideoAdById(adId);

        if (response.success) {
            setSelectedAd(response.data);
        } else {
            alert(`Error: ${response.error}`);
        }
    };

    const handleRefresh = () => {
        loadVideoAds();
    };

    if (loading) {
        return (
            <div className="video-ads-viewer">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading video ads...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="video-ads-viewer">
                <div className="error-message">
                    <h3>⚠️ Error Loading Ads</h3>
                    <p>{error}</p>
                    <button onClick={handleRefresh} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="video-ads-viewer">
            <div className="viewer-header">
                <h2>📹 Video Ads Library</h2>
                <div className="header-actions">
                    <span className="last-updated">
                        Last updated: {lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'N/A'}
                    </span>
                    <button onClick={handleRefresh} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="video-ads-grid">
                {videoAds.map((ad) => (
                    <div key={ad.id} className="video-ad-card">
                        <div className="video-container">
                            <video
                                controls
                                preload="metadata"
                                className="video-player"
                            >
                                <source src={ad.videoUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <div className="video-overlay">
                                <span className="duration-badge">{ad.duration}</span>
                                <span className="resolution-badge">{ad.resolution}</span>
                            </div>
                        </div>

                        <div className="ad-info">
                            <h3>{ad.name}</h3>
                            <p className="ad-id">ID: {ad.id}</p>

                            <div className="ad-stats">
                                <div className="stat">
                                    <span className="stat-label">Impressions</span>
                                    <span className="stat-value">{ad.impressions.toLocaleString()}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Clicks</span>
                                    <span className="stat-value">{ad.clicks.toLocaleString()}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">CTR</span>
                                    <span className="stat-value">{ad.ctr}%</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Budget</span>
                                    <span className="stat-value">${ad.budget.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="ad-meta">
                                <span className={`platform-tag ${ad.platform}`}>
                                    {ad.platform}
                                </span>
                                <span className={`status-tag ${ad.status}`}>
                                    {ad.status}
                                </span>
                            </div>

                            <button
                                onClick={() => handleViewDetails(ad.id)}
                                className="view-details-btn"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {selectedAd && (
                <div className="modal-overlay" onClick={() => setSelectedAd(null)}>
                    <div className="modal-content video-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedAd(null)}>×</button>

                        <h2>{selectedAd.name}</h2>

                        <div className="detail-video-container">
                            <video
                                controls
                                autoPlay
                                className="detail-video-player"
                            >
                                <source src={selectedAd.videoUrl} type="video/mp4" />
                            </video>
                        </div>

                        <div className="detail-info">
                            <div className="detail-row">
                                <strong>Ad ID:</strong> {selectedAd.id}
                            </div>
                            <div className="detail-row">
                                <strong>Duration:</strong> {selectedAd.duration}
                            </div>
                            <div className="detail-row">
                                <strong>Format:</strong> {selectedAd.format}
                            </div>
                            <div className="detail-row">
                                <strong>Resolution:</strong> {selectedAd.resolution}
                            </div>
                            <div className="detail-row">
                                <strong>Platform:</strong> {selectedAd.platform}
                            </div>
                            <div className="detail-row">
                                <strong>Status:</strong> {selectedAd.status}
                            </div>
                            <div className="detail-row">
                                <strong>Impressions:</strong> {selectedAd.impressions.toLocaleString()}
                            </div>
                            <div className="detail-row">
                                <strong>Clicks:</strong> {selectedAd.clicks.toLocaleString()}
                            </div>
                            <div className="detail-row">
                                <strong>CTR:</strong> {selectedAd.ctr}%
                            </div>
                            <div className="detail-row">
                                <strong>Budget:</strong> ${selectedAd.budget.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoAdsViewer;
