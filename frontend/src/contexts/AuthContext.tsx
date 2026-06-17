import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearTokens,
  fetchMe,
  getAccessToken,
  login as apiLogin,
  logoutApi,
  setTokens,
} from "../api/client";
import type { User } from "../types/auth";
import type { PermissionCode, UserRole } from "../types/rbac";
import { can as checkPermission, hasRole as checkRole } from "../utils/permissions";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (permission: PermissionCode) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    const profile = await fetchMe();
    setUser(profile);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    setTokens(tokens.access, tokens.refresh);
    setUser(tokens.user);
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
      can: (permission: PermissionCode) => checkPermission(user, permission),
      hasRole: (role: UserRole) => checkRole(user, role),
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
