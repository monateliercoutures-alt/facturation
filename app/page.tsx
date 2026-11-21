import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Outil privé, sans page d'accueil : connecté → tableau de bord, sinon → connexion.
export default async function HomePage() {
  const session = await auth();
  redirect(session?.user?.id ? "/app" : "/connexion");
}
