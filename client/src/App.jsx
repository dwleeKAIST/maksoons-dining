import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import TabBar from './components/TabBar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HouseholdSetup from './pages/HouseholdSetup';
import InviteAccept from './pages/InviteAccept';
import Wine from './tabs/Wine';
import Grocery from './tabs/Grocery';
import Settings from './tabs/Settings';

export const PORTAL_NAME = import.meta.env.VITE_PORTAL_NAME || "Maksoon's Dining";

const ALL_TABS = [
  { id: 'wine', label: '와인', icon: '🍷', component: Wine },
  { id: 'grocery', label: '식재료', icon: '🥬', component: Grocery },
  { id: 'settings', label: '설정', icon: '⚙️', component: Settings },
];

function Dashboard() {
  const { profile, logout } = useAuth();

  useEffect(() => { document.title = PORTAL_NAME; }, []);

  const tabs = useMemo(() => ALL_TABS, []);
  const [activeTab, setActiveTab] = useState('wine');

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveComponent = currentTab?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <span className="text-purple-700 font-bold text-lg">{PORTAL_NAME}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{profile?.name || profile?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>
      <TabBar tabs={tabs} activeTab={currentTab?.id} onTabChange={setActiveTab} />
      <main className="p-4 sm:p-6">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, household } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {user ? (
        <>
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/" element={household ? <Dashboard /> : <HouseholdSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
