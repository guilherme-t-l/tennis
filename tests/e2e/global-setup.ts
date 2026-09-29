import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

export default function globalSetup(): void {
  // Saved sign-ins belong to the previous emulator. A new run gets new player ids.
  fs.rmSync(path.join(process.cwd(), "tests/e2e/.auth"), { recursive: true, force: true });
  execSync("npm run seed", { stdio: "inherit", env: process.env });
}
