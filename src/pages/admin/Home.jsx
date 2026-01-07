import { useState, useEffect } from 'react';
import { FiMonitor, FiFileText, FiDollarSign, FiEye, FiPlus, FiTrendingUp } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../../api';
import AdForm from '../../components/AdForm';
import DisplayForm from '../../components/DisplayForm';
import PriceCalculator from '../../components/PriceCalculator';
import { useAuth } from '../../context/AuthContext';
import './Home.css';

function Home() {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        totalDisplays: 0,
        totalAds: 0,
        totalRevenue: 0,
        totalAvgActualFootfall: 0
    });

    const [chartFilters, setChartFilters] = useState({
        displays: 'year',
        ads: 'year',
        revenue: 'year',
        avgActualFootfall: 'year'
    });

    const [chartData, setChartData] = useState({
        displays: [],
        ads: [],
        revenue: [],
        avgActualFootfall: []
    });

    const [chartTotals, setChartTotals] = useState({
        displays: { total: 0, last: 0 },
        ads: { total: 0, last: 0 },
        revenue: { total: 0, last: 0 },
        avgActualFootfall: { total: 0, last: 0 }
    });

    const [showModal, setShowModal] = useState(null);
    const [installerForm, setInstallerForm] = useState({
        name: '',
        username: '',
        password: '',
        phone: ''
    });
    const [isInstallerSubmitting, setIsInstallerSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [chartFilters]); // Reload/recalculate when filters change

    const loadData = async () => {
        try {
            const [displays, ads] = await Promise.all([
                api.getDisplays(),
                api.getAds()
            ]);

            const adsWithPrice = ads.map(a => ({ ...a, finalPrice: parseFloat(a.finalPrice) || 0 }));
            const displaysWithFootfall = displays.map(d => ({ ...d, avgActualFootfall: parseInt(d.avgActualFootfall) || 0 }));

            const totalRevenue = adsWithPrice.reduce((sum, ad) => sum + ad.finalPrice, 0);
            const totalAvgActualFootfall = displaysWithFootfall.reduce((sum, d) => sum + d.avgActualFootfall, 0);

            setStats({
                totalDisplays: displays.length,
                totalAds: ads.length,
                totalRevenue,
                totalAvgActualFootfall
            });

            // Generate separated chart data
            const displayData = generateSeriesData(displays, 'installedDate', chartFilters.displays);
            const adData = generateSeriesData(ads, 'createdAt', chartFilters.ads);
            const revenueData = generateSeriesData(adsWithPrice, 'createdAt', chartFilters.revenue, 'finalPrice');
            const footfallData = generateCumulativeSeriesData(displaysWithFootfall, 'installedDate', chartFilters.avgActualFootfall, 'avgActualFootfall');

            setChartData({
                displays: displayData,
                ads: adData,
                revenue: revenueData,
                avgActualFootfall: footfallData
            });

            // Calculate totals and last values for charts
            setChartTotals({
                displays: calculateChartStats(displayData),
                ads: calculateChartStats(adData),
                revenue: calculateChartStats(revenueData),
                avgActualFootfall: calculateChartStats(footfallData)
            });

        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const generateSeriesData = (data, dateField, filter, valueField = null) => {
        const now = new Date();
        const buckets = new Map();
        
        // Helper to get week start (Sunday)
        const getWeekStart = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day;
            return new Date(d.setDate(diff));
        };

        // Helper to format date as YYYY-MM-DD
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toISOString().split('T')[0];
        };

        // Helper to get month key (YYYY-MM)
        const getMonthKey = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        // Determine time range and grouping
        let periods = [];
        
        if (filter === 'week') {
            // Last 7 days (including today)
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = formatDate(d);
                periods.push({
                    key,
                    name: d.toLocaleDateString('en-US', { weekday: 'short' })
                });
                buckets.set(key, 0);
            }
        } else if (filter === 'month') {
            // Last 4 weeks (current week = last week)
            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(getWeekStart(now));
                weekStart.setDate(weekStart.getDate() - (i * 7));
                const key = formatDate(weekStart);
                periods.push({
                    key,
                    name: `Week ${4 - i}`
                });
                buckets.set(key, 0);
            }
        } else if (filter === '6m') {
            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                const key = getMonthKey(d);
                periods.push({
                    key,
                    name: d.toLocaleDateString('en-US', { month: 'short' })
                });
                buckets.set(key, 0);
            }
        } else { // year
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                const key = getMonthKey(d);
                periods.push({
                    key,
                    name: d.toLocaleDateString('en-US', { month: 'short' })
                });
                buckets.set(key, 0);
            }
        }

        // Group data into buckets
        data.forEach(item => {
            const itemDate = new Date(item[dateField]);
            let bucketKey;

            if (filter === 'week') {
                bucketKey = formatDate(itemDate);
            } else if (filter === 'month') {
                const weekStart = getWeekStart(itemDate);
                bucketKey = formatDate(weekStart);
            } else {
                bucketKey = getMonthKey(itemDate);
            }

            if (buckets.has(bucketKey)) {
                if (valueField) {
                    buckets.set(bucketKey, buckets.get(bucketKey) + (item[valueField] || 0));
                } else {
                    buckets.set(bucketKey, buckets.get(bucketKey) + 1);
                }
            }
        });

        // Convert to chart format
        return periods.map(period => ({
            name: period.name,
            value: buckets.get(period.key) || 0
        }));
    };

    const generateCumulativeSeriesData = (data, dateField, filter, valueField) => {
        const now = new Date();
        const buckets = new Map();
        
        // Helper to get week start (Sunday)
        const getWeekStart = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day;
            return new Date(d.setDate(diff));
        };

        // Helper to format date as YYYY-MM-DD
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toISOString().split('T')[0];
        };

        // Helper to get month key (YYYY-MM)
        const getMonthKey = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        // Determine time range and grouping
        let periods = [];
        
        if (filter === 'week') {
            // Last 7 days (including today)
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = formatDate(d);
                periods.push({
                    key,
                    date: new Date(d),
                    name: d.toLocaleDateString('en-US', { weekday: 'short' })
                });
                buckets.set(key, 0);
            }
        } else if (filter === 'month') {
            // Last 4 weeks
            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(getWeekStart(now));
                weekStart.setDate(weekStart.getDate() - (i * 7));
                const key = formatDate(weekStart);
                periods.push({
                    key,
                    date: new Date(weekStart),
                    name: `Week ${4 - i}`
                });
                buckets.set(key, 0);
            }
        } else if (filter === '6m') {
            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                const key = getMonthKey(d);
                periods.push({
                    key,
                    date: new Date(d),
                    name: d.toLocaleDateString('en-US', { month: 'short' })
                });
                buckets.set(key, 0);
            }
        } else { // year
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                const key = getMonthKey(d);
                periods.push({
                    key,
                    date: new Date(d),
                    name: d.toLocaleDateString('en-US', { month: 'short' })
                });
                buckets.set(key, 0);
            }
        }

        // Calculate cumulative footfall for each period
        const result = [];
        let cumulative = 0;

        periods.forEach(period => {
            // Add footfall from all displays that were installed up to this period
            data.forEach(item => {
                const itemDate = new Date(item[dateField]);
                const periodDate = period.date;

                // Check if display was installed before or during this period
                if (itemDate <= periodDate) {
                    const itemDateStr = formatDate(itemDate);
                    let bucketKey;

                    if (filter === 'week') {
                        bucketKey = formatDate(itemDate);
                    } else if (filter === 'month') {
                        const weekStart = getWeekStart(itemDate);
                        bucketKey = formatDate(weekStart);
                    } else {
                        bucketKey = getMonthKey(itemDate);
                    }

                    // Only count if it belongs to current period
                    if (bucketKey === period.key && !buckets.has(`counted-${item.id}-${period.key}`)) {
                        cumulative += item[valueField] || 0;
                        buckets.set(`counted-${item.id}-${period.key}`, true);
                    }
                }
            });

            result.push({
                name: period.name,
                value: cumulative
            });
        });

        return result;
    };

    const calculateChartStats = (data) => {
        if (!data || data.length === 0) return { total: 0, last: 0 };
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const last = data[data.length - 1].value;
        return { total, last };
    };

    const handleFilterChange = (chart, value) => {
        setChartFilters(prev => ({
            ...prev,
            [chart]: value
        }));
    };

    const handleCloseModal = () => {
        setShowModal(null);
        loadData(); // Refresh data after add
    };

    const handleFormSuccess = () => {
        handleCloseModal();
    };

    const openInstallerModal = () => {
        setInstallerForm({ name: '', username: '', password: '', phone: '' });
        setShowModal('installer');
    };

    const handleInstallerSubmit = async (e) => {
        e.preventDefault();
        if (!user || !user.id) {
            alert('User info missing. Please re-login.');
            return;
        }

        try {
            setIsInstallerSubmitting(true);
            await api.addUser({
                ...installerForm,
                role: 'installer',
                createdBy: user.id
            });
            handleFormSuccess();
        } catch (error) {
            console.error('Error saving installer:', error);
            alert(error.message || 'Error saving installer');
        } finally {
            setIsInstallerSubmitting(false);
        }
    };

    const StatCard = ({ icon, title, value, color, suffix = '' }) => (
        <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ background: `${color}20`, color }}>
                {icon}
            </div>
            <div className="stat-info">
                <h3>{title}</h3>
                <p className="stat-value">
                    {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                </p>
            </div>
        </div>
    );

    const ChartWidget = ({ title, data, color, filterKey, filterValue, statsVal }) => (
        <div className="chart-widget">
            <div className="chart-header">
                <div className="header-left">
                    <h3>{title}</h3>
                    <div className="chart-stats">
                        <span className="chart-stat-item">
                            Total: <strong>{statsVal.total.toLocaleString()}</strong>
                        </span>
                        <span className="chart-stat-item">
                            Last: <strong>{statsVal.last.toLocaleString()}</strong>
                        </span>
                    </div>
                </div>
                <select
                    value={filterValue}
                    onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    className="time-filter"
                >
                    <option value="year">Last Year</option>
                    <option value="6m">Last 6 Months</option>
                    <option value="month">Last Month</option>
                    <option value="week">Last Week</option>
                </select>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`grad-${filterKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#999" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill={`url(#grad-${filterKey})`}
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="home-page">
            <div className="page-header">
                <div>
                    <h1>Dashboard Overview</h1>
                    <p className="subtitle">Welcome back, Admin</p>
                </div>
                <div className="quick-actions">
                    <button className="action-btn" onClick={() => setShowModal('display')}>
                        <FiPlus /> Add Display
                    </button>
                    <button className="action-btn" onClick={() => setShowModal('ad')}>
                        <FiPlus /> Add Ad
                    </button>
                    <button className="action-btn" onClick={openInstallerModal}>
                        <FiPlus /> Add Installer
                    </button>
                    <button className="action-btn calculator" onClick={() => setShowModal('calculator')}>
                        <FiDollarSign /> Price Calculator
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={<FiMonitor />}
                    title="Total Displays"
                    value={stats.totalDisplays}
                    color="#3498db"
                />
                <StatCard
                    icon={<FiFileText />}
                    title="Total Ads"
                    value={stats.totalAds}
                    color="#9b59b6"
                />
                <StatCard
                    icon={<FiDollarSign />}
                    title="Total Revenue"
                    value={stats.totalRevenue}
                    color="#2ecc71"
                    suffix=" ₹"
                />
                <StatCard
                    icon={<FiEye />}
                    title="Total Avg Actual Footfall"
                    value={(stats.totalAvgActualFootfall / 100000).toFixed(1)}
                    color="#e74c3c"
                    suffix=" L"
                />
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                <ChartWidget
                    title="Displays Added"
                    data={chartData.displays}
                    color="#3498db"
                    filterKey="displays"
                    filterValue={chartFilters.displays}
                    statsVal={chartTotals.displays}
                />
                <ChartWidget
                    title="Ads Created"
                    data={chartData.ads}
                    color="#9b59b6"
                    filterKey="ads"
                    filterValue={chartFilters.ads}
                    statsVal={chartTotals.ads}
                />
                <ChartWidget
                    title="Revenue Trend"
                    data={chartData.revenue}
                    color="#2ecc71"
                    filterKey="revenue"
                    filterValue={chartFilters.revenue}
                    statsVal={chartTotals.revenue}
                />
                <ChartWidget
                    title="Avg Actual Footfall Trend"
                    data={chartData.avgActualFootfall}
                    color="#e74c3c"
                    filterKey="avgActualFootfall"
                    filterValue={chartFilters.avgActualFootfall}
                    statsVal={chartTotals.avgActualFootfall}
                />
            </div>

            {/* Modals */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {showModal === 'display' && 'Add New Display'}
                                {showModal === 'ad' && 'Create New Campaign'}
                                {showModal === 'calculator' && 'Price Calculator'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowModal(null)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            {showModal === 'display' && (
                                <DisplayForm
                                    onClose={handleCloseModal}
                                    onSuccess={handleFormSuccess}
                                    user={user}
                                    installerMode={false}
                                />
                            )}
                            {showModal === 'ad' && (
                                <AdForm
                                    onClose={handleCloseModal}
                                    onSuccess={handleFormSuccess}
                                    user={user}
                                />
                            )}
                            {showModal === 'installer' && (
                                <form className="installer-form" onSubmit={handleInstallerSubmit}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Name *</label>
                                            <input
                                                type="text"
                                                value={installerForm.name}
                                                onChange={(e) => setInstallerForm({ ...installerForm, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Username *</label>
                                            <input
                                                type="text"
                                                value={installerForm.username}
                                                onChange={(e) => setInstallerForm({ ...installerForm, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Password *</label>
                                            <input
                                                type="password"
                                                value={installerForm.password}
                                                onChange={(e) => setInstallerForm({ ...installerForm, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Phone *</label>
                                            <input
                                                type="tel"
                                                value={installerForm.phone}
                                                onChange={(e) => setInstallerForm({ ...installerForm, phone: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="btn-secondary" onClick={() => setShowModal(null)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary" disabled={isInstallerSubmitting}>
                                            {isInstallerSubmitting ? 'Saving...' : 'Add Installer'}
                                        </button>
                                    </div>
                                </form>
                            )}
                            {showModal === 'calculator' && (
                                <PriceCalculator
                                    onClose={() => setShowModal(null)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;
