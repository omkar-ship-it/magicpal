"use client";

import dynamic from "next/dynamic";

/** Client-only: the world view measures and paints a canvas on first render. */
const CircleTree = dynamic(() => import("./CircleTree"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" style={{ background: "#0b1020" }} />,
});

export default function CircleTreeLoader() {
  return <CircleTree />;
}
