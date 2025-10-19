import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  webrtc_signaling: defineTable({
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    sdp: v.string(),
    roomId: v.string(),
    timestamp: v.number(),
  }).index("by_room", ["roomId"]),
});
