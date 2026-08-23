import { redirect } from "next/navigation";

/** Legacy route: baseline opens on Knowledge via slide panel. */
export default function AuthorityBaselineRedirectPage() {
  redirect("/workspace/knowledge?baseline=1");
}
