import { nanoid } from "nanoid";

export function generateId(prefix = "usr"): string {
  return `${prefix}_${nanoid()}`;
}
