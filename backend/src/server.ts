import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureRecurringEntries, sendDueBillNotifications } from "./services/planning.service.js";

app.listen(env.PORT, () => {
  console.log(`API running on port ${env.PORT}`);
});

async function runFinanceScheduler() {
  try {
    await ensureRecurringEntries();
    await sendDueBillNotifications();
  } catch (error) {
    console.error("Finance scheduler failed", error);
  }
}

void runFinanceScheduler();
setInterval(() => void runFinanceScheduler(), 60 * 60 * 1000).unref();
