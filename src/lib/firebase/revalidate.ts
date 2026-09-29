import { revalidatePath } from "next/cache";

export function refreshApp(): void {
  revalidatePath("/", "layout");
}
