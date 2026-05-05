import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../graphql/auth";

/**
 * Loads `me` when a JWT exists. Use after route guard so token is usually present.
 */
export function useAuthUser() {
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  const { data, loading, error, refetch } = useQuery(GET_ME, {
    skip: !hasToken,
    fetchPolicy: "cache-and-network",
  });

  return {
    user: data?.me ?? null,
    loading,
    error,
    refetch,
    isAuthenticated: hasToken,
  };
}
