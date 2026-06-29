export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            RabbitMailer
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bulk email, simplified.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
