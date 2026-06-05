import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser, useClerk } from "@clerk/expo";
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
  clerkId?: string;
  imageUrl?: string;
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
  syncFromClerk: (clerkUser: any) => void;
  updateUser: (updates: Partial<User>) => void;
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

const USER_STORAGE_KEY = "everstop_user";
const ACCOUNTS_KEY = "everstop_accounts";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load local user on mount
  useEffect(() => {
    AsyncStorage.getItem(USER_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setUser(JSON.parse(data));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });
  }, []);

  // Sync Clerk user -> local user whenever Clerk state changes
  useEffect(() => {
    if (clerkUser && clerkUser.id) {
      const clerkId = clerkUser.id;
      const name = clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
      const imageUrl = clerkUser.imageUrl || undefined;

      // Check if we already have a local user with this clerkId
      AsyncStorage.getItem(USER_STORAGE_KEY).then((data) => {
        const existingUser = data ? JSON.parse(data) as User : null;
        if (existingUser && existingUser.clerkId === clerkId) {
          // Already synced, just update name/email/imageUrl if changed
          const updated = {
            ...existingUser,
            name: existingUser.name || name,
            email: existingUser.email || email,
            imageUrl: imageUrl || existingUser.imageUrl,
          };
          setUser(updated);
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
          return;
        }

        // Create new user from Clerk
        const newUser: User = {
          id: clerkId,
          clerkId: clerkId,
          name: name,
          email: email,
          accountType: "driver",
          points: 0,
          rank: "Rookie Driver",
          joinDate: new Date().toISOString(),
          locationsSubmitted: 0,
          photosUploaded: 0,
          verificationsCompleted: 0,
          favoriteLocations: [],
          isPremium: false,
          imageUrl,
        };
        setUser(newUser);
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      });
    }
  }, [clerkUser]);

  const saveUser = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!stored) return false;
    const accounts = JSON.parse(stored) as Record<string, User>;
    const account = accounts[email.toLowerCase()];
    if (!account) return false;
    await saveUser(account);
    return true;
  }, [saveUser]);

  const register = useCallback(async (name: string, email: string, _password: string, accountType: AccountType): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
    const accounts = stored ? JSON.parse(stored) as Record<string, User> : {};
    if (accounts[email.toLowerCase()]) return false;
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
    accounts[email.toLowerCase()] = newUser;
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    await saveUser(newUser);
    return true;
  }, [saveUser]);

  const logout = useCallback(async () => {
    // Sign out from Clerk
    try {
      await signOut();
    } catch {
      // Clerk may already be signed out
    }
    // Clear local user
    setUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, [signOut]);

  const addPoints = useCallback((pts: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const newPoints = prev.points + pts;
      const updated = { ...prev, points: newPoints, rank: getRank(newPoints) };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      if (prev.email) {
        AsyncStorage.getItem(ACCOUNTS_KEY).then((data) => {
          const accounts = data ? JSON.parse(data) : {};
          accounts[prev.email] = updated;
          AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        });
      }
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
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      if (prev.email) {
        AsyncStorage.getItem(ACCOUNTS_KEY).then((data) => {
          const accounts = data ? JSON.parse(data) : {};
          accounts[prev.email] = updated;
          AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        });
      }
      return updated;
    });
  }, []);

  const upgradeToPremium = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isPremium: true };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      if (prev.email) {
        AsyncStorage.getItem(ACCOUNTS_KEY).then((data) => {
          const accounts = data ? JSON.parse(data) : {};
          accounts[prev.email] = updated;
          AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        });
      }
      return updated;
    });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      if (prev.email) {
        AsyncStorage.getItem(ACCOUNTS_KEY).then((data) => {
          const accounts = data ? JSON.parse(data) : {};
          accounts[prev.email] = updated;
          AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        });
      }
      return updated;
    });
  }, []);

  const syncFromClerk = useCallback((clerkUser: any) => {
    const clerkId = clerkUser?.id;
    const name = clerkUser?.fullName || clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    const imageUrl = clerkUser?.imageUrl || undefined;

    const newUser: User = {
      id: clerkId || email || Date.now().toString(),
      clerkId: clerkId || undefined,
      name,
      email,
      accountType: "driver",
      points: 0,
      rank: "Rookie Driver",
      joinDate: new Date().toISOString(),
      locationsSubmitted: 0,
      photosUploaded: 0,
      verificationsCompleted: 0,
      favoriteLocations: [],
      isPremium: false,
      imageUrl,
    };
    setUser(newUser);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, addPoints, toggleFavorite, upgradeToPremium, syncFromClerk, updateUser }}>
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
