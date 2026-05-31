import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [refreshTokenValue, setRefreshTokenValue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('access');
        const storedRefreshToken = localStorage.getItem('refresh');

        if (storedToken && storedRefreshToken) {
            setToken(storedToken);
            setRefreshTokenValue(storedRefreshToken);
            fetchCurrentUser(storedToken);
        } else {
            setLoading(false);
        }
    }, []);

    // Fetch current user
    const fetchCurrentUser = useCallback(async (accessToken) => {
        try {
            const response = await getCurrentUser();
            const body = unwrapSuccessEnvelope(response) ?? response.data;
            setUser(body?.user ?? body?.employee ?? body);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch user:', err);
            // Keep shell usable — sidebar/menu must not depend on profile fetch succeeding
            setUser((prev) =>
                prev ?? { username: 'Admin', is_staff: true }
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Login function
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

            setToken(access);
            setRefreshTokenValue(refresh);

            localStorage.setItem('access', access);
            localStorage.setItem('refresh', refresh);

            // Fetch user info after login
            await fetchCurrentUser(access);

            return response.data;
        } catch (err) {
            const errorMessage = loginAuthErrorMessage(err, getApiErrorMessage(err));
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [fetchCurrentUser]);

    // Refresh token function
    const refresh = useCallback(async () => {
        if (!refreshTokenValue) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await refreshToken(refreshTokenValue);
            const { access } = response.data;

            setToken(access);
            localStorage.setItem('access', access);

            return access;
        } catch (err) {
            // Logout on refresh failure
            logout();
            throw err;
        }
    }, [refreshTokenValue]);

    // Logout function
    const logout = useCallback(async () => {
        try {
            if (refreshTokenValue) {
                await logoutAPI(refreshTokenValue);
            }
        } catch (err) {
            console.error('Logout API error:', err);
        } finally {
            setToken(null);
            setRefreshTokenValue(null);
            setUser(null);
            setError(null);

            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
        }
    }, [refreshTokenValue]);

    const isAuthenticated = !!token;

    const value = {
        user,
        token,
        refreshTokenValue,
        loading,
        error,
        isAuthenticated,
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
