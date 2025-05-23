import { orderReview } from "../../db/schemas/schema";
import { db } from "@/drizzle";
// import { readCsvToArray } from "../read-sheet";
import pLimit from "p-limit";
import { parseCustomDate, readCsvToArray } from "../utils";

export async function populateOrderReview() {
  try {
    // Clear the order review table
    await db.delete(orderReview);
    console.log("Order review table cleared.");

    // Read the CSV file into an array
    console.log("Reading review table sheet...");
    const result = readCsvToArray("./sheets/olist_order_reviews_dataset.csv");

    const limit = pLimit(10); // Limit concurrency to 10
    let completed = 0;
    const total = result.length;

    // Map tasks with concurrency limit
    const tasks = result.map((item) =>
      limit(async () => {
        try {
          await db.insert(orderReview).values({
            review_id: item.review_id,
            order_id: item.order_id,
            review_score: item.review_score ? +item.review_score : null,
            review_comment_title: item.review_comment_title,
            review_comment_message: item.review_comment_message,
            review_creation_date: parseCustomDate(item.review_creation_date),
            review_answer_timestamp: parseCustomDate(
              item.review_answer_timestamp
            ),
          });

          completed++;
          if (completed % 50 === 0 || completed === total) {
            process.stdout.write(
              `\rProgress: ${((completed / total) * 100).toFixed(2)}%`
            );
          }
        } catch (err) {
          console.error(
            `Error inserting order review with ID ${item.review_id}:`,
            err
          );
        }
      })
    );

    // Wait for all tasks to complete
    await Promise.all(tasks);

    console.log("\nOrder review population completed successfully.");
  } catch (error) {
    console.error("Error populating order reviews:", error);
  }
}
