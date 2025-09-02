import dynamic from "next/dynamic";
export const dynamicParams = false;
const LeaguePage = dynamic(() => import("@/components/LeaguePage"), { ssr: true });

export default function NCAAFPage() {
  return <LeaguePage league="ncaaf" />;
}
