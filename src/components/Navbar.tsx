import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, Share2, Clock, AlertTriangle } from 'lucide-react';
import { useShadow } from '../store/shadowStore';

export default function Navbar() {
    const { state } = useShadow();
    const analyzed = state.isAnalyzed;

    return (
        <nav className="navbar">
            <NavLink to="/" className="navbar-brand">
                <div className="brand-icon">
                    <Shield size={20} color="white" />
                </div>
                <div>
                    <h1>MyShadow</h1>
                    <span>Privacy Audit Tool</span>
                </div>
            </NavLink>

            {analyzed && (
                <div className="navbar-links">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                        <LayoutDashboard size={15} />
                        Dashboard
                    </NavLink>
                </div>
            )}
        </nav>
    );
}
