/**
 * Sasl - Social Asynchronous Sharing Layer
 * Main application layout with splash screen and routing.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import Feed from './components/Feed';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Marketplace from './components/Marketplace';
import Streaming from './components/Streaming';
import Tutoring from './components/Tutoring';
import Wallet from './components/Wallet';
import Onboarding from './components/Onboarding';
import Reels from './components/Reels';
import GigCentral from './components/GigCentral';
import WebRTCChat from './components/WebRTCChat';
import SnapSender from './components/SnapSender';
import ProgressHub from './components/ProgressHub';
import EarningsDashboard from './components/EarningsDashboard';
import Analytics from './components/Analytics';
import ARFilters from './components/ARFilters';
import LiveAudio from './components/LiveAudio';
import GroupChat from './components/GroupChat';
import Events from './components/Events';
import QRProfile from './components/QRProfile';
import OfflineMeshStatus from './components/OfflineMeshStatus';
import OfflineIndicator from './components/OfflineIndicator';
import SyncProgress from './components/SyncProgress';
import ErrorBoundary from './components/ErrorBoundary';
import SaslAIHub from './components/SaslAIHub';
import AdvertisePage from './components/AdvertisePage';
import { globalMesh } from './services/globalMesh';

// ✅ FIXED: Added loading check
function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('sasl_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}


function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 z-50 border">
      <p className="font-semibold mb-2">Install Sasl App</p>
      <p className="text-sm text-gray-500 mb-3">Add to home screen for the best experience!</p>
      <button onClick={handleInstall} className="btn-primary w-full">Install</button>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  // 🌍 Start Global Mesh Network
  useEffect(() => {
    globalMesh.start();
    
    const interval = setInterval(() => {
      const stats = globalMesh.getStats();
      console.log('🌍 Mesh Stats:', stats);
      console.log(`📡 Estimated Range: ${globalMesh.getEstimatedRange().toFixed(1)}km`);
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!splashDone) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // ✅ FIXED: Show nothing while checking auth
  if (loading) return null;

  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <SyncProgress />
      <InstallPrompt />
      <OfflineMeshStatus />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/profile/:username?" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
          <Route path="/streaming" element={<PrivateRoute><Streaming /></PrivateRoute>} />
          <Route path="/tutoring" element={<PrivateRoute><Tutoring /></PrivateRoute>} />
          <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
          <Route path="/reels" element={<PrivateRoute><Reels /></PrivateRoute>} />
          <Route path="/snap" element={<PrivateRoute><SnapSender /></PrivateRoute>} />
          <Route path="/progress" element={<PrivateRoute><ProgressHub /></PrivateRoute>} />
          <Route path="/gigs" element={<PrivateRoute><GigCentral /></PrivateRoute>} />
          <Route path="/meshchat" element={<PrivateRoute><WebRTCChat /></PrivateRoute>} />
          <Route path="/earnings" element={<PrivateRoute><EarningsDashboard /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/ar-filters" element={<PrivateRoute><ARFilters /></PrivateRoute>} />
          <Route path="/live-audio" element={<PrivateRoute><LiveAudio /></PrivateRoute>} />
          <Route path="/ai-hub" element={<PrivateRoute><SaslAIHub /></PrivateRoute>} />
          <Route path="/group-chat" element={<PrivateRoute><GroupChat /></PrivateRoute>} />
          <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
          <Route path="/qr-profile" element={<PrivateRoute><QRProfile username={user?.username || ''} /></PrivateRoute>} />
          <Route path="/advertise" element={<AdvertisePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}