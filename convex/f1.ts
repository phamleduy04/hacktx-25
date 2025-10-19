import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addF1CarData = mutation({
    args: {
        car_id: v.string(),
        undercut_overcut_opportunity: v.boolean(),
        tire_wear_percentage: v.number(),
        performance_drop_seconds: v.number(),
        track_position: v.number(),
        race_incident: v.union(v.literal('None'), v.literal('Yellow Flag'), v.literal('Safety Car'), v.literal('VSC')),
        laps_since_pit: v.number(),
    },
    returns: v.id("f1_car_data"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("f1_car_data", args);
    },
});


export const listF1CarData = query({
    args: {},
    returns: v.array(v.object({
        _id: v.id("f1_car_data"),
        _creationTime: v.number(),
        car_id: v.string(),
        undercut_overcut_opportunity: v.boolean(),
        tire_wear_percentage: v.number(),
        performance_drop_seconds: v.number(),
        track_position: v.number(),
        race_incident: v.union(v.literal('None'), v.literal('Yellow Flag'), v.literal('Safety Car'), v.literal('VSC')),
        laps_since_pit: v.number(),
    })),
    handler: async (ctx) => {
        return await ctx.db.query("f1_car_data").collect();
    },
});