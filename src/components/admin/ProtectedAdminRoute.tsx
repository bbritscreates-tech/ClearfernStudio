
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type AccessState = "checking" | "allowed" | "denied";

export default function ProtectedAdminRoute() {
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (active) setAccess("denied");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setAccess(!error && profile?.role === "admin" ? "allowed" : "denied");
    }

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (access === "checking") {
    return (
      <main className="admin-loading">
        <p>Verifying administrator access...</p>
      </main>
    );
  }

  if (access === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
