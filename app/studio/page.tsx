import type { Metadata } from "next";
import Studio from "./Studio";
import "./studio.css";

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } };

export default function StudioPage() {
  return <Studio />;
}
