import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "how-many-guests-per-table-wedding",
  title: "How Many Guests Per Table? The Wedding Seating Math",
  metaTitle: "How Many Guests Per Table at a Wedding? The Capacity Guide",
  metaDescription: "Round table seats 8 or 10? Long table seats 8 or 12? Here's the actual math — table sizes, guest counts, spacing rules, and how to avoid overcrowding.",
  publishDate: "2026-04-12",
  category: "Guide",
  tags: ["guests per table wedding", "how many people per table wedding", "table size for wedding", "wedding table capacity"],
  readTime: 5,
  excerpt: "The math is straightforward, but it matters more than you think. Put 11 guests at a table designed for 10, and everyone's elbows are touching for three hours. Leave a table with 5 guests in a room of tables of 10, and those five people feel forgotten. Here are the numbers you actually need.",
  content: `
The math is straightforward, but it matters more than you think. Put 11 guests at a table designed for 10, and everyone's elbows are touching for three hours. Leave a table with 5 guests in a room of tables of 10, and those five people feel forgotten.

Here are the numbers you actually need.

## Round tables

**60-inch round (5 feet across):** 8 guests is comfortable. 9 is possible but tight. 10 is too many unless the chairs are narrow and the guests are patient.

**72-inch round (6 feet across):** 10 guests is comfortable. 11 is possible. 12 is for people who like their neighbors a lot.

The rule: each guest needs approximately 24 inches of perimeter space (the circumference of the table divided by the number of guests). A 72-inch round has a circumference of 226 inches — that's 22.6 inches per guest at 10 seats. Comfortable. At 12 seats, it drops to 18.8 inches per guest. That's cramped.

## Long tables

**6-foot table (72 inches):** 6 guests (3 per side). 8 if you add the ends — but end seats feel awkward because those guests face the side of someone's head, not another guest's face.

**8-foot table (96 inches):** 8 guests (4 per side) is comfortable. 10 with end seats.

For longer communal setups (multiple tables pushed end-to-end), plan 24 inches of linear space per guest on each side. An 8-foot section = 4 guests per side = 8 guests per 8-foot section. Three sections = 24 guests (12 per side).

## The minimum viable table

How few guests can you seat at a table before it feels sad? The answer depends on the table's capacity and the tables around it.

A table of 6 in a room of tables of 10 feels small. A table of 6 in a room of tables of 8 feels normal. The key is contrast: if your table is visibly less full than its neighbors, it feels neglected.

**General rule:** Don't go below 6 guests per round table. Below 6, the table feels abandoned. If you can't fill a table to at least 6, consider combining two small groups or removing the table and redistributing guests.

## Planning your total table count

Start with your headcount, subtract the head table, divide by your per-table capacity, and round up.

**Example:** 150 guests. Head table seats 10. Remaining: 140 guests. Using 72-inch rounds seating 10 each: 140 ÷ 10 = 14 tables + 1 head table = 15 tables total.

**Add a buffer:** Add 1–2 extra seats (not tables) for last-minute confirmations. If you have 14 tables of 10 (140 seats) for 140 guests, that's zero cushion. Keeping 15 tables gives you 10 extra seats for late RSVPs.

**The space check:** 15 round tables need approximately 1,500–2,000 square feet of floor space (each 72-inch round with chairs needs roughly a 12-foot diameter circle, including chair pushback and server access). Add space for the dance floor (300+ sq ft), bar, DJ, head table, and pathways.

If the math doesn't fit your venue, you have three options: reduce guest count, switch to a more space-efficient table shape (long tables seat more per square foot), or use smaller tables (60-inch rounds at 8 per table — more tables, but each takes less space).

## Using a tool to test the layout

The fastest way to figure out if your tables fit is to lay them out visually. [Wedding Seater](https://weddingseater.app) lets you place tables on a canvas that represents your venue and immediately see if the room works. It's free and takes about five minutes.

[Test your table layout for free →](https://weddingseater.app)
`,
  faq: [
    {
      q: "How many people can sit at a 60-inch round table?",
      a: "8 guests comfortably. 9 is tight but manageable. 10 is too cramped for a three-hour dinner. Stick to 8 for a relaxed experience.",
    },
    {
      q: "How many people can sit at a 72-inch round table?",
      a: "10 guests comfortably. 11 is possible. 12 is very cramped — about 18.8 inches per person, which is insufficient elbow room for an extended dinner.",
    },
    {
      q: "What is the minimum number of guests for a round table?",
      a: "6 guests is the minimum before a round table starts to feel noticeably underfilled, especially in a room of fuller tables. If you can't seat at least 6, redistribute those guests to other tables and remove the table from the layout.",
    },
    {
      q: "How do I calculate how many tables I need for my wedding?",
      a: "Subtract head table guests from total headcount, divide by table capacity, round up, and add 1 for the head table. Example: 150 guests - 10 (head table) = 140 ÷ 10 per round = 14 tables + 1 head table = 15 total. Add 1 buffer table for late RSVPs.",
    },
    {
      q: "How much floor space do wedding tables need?",
      a: "A 72-inch round with chairs and service space needs roughly a 12-foot diameter circle of floor space. Multiply by table count and add space for dance floor (300+ sq ft for 100 guests), bar, DJ, and pathways (5–6 feet between table edges minimum).",
    },
  ],
};
