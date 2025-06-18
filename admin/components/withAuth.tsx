"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuth(props: P) {
    const router = useRouter();

    useEffect(() => {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/login");
      }
    }, [router]);

    return <WrappedComponent {...props} />;
  };
}
