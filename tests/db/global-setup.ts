import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

export default function setup(): void {
  execSync("npm run seed", { stdio: "inherit", env: process.env });
}
