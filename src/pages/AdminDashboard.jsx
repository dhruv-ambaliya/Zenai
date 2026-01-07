import { Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Home from './admin/Home';
import DisplayManager from './admin/DisplayManager';
import AdManager from './admin/AdManager';
import InstallerManager from './admin/InstallerManager';
import SlotMonitor from './admin/SlotMonitor';
import './AdminDashboard.css';

function AdminDashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="admin-dashboard">
            <Navbar user={user} onLogout={logout} />

            <main className="dashboard-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="displays" element={<DisplayManager />} />
                    <Route path="ads" element={<AdManager />} />
                    <Route path="installers" element={<InstallerManager />} />
                    <Route path="slots" element={<SlotMonitor />} />
                </Routes>
            </main>
        </div>
    );
}

export default AdminDashboard;
