import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const addItem = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("items", {
      text: args.text,
    });
    return id;
  },
});

export const getItems = query({
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});
