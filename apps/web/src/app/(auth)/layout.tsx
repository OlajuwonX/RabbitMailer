import Image from "next/image";
import { LinearTitle } from "@/components/ui/linear";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full p-3">
            <Image
              src="/rabbitmailer.png"
              alt="RabbitMailer"
              width={36}
              height={36}
              priority
              unoptimized
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
