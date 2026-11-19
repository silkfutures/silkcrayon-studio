import { redirect } from "next/navigation";

export default function Page() {
  redirect("/booking?service=vocal-recording&duration=120");
}
