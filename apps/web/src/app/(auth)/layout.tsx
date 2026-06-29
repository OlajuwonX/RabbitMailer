import Image from "next/image";
import { LinearTitle } from "@/components/ui/linear";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 flex justify-center overflow-hidden"
      >
        <div className="w-150 h-100 -translate-y-1/2 rounded-full bg-violet-700/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-white/6 border border-white/8 p-3 shadow-[0_0_24px_rgba(124,58,237,0.18)]">
            <Image
              src="/rabbitmailer.png"
              alt="RabbitMailer"
              width={36}
              height={36}
              priority
            />
          </div>
          <LinearTitle gradient size="xl" as="h1">
            RabbitMailer
          </LinearTitle>
          <p className="text-sm text-slate-500">Bulk email, simplified.</p>
        </div>

        {children}
      </div>
    </div>
  );
}
