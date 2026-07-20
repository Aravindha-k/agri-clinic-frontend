import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loginUser, refreshToken, getCurrentUser, logout as logoutAPI } from '../api/auth.api';
import { unwrapSuccessEnvelope } from '../utils/apiUnwrap';
import { loginAuthErrorMessage } from '../utils/authErrors';

const AuthContext = createContext();

const getApiErrorMessage = (err, fallback = 'Login failed') => {
    const data = err?.response?.data;
    if (typeof data === 'string') return data;
    return (
        data?.detail ||
        data?.message ||
        data?.error?.message ||
        data?.errors?.detail ||
        err?.message ||
        fallback
    );
};

function normalizeUserProfile(body) {
    const user = body?.user ?? body?.employee ?? body ?? null;
    if (!user || typeof user !== 'object') return null;
    return user;
}

/** Admin panel access — block known field-employee roles; allow staff/admin. */
export function isAdminUser(user) {
    if (!user || typeof user !== 'object') return false;
    if (user.is_superuser === true || user.is_staff === true || user.is_admin === true) return true;

    const role = String(user.role ?? user.user_role ?? user.account_type ?? '').toLowerCase();
    if (role === 'admin' || role === 'administrator' || role === 'staff') return true;

    const employeeRoles = new Set([
        'employee',
        'field_officer',
        'field-officer',
        'field',
        'officer',
        'agent',
        'mobile',
    ]);
    if (employeeRoles.has(role)) return false;

    if (user.is_staff === false && user.is_superuser === false && user.is_admin === false) {
        return false;
    }

    // Profile without explicit role flags — allow; backend enforces admin APIs.
    return true;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [refreshTokenValue, setRefreshTokenValue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const logoutInFlightRef = useRef(null);
    const refreshTokenRef = useRef(null);
    const clearSessionRef = useRef(() => {});

    const clearSession = useCallback(() => {
        setToken(null);
        setRefreshTokenValue(null);
        setUser(null);
        setError(null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
    }, []);

    useEffect(() => {
        refreshTokenRef.current = refreshTokenValue;
    }, [refreshTokenValue]);

    useEffect(() => {
        clearSessionRef.current = clearSession;
    }, [clearSession]);

    const logout = useCallback(async () => {
        if (logoutInFlightRef.current) {
            return logoutInFlightRef.current;
        }

        logoutInFlightRef.current = (async () => {
            try {
                const currentRefresh = refreshTokenRef.current;
                if (currentRefresh) {
                    await logoutAPI(currentRefresh);
                }
            } catch (err) {
                console.error('Logout API error:', err);
            } finally {
                clearSessionRef.current();
                logoutInFlightRef.current = null;
            }
        })();

        return logoutInFlightRef.current;
    }, []);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const response = await getCurrentUser();
            const body = unwrapSuccessEnvelope(response) ?? response.data;
            const profile = normalizeUserProfile(body);
            if (!profile) {
                throw new Error('Empty profile');
            }
            if (!isAdminUser(profile)) {
                clearSession();
                setError('This account does not have admin panel access.');
                return null;
            }
            setUser(profile);
            setError(null);
            return profile;
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                clearSession();
            } else {
                console.error('Failed to fetch user:', err);
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [clearSession]);

    useEffect(() => {
        const storedToken = localStorage.getItem('access');
        const storedRefreshToken = localStorage.getItem('refresh');

        if (storedToken && storedRefreshToken) {
            setToken(storedToken);
            setRefreshTokenValue(storedRefreshToken);
            fetchCurrentUser();
        } else {
            setLoading(false);
        }
    }, [fetchCurrentUser]);

    const login = useCallback(async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await loginUser({ username, password });
            const body = unwrapSuccessEnvelope(response) ?? response.data;
            const access = body?.access ?? body?.access_token;
            const refresh = body?.refresh ?? body?.refresh_token;
            if (!access || !refresh) {
              throw new Error('Login response missing access token');
            }

            const loginUserObj = normalizeUserProfile(body);
            if (loginUserObj && !isAdminUser(loginUserObj)) {
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                const msg = 'This account does not have admin panel access.';
                setError(msg);
                throw new Error(msg);
            }

            setToken(access);
            setRefreshTokenValue(refresh);
            localStorage.setItem('access', access);
            localStorage.setItem('refresh', refresh);

            const profile = await fetchCurrentUser();
            if (!profile) {
                const accessStillThere = localStorage.getItem('access');
                if (!accessStillThere) {
                    const msg = 'This account does not have admin panel access.';
                    setError(msg);
                    throw new Error(msg);
                }
                // Profile fetch failed transiently — keep session; ProtectedRoute will retry UX
            }

            return response.data;
        } catch (err) {
            const errorMessage = loginAuthErrorMessage(err, getApiErrorMessage(err));
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [fetchCurrentUser, clearSession]);

    const refresh = useCallback(async () => {
        const currentRefresh = refreshTokenRef.current;
        if (!currentRefresh) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await refreshToken(currentRefresh);
            const body = unwrapSuccessEnvelope(response) ?? response.data;
            const access = body?.access ?? body?.access_token;
            if (!access) throw new Error('Refresh response missing access token');

            setToken(access);
            localStorage.setItem('access', access);
            return access;
        } catch (err) {
            await logout();
            throw err;
        }
    }, [logout]);

    const isAuthenticated = !!token;

    const value = {
        user,
        token,
        refreshTokenValue,
        loading,
        error,
        isAuthenticated,
        isAdmin: isAdminUser(user),
        login,
        logout,
        refresh,
        setError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
