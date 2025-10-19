import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store WebRTC offers and answers for signaling
export const createOffer = mutation({
  args: {
    offerSdp: v.string(),
    roomId: v.string(),
  },
  returns: v.id("webrtc_signaling"),
  handler: async (ctx, args) => {
    // Clean up any existing offers for this room
    const existingOffers = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    for (const offer of existingOffers) {
      await ctx.db.delete(offer._id);
    }

    return await ctx.db.insert("webrtc_signaling", {
      type: "offer",
      sdp: args.offerSdp,
      roomId: args.roomId,
      timestamp: Date.now(),
    });
  },
});

export const createAnswer = mutation({
  args: {
    answerSdp: v.string(),
    roomId: v.string(),
  },
  returns: v.id("webrtc_signaling"),
  handler: async (ctx, args) => {
    // Clean up any existing answers for this room
    const existingAnswers = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("type"), "answer")
      ))
      .collect();
    
    for (const answer of existingAnswers) {
      await ctx.db.delete(answer._id);
    }

    return await ctx.db.insert("webrtc_signaling", {
      type: "answer",
      sdp: args.answerSdp,
      roomId: args.roomId,
      timestamp: Date.now(),
    });
  },
});

export const getOffer = query({
  args: { roomId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("webrtc_signaling"),
      _creationTime: v.number(),
      type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
      sdp: v.string(),
      roomId: v.string(),
      timestamp: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const offer = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("type"), "offer")
      ))
      .first();
    
    return offer;
  },
});

export const getAnswer = query({
  args: { roomId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("webrtc_signaling"),
      _creationTime: v.number(),
      type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
      sdp: v.string(),
      roomId: v.string(),
      timestamp: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const answer = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("type"), "answer")
      ))
      .first();
    
    return answer;
  },
});

export const addIceCandidate = mutation({
  args: {
    candidate: v.string(),
    roomId: v.string(),
  },
  returns: v.id("webrtc_signaling"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("webrtc_signaling", {
      type: "ice-candidate",
      sdp: args.candidate,
      roomId: args.roomId,
      timestamp: Date.now(),
    });
  },
});

export const getIceCandidates = query({
  args: { roomId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("webrtc_signaling"),
      _creationTime: v.number(),
      type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
      sdp: v.string(),
      roomId: v.string(),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.and(
        q.eq(q.field("roomId"), args.roomId),
        q.eq(q.field("type"), "ice-candidate")
      ))
      .collect();
    
    return candidates;
  },
});

export const clearSignaling = mutation({
  args: { roomId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("webrtc_signaling")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    for (const signal of signals) {
      await ctx.db.delete(signal._id);
    }
    
    return null;
  },
});
