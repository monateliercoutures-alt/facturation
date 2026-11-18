import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { isAdminPhone } from "@/lib/phone";
import { signInSchema } from "@/lib/validation";

class InvalidCredentials extends CredentialsSignin {
  code = "identifiants";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: { phone: { label: "Téléphone" }, password: { label: "Mot de passe", type: "password" } },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();
        const { phone, password } = parsed.data;
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
        if (!user) {
          await verifyAgainstDummy(password);
          throw new InvalidCredentials();
        }
        if (!(await verifyPassword(password, user.passwordHash))) throw new InvalidCredentials();
        // Compte suspendu : même message qu'un mauvais mot de passe, pour ne rien révéler.
        if (user.suspendedAt) throw new InvalidCredentials();
        // ADMIN_PHONES fait foi : un numéro ajouté ou retiré prend effet à la connexion suivante.
        const role = isAdminPhone(user.phone) ? "admin" : "user";
        if (role !== user.role) await db.update(users).set({ role }).where(eq(users.id, user.id));
        return { id: user.id, name: user.name, role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.role = token.role === "admin" ? "admin" : "user";
      return session;
    },
  },
});
