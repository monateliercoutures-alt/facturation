import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-4 pb-12">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
      </header>
      <main>{children}</main>
    </div>
  );
}
