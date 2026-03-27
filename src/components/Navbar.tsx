import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
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
                    <h1>DataShadow</h1>
                    <span>Privacy Audit Tool</span>
                </div>
            </NavLink>

            {analyzed && (
                <div className="navbar-links">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                        Dashboard
                    </NavLink>
                </div>
            )}
        </nav>
    );
}
