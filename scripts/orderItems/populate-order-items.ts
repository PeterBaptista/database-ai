import { orderItem } from "@/db/schemas";
import { db } from "@/drizzle";
import pLimit from "p-limit";
import { readCsvToArray } from "../read-sheet";
import { parseCustomDate } from "../utils";

export async function populateOrderItems() {
  try {
    await db.delete(orderItem);
    console.log("Reading order items sheet...");
    const result = readCsvToArray("./sheets/olist_order_items_dataset.csv");

    const limit = pLimit(10); // Adjust concurrency level as needed

    let completed = 0;
    const total = result.length;

    const tasks = result.map((item) =>
      limit(async () => {
        await db.insert(orderItem).values({
          id: item.order_item_id ? +item.order_item_id : null,
          order_id: item.order_id,
          product_id: item.product_id,
          seller_id: item.seller_id,
          shipping_limit_date: parseCustomDate(item.shipping_limit_date),
          price: item.price ? +item.price : null,
          freight_value: item.freight_value ? +item.freight_value : null,
        });

        completed++;
        if (completed % 50 === 0 || completed === total) {
          process.stdout.write(
            `\rProgress: ${((completed / total) * 100).toFixed(2)}%`
          );
        }
      })
    );

    await Promise.all(tasks);
    console.log("\nOrder items populated successfully.");
  } catch (error) {
    console.error("Error populating Order Items:", error);
  }
}
