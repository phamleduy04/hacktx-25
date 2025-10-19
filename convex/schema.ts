import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.

export default defineSchema({
  f1_pit_strategy: defineTable({
    car_id: v.string(),
    decision: v.string(),
  }).index("by_car_id", ["car_id"]),
  f1_car_data: defineTable({
    car_id: v.string(),
    undercut_overcut_opportunity: v.boolean(),
    tire_wear_percentage: v.number(),
    performance_drop_seconds: v.number(),
    track_position: v.number(),
    race_incident: v.union(v.literal('None'), v.literal('Yellow Flag'), v.literal('Safety Car'), v.literal('VSC')),
    laps_since_pit: v.number(),
  }).index("by_car_id", ["car_id"]),
  webrtc_signaling: defineTable({
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    sdp: v.string(),
    roomId: v.string(),
    timestamp: v.number(),
  }).index("by_room", ["roomId"]),
});
