import { redirect } from "next/navigation";

/** The map moved to "/" — it's the homepage now, not a separate page behind sign-in. */
export default function MapRedirect() {
  redirect("/");
}
