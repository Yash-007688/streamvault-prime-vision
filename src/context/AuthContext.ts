import { createContext } from "react";

export interface AuthContextType {
  session: null;
  user: { id: string; email: string } | null;
  profile: { name: string; tokens: number } | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
