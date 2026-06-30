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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rabbitmailer.png"
              alt="RabbitMailer"
              className="w-9 h-9 object-contain rounded-xl"
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
