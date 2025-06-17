"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuth(props: P) {
    const router = useRouter();

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
      }
    }, [router]);

    return <WrappedComponent {...props} />;
  };
}
