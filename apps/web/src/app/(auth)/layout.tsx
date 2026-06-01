export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">LMS</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Learning Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
