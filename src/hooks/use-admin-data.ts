import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSession } from "@/hooks/use-session";

export function useAdminGate() {
  const { user } = useSession();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  return { user, isAdmin: Boolean(isAdmin), isLoading };
}

export function useAdminSubs(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-subs"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminQuotes(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-quotes"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProfiles(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-profiles"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, city, state, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminMeasurements(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-measurements"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_measurements")
        .select("*, quote_requests(patient_name, lens_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminLabs(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-labs"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("labs").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
