import { supabase } from "./supabaseClient";

const QUEUE_KEY = "dops-offline-queue";

export const addToOfflineQueue = (table, id, payload, userId) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    
    // Remove any existing queued updates for this exact row so we only keep the latest
    const filtered = queue.filter(q => !(q.table === table && q.id === id));
    
    filtered.push({ table, id, payload, userId, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to add to offline queue", e);
  }
};

export const flushOfflineQueue = async () => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!queue.length) return 0;
    
    let successCount = 0;
    const failedQueue = [];

    for (const item of queue) {
      const { table, id, payload, userId } = item;
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId);

      if (error && (error.message.includes("fetch") || error.message.includes("Failed to fetch"))) {
        // Still offline, keep in queue
        failedQueue.push(item);
      } else if (!error) {
        successCount++;
      } else {
        // Other error (e.g. schema error), discard to avoid infinite loop
        console.error(`Discarding failed offline sync for ${table}:${id}`, error);
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
    return successCount;
  } catch (e) {
    console.error("Failed to flush offline queue", e);
    return 0;
  }
};

// Automatically try to flush when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineQueue().then(count => {
      if (count > 0) {
        console.log(`Successfully synced ${count} offline updates to database.`);
      }
    });
  });
}
