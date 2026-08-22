import { redirect } from "next/navigation";

/** Root route — redirect to the demo editor. */
export default function RootPage() {
  redirect("/editor/preview");
}
