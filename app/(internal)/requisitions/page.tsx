import { redirect } from "next/navigation";

export default function RequisitionsHomePage() {
  // Always show the new requisitions workflow entrypoint.
  redirect("/requisitions/list");
}
