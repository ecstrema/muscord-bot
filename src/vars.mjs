import { config as dotenvConfig } from "dotenv";


const environment = dotenvConfig();
export let env = "parsed" in environment ? environment.parsed : undefined;

if (!env) {
    console.log("Failed to load environment variables from .env file.");
    process.exit(1);
}
if (!env.BOT_TOKEN) {
    console.log("Please set BOT_TOKEN in .env");
    process.exit(1);
}
if (!env.WEBHOOK_TOKEN) {
    console.log("Please set WEBHOOK_TOKEN in .env");
    process.exit(1);
}

export let newsChannel = null;

export let env = null;
