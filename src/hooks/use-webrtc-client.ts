import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/api";
import { WebRTCManager, type ConnectionState, type OrientationData } from '@/lib/webrtc';

export function useWebRTCClient(roomId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const managerRef = useRef<WebRTCManager | null>(null);

  // Convex mutations and queries
  const createAnswerMutation = useMutation(api.webrtc.createAnswer);
  const addIceCandidateMutation = useMutation(api.webrtc.addIceCandidate);
  const clearSignalingMutation = useMutation(api.webrtc.clearSignaling);
  const offerQuery = useQuery(api.webrtc.getOffer, { roomId });
  const iceCandidatesQuery = useQuery(api.webrtc.getIceCandidates, { roomId });

  const connectToHost = useCallback(async () => {
    if (!offerQuery) {
      throw new Error('No offer available');
    }

    try {
      const manager = new WebRTCManager(roomId);
      managerRef.current = manager;

      manager.setOnConnectionStateChange(setConnectionState);

      const answerSdp = await manager.createAnswer(offerQuery.sdp, createAnswerMutation, addIceCandidateMutation);
      
      // Test connection by sending some data after a short delay
      setTimeout(() => {
        if (managerRef.current) {
          console.log('Sending test data...');
          managerRef.current.sendData({
            type: 'orientation',
            alpha: 45,
            beta: 10,
            gamma: -5,
            timestamp: Date.now()
          });
        }
      }, 5000);
      
      return answerSdp;
    } catch (error) {
      console.error('Failed to connect to host:', error);
      setConnectionState({ 
        status: 'error', 
        error: `Failed to connect: ${error}` 
      });
      throw error;
    }
  }, [roomId, offerQuery, createAnswerMutation, addIceCandidateMutation]);

  // Watch for ICE candidates from desktop
  useEffect(() => {
    if (iceCandidatesQuery && managerRef.current) {
      const handleIceCandidates = async () => {
        for (const candidate of iceCandidatesQuery) {
          try {
            const iceCandidate = JSON.parse(candidate.sdp);
            await managerRef.current!.addIceCandidate(iceCandidate);
            console.log('ICE candidate added:', iceCandidate);
          } catch (error) {
            console.error('Failed to add ICE candidate:', error);
          }
        }
      };
      handleIceCandidates();
    }
  }, [iceCandidatesQuery]);

  const sendOrientationData = useCallback((data: OrientationData) => {
    if (managerRef.current) {
      managerRef.current.sendData(data);
    }
  }, []);

  const close = useCallback(async () => {
    if (managerRef.current) {
      managerRef.current.close();
      managerRef.current = null;
    }
    await clearSignalingMutation({ roomId });
    setConnectionState({ status: 'disconnected' });
  }, [roomId, clearSignalingMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.close();
      }
    };
  }, []);

  return {
    connectionState,
    connectToHost,
    sendOrientationData,
    close,
    hasOffer: !!offerQuery
  };
}
