import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId?: string | null;
    } & DefaultSession["user"];
  }
}

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

async function isLocked(email: string) {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000);
  const failures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_ATTEMPTS;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        if (await isLocked(email)) {
          logger.warn("auth.lockout", { email });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const ok = user?.passwordHash ? bcrypt.compareSync(password, user.passwordHash) : false;
        await prisma.loginAttempt.create({
          data: { email, userId: user?.id, success: Boolean(ok && user?.active) },
        });
        if (!ok || !user?.active) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.CUSTOMER;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
});
