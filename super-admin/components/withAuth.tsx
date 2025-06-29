"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

const withAuth = <P extends Record<string, any> = {}>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  const AuthenticatedComponent: React.FC<P> = (props: P) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check if token exists in localStorage
          const token = localStorage.getItem("superAdminToken");

          if (!token) {
            router.push("/login");
            return;
          }

          // Optionally verify token with backend
          const response = await authApi.getCurrentUser();

          if (response.success) {
            setIsAuthenticated(true);
          } else {
            // Token is invalid, remove it and redirect
            authApi.logout();
            router.push("/login");
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          authApi.logout();
          router.push("/login");
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    // Show loading spinner while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // If not authenticated, the useEffect will handle redirect
    if (!isAuthenticated) {
      return null;
    }

    // If authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  // Set display name for debugging
  AuthenticatedComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return AuthenticatedComponent;
};

export default withAuth;
