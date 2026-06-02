import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AccountType = "driver" | "customer";

export type UserRank =
  | "Rookie Driver"
  | "Road Warrior"
  | "Professional Driver"
  | "Elite Contributor"
  | "Master Navigator";

export interface User {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  points: number;
  rank: UserRank;
  joinDate: string;
  locationsSubmitted: number;
  photosUploaded: number;
  verificationsCompleted: number;
  favoriteLocations: string[];
  isPremium: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, accountType: AccountType) => Promise<boolean>;
  logout: () => void;
  addPoints: (points: number) => void;
  toggleFavorite: (locationId: string) => void;
  upgradeToPremium: () => void;
}

const POINTS_FOR_RANK: Record<UserRank, number> = {
  "Rookie Driver": 0,
  "Road Warrior": 100,
  "Professional Driver": 500,
  "Elite Contributor": 1500,
  "Master Navigator": 5000,
};

function getRank(points: number): UserRank {
  if (points >= 5000) return "Master Navigator";
  if (points >= 1500) return "Elite Contributor";
  if (points >= 500) return "Professional Driver";
  if (points >= 100) return "Road Warrior";
  return "Rookie Driver";
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("everstop_user").then((data) => {
      if (data) setUser(JSON.parse(data));
      setIsLoading(false);
    });
  }, []);

  const saveUser = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem("everstop_user", JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(`everstop_account_${email}`);
    if (!stored) return false;
    const account = JSON.parse(stored) as User;
    await saveUser(account);
    return true;
  }, [saveUser]);

  const register = useCallback(async (name: string, email: string, _password: string, accountType: AccountType): Promise<boolean> => {
    const existing = await AsyncStorage.getItem(`everstop_account_${email}`);
    if (existing) return false;
    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      email,
      accountType,
      points: 0,
      rank: "Rookie Driver",
      joinDate: new Date().toISOString(),
      locationsSubmitted: 0,
      photosUploaded: 0,
      verificationsCompleted: 0,
      favoriteLocations: [],
      isPremium: false,
    };
    await AsyncStorage.setItem(`everstop_account_${email}`, JSON.stringify(newUser));
    await saveUser(newUser);
    return true;
  }, [saveUser]);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem("everstop_user");
  }, []);

  const addPoints = useCallback((pts: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const newPoints = prev.points + pts;
      const updated = { ...prev, points: newPoints, rank: getRank(newPoints) };
      AsyncStorage.setItem("everstop_user", JSON.stringify(updated));
      AsyncStorage.setItem(`everstop_account_${prev.email}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((locationId: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const favs = prev.favoriteLocations.includes(locationId)
        ? prev.favoriteLocations.filter((id) => id !== locationId)
        : [...prev.favoriteLocations, locationId];
      const updated = { ...prev, favoriteLocations: favs };
      AsyncStorage.setItem("everstop_user", JSON.stringify(updated));
      AsyncStorage.setItem(`everstop_account_${prev.email}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const upgradeToPremium = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isPremium: true };
      AsyncStorage.setItem("everstop_user", JSON.stringify(updated));
      AsyncStorage.setItem(`everstop_account_${prev.email}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, addPoints, toggleFavorite, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { POINTS_FOR_RANK, getRank };
