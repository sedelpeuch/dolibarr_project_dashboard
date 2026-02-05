import { useState, useEffect } from "react";
import { api } from "../api";

export interface CurrentUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  job?: string;
  login: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Try to get from sessionStorage first
        const cached = sessionStorage.getItem("currentUser");
        if (cached) {
          setUser(JSON.parse(cached));
          setLoading(false);
          return;
        }

        // Fetch from API
        const response = await api.get("/current-user");
        const userData = response.data;
        
        const currentUser: CurrentUser = {
          id: parseInt(userData.id),
          firstname: userData.firstname || "",
          lastname: userData.lastname || "",
          email: userData.email || "",
          job: userData.job,
          login: userData.login || "",
        };

        setUser(currentUser);
        
        // Cache for 1 hour
        sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load current user";
        setError(message);
        console.error("Error loading current user:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  return { user, loading, error };
};
