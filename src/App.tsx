import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShadowProvider } from './store/shadowStore';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    return (
        <ShadowProvider>
            <BrowserRouter>
                <ErrorBoundary fallbackMessage="DataShadow encountered an error. Your data remains safe — all processing is local.">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                    </Routes>
                </ErrorBoundary>
            </BrowserRouter>
        </ShadowProvider>
    );
}

export default App;
