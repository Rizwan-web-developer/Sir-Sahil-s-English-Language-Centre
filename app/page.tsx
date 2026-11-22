import { redirect } from "next/navigation";

import { getSessionProfile } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";

/**
 * Entry point: send every signed-in visitor to the correct area.
 * Anonymous visitors are already redirected to /login by the proxy.
 */
export default async function HomePage() {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  redirect(ROLE_HOME[session.profile.role]);
}
