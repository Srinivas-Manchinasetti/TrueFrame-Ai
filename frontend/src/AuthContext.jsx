/**
 * AuthContext — Clerk-backed implementation
 *
 * Wraps Clerk's hooks and exposes the same API shape the rest of the app
 * already uses:  { user, token, loading, isAuthenticated, signOut }
 *
 * Components that previously called signInDemo / signInGoogle do not need
 * those functions any more — Clerk handles all sign-in flows via its own
 * modal UI.  They are kept as no-ops so old call-sites don't crash.
 */
import React, { createContext, useContext } from "react";
import {
  useUser,
  useAuth as useClerkAuth,
  useClerk,
} from "@clerk/clerk-react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Clerk's hooks — available anywhere inside <ClerkProvider>
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  // Map Clerk's user object to the shape the rest of the app expects
  const user = isSignedIn && clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress || "User",
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        avatar_url: clerkUser.imageUrl || null,
        role: "analyst",
        auth_provider: "clerk",
      }
    : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  // No-ops kept for backwards compatibility with any call-sites
  const signInDemo = async () => {
    console.warn("[AuthContext] signInDemo is deprecated — use Clerk UI instead.");
  };
  const signInGoogle = async () => {
    console.warn("[AuthContext] signInGoogle is deprecated — use Clerk UI instead.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,        // Clerk manages tokens internally; use getToken() if needed
        loading: !isLoaded,
        isAuthenticated: !!user,
        signOut,
        signInDemo,
        signInGoogle,
        getToken,           // expose for backend API calls that need a JWT
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
