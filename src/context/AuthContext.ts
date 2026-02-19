import { createContext } from "react";

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "user";
}

export interface Profile {
  name: string;
  tokens: number;
}

export interface AuthContextType {
  session: { user: User } | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (data: { email: string; password: string; name?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
