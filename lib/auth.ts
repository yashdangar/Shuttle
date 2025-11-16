import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const config = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await convex.action(api.auth.verifyPassword, {
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      if (account?.provider === "google") {
        const existingUser = await convex.query(api.auth.getUserByEmail, {
          email: token.email!,
        });

        if (existingUser) {
          token.id = existingUser._id;
          token.role = existingUser.role;
        } else {
          const userId = await convex.action(api.auth.createUser, {
            email: token.email!,
            name: token.name || "",
            phoneNumber: "",
            password: "",
            role: "guest",
          });
          token.id = userId;
          token.role = "guest";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

