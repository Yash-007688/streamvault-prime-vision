import { createContext, ReactNode } from "react";

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Mock user and profile for "no-backend" mode
  const user = { id: "guest", email: "guest@example.com" };
  const profile = { name: "Guest User", tokens: 9999 };
  const isAdmin = true;

  const signUp = async () => {};
  const signIn = async () => {};
  const signOut = async () => {};
  const refreshProfile = async () => {};

  return (
    <AuthContext.Provider value={{ session: null, user, profile, isAdmin, loading: false, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
