import { ReactNode, useState, useEffect } from "react";
import { AuthContext, User, Profile } from "./AuthContext";

interface StoredUser extends User {
  password?: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const storedSession = localStorage.getItem("streamvault_session");
        if (storedSession) {
          const session = JSON.parse(storedSession);
          // In a real app, check expiry. Here we just assume validity if present.
          const storedUsers: StoredUser[] = JSON.parse(localStorage.getItem("streamvault_users") || "[]");
          const foundUser = storedUsers.find((u) => u.id === session.userId);
          
          if (foundUser) {
            setUser({
              id: foundUser.id,
              email: foundUser.email,
              name: foundUser.name,
              role: foundUser.role
            });
            setProfile({
              name: foundUser.name || "User",
            });
          } else {
            // Invalid session
            localStorage.removeItem("streamvault_session");
          }
        }
      } catch (e) {
        console.error("Failed to load session", e);
        localStorage.removeItem("streamvault_session");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signUp = async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const storedUsers: StoredUser[] = JSON.parse(localStorage.getItem("streamvault_users") || "[]");
      
      if (storedUsers.some((u) => u.email === email)) {
        throw new Error("User already exists with this email");
      }

      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        email,
        password, // In a real app, NEVER store plain text passwords!
        name: name || "User",
        role: "user",
      };

      storedUsers.push(newUser);
      localStorage.setItem("streamvault_users", JSON.stringify(storedUsers));

      // Auto login after signup
      const session = { userId: newUser.id, created: Date.now() };
      localStorage.setItem("streamvault_session", JSON.stringify(session));

      setUser({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as "user" | "admin"
      });
      setProfile({
        name: newUser.name || "User",
      });

    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const storedUsers: StoredUser[] = JSON.parse(localStorage.getItem("streamvault_users") || "[]");
      const foundUser = storedUsers.find((u) => u.email === email && u.password === password);

      if (!foundUser) {
        throw new Error("Invalid email or password");
      }

      const session = { userId: foundUser.id, created: Date.now() };
      localStorage.setItem("streamvault_session", JSON.stringify(session));

      setUser({
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role
      });
      setProfile({
        name: foundUser.name || "User",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("streamvault_session");
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const storedUsers: StoredUser[] = JSON.parse(localStorage.getItem("streamvault_users") || "[]");
    const foundUser = storedUsers.find((u) => u.id === user.id);
    if (foundUser) {
      setProfile({
        name: foundUser.name || "User",
      });
    }
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@streamvault.com';

  return (
    <AuthContext.Provider value={{ 
      session: user ? { user } : null, 
      user, 
      profile, 
      isAdmin, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
