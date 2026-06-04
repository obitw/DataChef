import { useNavigate } from "react-router-dom";
import client from "../api/client";
import type { TokenOut, User } from "../types";

export function useAuth() {
  const navigate = useNavigate();

  const isAuthenticated = !!localStorage.getItem("token");

  async function login(email: string, password: string): Promise<void> {
    const { data } = await client.post<TokenOut>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", data.access_token);
    navigate("/datasources");
  }

  async function register(email: string, password: string): Promise<User> {
    const { data } = await client.post<User>("/auth/register", {
      email,
      password,
    });
    return data;
  }

  function logout(): void {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return { isAuthenticated, login, register, logout };
}
