import { useQuery } from "@tanstack/react-query";

export function usePredictions(sport: string) {
  return useQuery({
    queryKey: ["predictions", sport],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/api/predictions/${sport}?season=2025`);
      if (!res.ok) throw new Error("Network error");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
