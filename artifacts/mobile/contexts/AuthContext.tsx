import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser, useClerk } from "@clerk/expo";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AccountType = "driver" | "customer";
export type SubscriptionTier = "free" | "premium" | "business";

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
  subscriptionTier: SubscriptionTier;
  isPremium: boolean;
  points: number;
  rank: UserRank;
  joinDate: string;
  locationsSubmitted: number;
  photosUploaded: number;
  verificationsCompleted: number;
  favoriteLocations: string[];
  claimedLocationIds: string[];
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
  upgradeToTier: (tier: SubscriptionTier) => void;
  addClaimedLocation: (locationId: string) => void;
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

function makeDefaultUser(
  base: Partial<User> & Pick<User, "id" | "name" | "email" | "accountType">
): User {
  return {
    subscriptionTier: "free",
    isPremium: false,
    points: 0,
    rank: "Rookie Driver",
    joinDate: new Date().toISOString(),
    locationsSubmitted: 0,
    photosUploaded: 0,
    verificationsCompleted: 0,
    favoriteLocations: [],
    claimedLocationIds: [],
    ...base,
  };
}

function migrateUser(raw: any): User {
  const tier: SubscriptionTier =
    raw.subscriptionTier ?? (raw.isPremium ? "premium" : "free");
  return {
    ...raw,
    subscriptionTier: tier,
    isPremium: tier !== "free",
    claimedLocationIds: raw.claimedLocationIds ?? [],
  };
}

const USER_STORAGE_KEY = "everstop_user";
const ACCOUNTS_KEY = "everstop_accounts";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setUser(migrateUser(JSON.parse(data)));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (clerkUser && clerkUser.id) {
      const clerkId = clerkUser.id;
      const name =
        clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
        "User";
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
      const imageUrl = clerkUser.imageUrl || undefined;

      AsyncStorage.getItem(USER_STORAGE_KEY).then((data) => {
        const existingUser = data ? migrateUser(JSON.parse(data)) : null;
        if (existingUser && existingUser.clerkId === clerkId) {
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
        const newUser = makeDefaultUser({
          id: clerkId,
          clerkId,
          name,
          email,
          accountType: "driver",
          imageUrl,
        });
        setUser(newUser);
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      });
    }
  }, [clerkUser]);

  const saveUser = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
  }, []);

  const persistUserUpdate = useCallback((updater: (prev: User) => User) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
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

  const login = useCallback(
    async (email: string, _password: string): Promise<boolean> => {
      const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
      if (!stored) return false;
      const accounts = JSON.parse(stored) as Record<string, any>;
      const account = accounts[email.toLowerCase()];
      if (!account) return false;
      await saveUser(migrateUser(account));
      return true;
    },
    [saveUser]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      _password: string,
      accountType: AccountType
    ): Promise<boolean> => {
      const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
      const accounts = stored ? (JSON.parse(stored) as Record<string, User>) : {};
      if (accounts[email.toLowerCase()]) return false;
      const newUser = makeDefaultUser({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        email,
        accountType,
      });
      accounts[email.toLowerCase()] = newUser;
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      await saveUser(newUser);
      return true;
    },
    [saveUser]
  );

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {}
    setUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, [signOut]);

  const addPoints = useCallback(
    (pts: number) => {
      persistUserUpdate((prev) => {
        const newPoints = prev.points + pts;
        return { ...prev, points: newPoints, rank: getRank(newPoints) };
      });
    },
    [persistUserUpdate]
  );

  const toggleFavorite = useCallback(
    (locationId: string) => {
      persistUserUpdate((prev) => {
        const favs = prev.favoriteLocations.includes(locationId)
          ? prev.favoriteLocations.filter((id) => id !== locationId)
          : [...prev.favoriteLocations, locationId];
        return { ...prev, favoriteLocations: favs };
      });
    },
    [persistUserUpdate]
  );

  const upgradeToTier = useCallback(
    (tier: SubscriptionTier) => {
      persistUserUpdate((prev) => ({
        ...prev,
        subscriptionTier: tier,
        isPremium: tier !== "free",
      }));
    },
    [persistUserUpdate]
  );

  const upgradeToPremium = useCallback(() => upgradeToTier("premium"), [upgradeToTier]);

  const addClaimedLocation = useCallback(
    (locationId: string) => {
      persistUserUpdate((prev) => ({
        ...prev,
        claimedLocationIds: prev.claimedLocationIds.includes(locationId)
          ? prev.claimedLocationIds
          : [...prev.claimedLocationIds, locationId],
      }));
    },
    [persistUserUpdate]
  );

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      persistUserUpdate((prev) => ({ ...prev, ...updates }));
    },
    [persistUserUpdate]
  );

  const syncFromClerk = useCallback((clerkUser: any) => {
    const clerkId = clerkUser?.id;
    const name =
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      clerkUser?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      "User";
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    const imageUrl = clerkUser?.imageUrl || undefined;
    const newUser = makeDefaultUser({
      id: clerkId || email || Date.now().toString(),
      clerkId: clerkId || undefined,
      name,
      email,
      accountType: "driver",
      imageUrl,
    });
    setUser(newUser);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        addPoints,
        toggleFavorite,
        upgradeToPremium,
        upgradeToTier,
        addClaimedLocation,
        syncFromClerk,
        updateUser,
      }}
    >
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
