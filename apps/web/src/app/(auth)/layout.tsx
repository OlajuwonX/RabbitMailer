import Image from "next/image";
import { LinearTitle } from "@/components/ui/linear";
import logo from "../../../public/rabbitmailer.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-1">
          <div className="p-1 ">
            <Image
              src={logo}
              alt="RabbitMailer"
              width={80}
              height={65}
              priority
              className="rounded-xl"
            />
          </div>
          <LinearTitle gradient size="xl" as="h1">
            RabbitMailer
          </LinearTitle>
        </div>

        {children}
      </div>
    </div>
  );
}
