import type { Metadata } from "next";
import { ReelFeed } from "@/components/ReelFeed";
import { latestReels } from "@/lib/reels";
import "./reels.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Histori",
  description: "Histori shqiptare në video të shkurtra: rrëshqit lart për pjesën tjetër.",
};

export default async function HistoryReels() {
  const reels = await latestReels();
  return <ReelFeed reels={reels} />;
}
