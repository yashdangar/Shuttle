"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

export function useAuthSession() {
  const sessionState = useSession();
  const { data, status } = sessionState;

  const user = useMemo(() => {
    if (!data?.user) {
      return null;
    }
    console.log(data.user);
    return {
      id: data.user.id,
      name: data.user.name ?? "",
      email: data.user.email ?? "",
      role: data.user.role,
      image: data.user.image ?? null,
    };
  }, [data?.user]);

  return {
    ...sessionState,
    user,
    isAuthenticated: status === "authenticated",
  };
}
