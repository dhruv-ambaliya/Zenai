import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiMonitor, FiFileText, FiUsers, FiLogOut } from 'react-icons/fi';
import './Navbar.css';

function Navbar({ user, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsOpen(!isOpen);

    const isActive = (path) => {
        if (path === '/admin' && location.pathname === '/admin') return true;
        if (path !== '/admin' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navLinks = user?.role === 'admin' 
        ? [
            { path: '/admin', label: 'Dashboard', icon: <FiHome /> },
            { path: '/admin/displays', label: 'Displays', icon: <FiMonitor /> },
            { path: '/admin/ads', label: 'Ads', icon: <FiFileText /> },
            { path: '/admin/installers', label: 'Installers', icon: <FiUsers /> },
          ]
        : [
            { path: '/installer', label: 'My Displays', icon: <FiMonitor /> },
          ];

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to={user?.role === 'admin' ? '/admin' : '/installer'} className="navbar-brand">
                    <span className="brand-icon">Z</span>
                    <span className="brand-text">Zenai {user?.role === 'admin' ? 'Admin' : 'Installer'}</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-menu desktop-menu">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </div>

                {/* User Info & Logout */}
                <div className="navbar-actions desktop-actions">
                    <span className="user-name">{user?.name}</span>
                    <button onClick={onLogout} className="logout-btn">
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>

                {/* Mobile Hamburger */}
                <button className="hamburger" onClick={toggleMenu}>
                    {isOpen ? <FiX /> : <FiMenu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
                <div className="mobile-user-info">
                    <span>{user?.name}</span>
                    <span className="user-role">{user?.role}</span>
                </div>
                {navLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`mobile-nav-link ${isActive(link.path) ? 'active' : ''}`}
                        onClick={() => setIsOpen(false)}
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </Link>
                ))}
                <button onClick={() => { onLogout(); setIsOpen(false); }} className="mobile-logout-btn">
                    <FiLogOut />
                    <span>Logout</span>
                </button>
            </div>

            {/* Overlay */}
            {isOpen && <div className="menu-overlay" onClick={() => setIsOpen(false)} />}
        </nav>
    );
}

export default Navbar;
