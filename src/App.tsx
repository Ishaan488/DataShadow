import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShadowProvider } from './store/shadowStore';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    return (
        <ShadowProvider>
            <BrowserRouter>
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </BrowserRouter>
        </ShadowProvider>
    );
}

export default App;
