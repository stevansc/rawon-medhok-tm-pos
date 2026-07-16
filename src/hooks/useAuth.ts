import { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { ApiService } from "../services/api";

interface UseAuthOptions {
  allowedRoles: UserRole[];
}

export function useAuth({ allowedRoles }: UseAuthOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const savedUser = ApiService.getSavedUser();
    const savedToken = ApiService.getToken();
    if (savedUser && allowedRoles.includes(savedUser.role)) {
      setUser(savedUser);
      setToken(savedToken);
    } else if (savedUser) {
      ApiService.logout();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setIsLoggingIn(true);
      setLoginError(null);

      const userProfile = await ApiService.login(username, password);

      if (userProfile && allowedRoles.includes(userProfile.role)) {
        setUser(userProfile);
        setToken(ApiService.getToken());
      } else {
        ApiService.logout();
        throw new Error(`Access denied. Requires one of: ${allowedRoles.join(", ")}`);
      }
    } catch (err: any) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setToken(null);
  };

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    username,
    setUsername,
    password,
    setPassword,
    isLoggingIn,
    loginError,
    handleLogin,
    handleLogout,
  };
}
