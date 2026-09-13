import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "../components/ui/Spinner";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;

  return <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />;
}
