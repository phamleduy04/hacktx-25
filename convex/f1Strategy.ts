import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const setF1PitStrategy = mutation({
    args: {
        car_id: v.string(),
        decision: v.string(),
    },
    returns: v.id("f1_pit_strategy"),
    handler: async (ctx, args) => {
        // Check if strategy already exists for this car (using index for efficiency)
        const existing = await ctx.db
            .query("f1_pit_strategy")
            .withIndex("by_car_id", (q) => q.eq("car_id", args.car_id))
            .first();
        
        if (existing) {
            // Update existing strategy
            await ctx.db.patch(existing._id, { decision: args.decision });
            return existing._id;
        } else {
            // Insert new strategy
            return await ctx.db.insert("f1_pit_strategy", args);
        }
    },
}); 

export const listF1PitStrategy = query({
    args: {},
    returns: v.array(v.object({
        _id: v.id("f1_pit_strategy"),
        _creationTime: v.number(),
        car_id: v.string(),
        decision: v.string(),
    })),
    handler: async (ctx) => {
        return await ctx.db.query("f1_pit_strategy").collect();
    },
});