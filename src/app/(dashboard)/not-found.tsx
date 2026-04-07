import Link from "next/link";
import { MapPin } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
        <MapPin size={32} className="text-on-surface-variant" />
      </div>
      <h2 className="text-4xl font-extrabold text-primary mb-2">404</h2>
      <p className="text-lg text-on-surface-variant mb-2">Page not found</p>
      <p className="text-sm text-on-surface-variant max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="bg-secondary text-on-secondary px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
