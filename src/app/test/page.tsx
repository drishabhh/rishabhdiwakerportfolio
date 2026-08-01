import type { Metadata } from "next";
import { TestLabClient } from "@/app/test/test-lab-client";

export const metadata: Metadata = {
  title: "Lab — Gyro Test | Rishabh Diwaker",
  description: "Experimental gyro hero test page. Not indexed.",
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return <TestLabClient />;
}
