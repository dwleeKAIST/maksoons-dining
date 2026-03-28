import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { apiFetch } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [skipAuth, setSkipAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // SKIP_AUTH probe
      try {
        const probe = await fetch('/api/auth/verify', { method: 'POST' });
        if (cancelled) return;
        if (probe.ok) {
          const data = await probe.json();
          setSkipAuth(true);
          setUser({ email: data.user.email });
          setProfile(data.user);
          setSettings(data.settings);
          setHousehold(data.household || null);
          setLoading(false);
          return;
        }
      } catch {}

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setLoading(true);
          try {
            const token = await firebaseUser.getIdToken(true);
            if (cancelled) return;
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });
            if (cancelled) return;
            if (res.ok) {
              const data = await res.json();
              setProfile(data.user);
              setSettings(data.settings);
              setHousehold(data.household || null);
              setAuthError(null);
            } else if (res.status === 401) {
              await signOut(auth);
              return;
            } else {
              const data = await res.json().catch(() => ({}));
              setAuthError(data.code === 'EMAIL_CONFLICT'
                ? '이미 다른 방법으로 가입된 이메일입니다.'
                : '서버 오류가 발생했습니다.');
              await signOut(auth);
              return;
            }
          } catch (err) {
            console.error('Auth verify failed:', err);
          }
        } else {
          setUser(null);
          setProfile(null);
          setSettings(null);
          setHousehold(null);
        }
        if (!cancelled) setLoading(false);
      });

      cleanupRef = unsubscribe;
    })();

    let cleanupRef = null;
    return () => {
      cancelled = true;
      if (cleanupRef) cleanupRef();
    };
  }, []);

  const logout = async () => {
    if (skipAuth) return;
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setSettings(null);
    setHousehold(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setSettings(data.settings);
        setHousehold(data.household || null);
      }
    } catch {}
  };

  const updateProfile = async (fields) => {
    const res = await apiFetch('/api/auth/me', { method: 'PATCH', body: fields });
    if (res.ok) {
      const data = await res.json();
      setProfile(prev => ({ ...prev, ...data }));
    }
    return res;
  };

  const updateSettings = async (fields) => {
    const res = await apiFetch('/api/auth/settings', { method: 'PATCH', body: fields });
    if (res.ok) {
      try {
        const data = await res.json();
        setSettings(data);
      } catch {
        await refreshProfile();
      }
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{
      user, profile, settings, household, loading, authError,
      logout, refreshProfile, updateProfile, updateSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
