import type { Metadata } from "next";
import { getCompanyForUser } from "@/lib/company";
import { effectivePlan, PLAN_FEATURES } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = { title: "Mon entreprise" };

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const user = await requireUser();
  const [company, { bienvenue }] = await Promise.all([getCompanyForUser(user.id), searchParams]);
  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Mon entreprise</h1>
      <CompanyForm company={company} welcome={bienvenue === "1" && !company} canLogo={PLAN_FEATURES[effectivePlan(user)].logo} />
    </>
  );
}
