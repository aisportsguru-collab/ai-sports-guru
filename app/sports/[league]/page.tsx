import LeaguePage from "@/app/(sports)/LeaguePage";

export default async function Page({ params }: { params: { league: string } }) {
  return <LeaguePage league={params.league} />;
}
