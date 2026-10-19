import { redirect } from "next/navigation";

/** Root path redirects straight to the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}
