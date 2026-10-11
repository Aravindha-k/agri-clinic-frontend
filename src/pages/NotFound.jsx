import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui/command";

export default function NotFound() {
  return (
    <div className="page-container flex items-center justify-center min-h-[60vh]">
      <EmptyState
        icon={Compass}
        title="Page not found"
        subtitle="The page you're looking for doesn't exist or may have moved."
        action={
          <Link to="/dashboard" className="btn btn-primary btn-md">
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
