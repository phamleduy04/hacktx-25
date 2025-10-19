import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/api";
import { WebRTCManager, type ConnectionState, type OrientationData } from '@/lib/webrtc';

export function useWebRTCHost(roomId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const [receivedData, setReceivedData] = useState<OrientationData | null>(null);
  const [offerSdp, setOfferSdp] = useState<string>('');
  const managerRef = useRef<WebRTCManager | null>(null);

  // Convex mutations and queries
  const createOfferMutation = useMutation(api.webrtc.createOffer);
  const addIceCandidateMutation = useMutation(api.webrtc.addIceCandidate);
  const clearSignalingMutation = useMutation(api.webrtc.clearSignaling);
  const answerQuery = useQuery(api.webrtc.getAnswer, { roomId });
  const iceCandidatesQuery = useQuery(api.webrtc.getIceCandidates, { roomId });

  const createOffer = useCallback(async () => {
    try {
      const manager = new WebRTCManager(roomId);
      managerRef.current = manager;

      manager.setOnConnectionStateChange(setConnectionState);
      manager.setOnDataReceived((data) => {
        console.log('Desktop received orientation data:', data);
        setReceivedData(data);
      });

      const sdp = await manager.createOffer(createOfferMutation, addIceCandidateMutation);
      setOfferSdp(sdp);
      return sdp;
    } catch (error) {
      console.error('Failed to create offer:', error);
      setConnectionState({ 
        status: 'error', 
        error: `Failed to create offer: ${error}` 
      });
      throw error;
    }
  }, [roomId, createOfferMutation, addIceCandidateMutation]);

  // Watch for answer from mobile device
  useEffect(() => {
    if (answerQuery && managerRef.current) {
      const handleAnswer = async () => {
        try {
          await managerRef.current!.setRemoteDescription(answerQuery.sdp);
          console.log('Answer received and set');
          setConnectionState({ status: 'connecting' });
        } catch (error) {
          console.error('Failed to set remote description:', error);
          setConnectionState({ 
            status: 'error', 
            error: `Failed to handle answer: ${error}` 
          });
        }
      };
      handleAnswer();
    }
  }, [answerQuery]);

  // Watch for ICE candidates from mobile device
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

  const getPairingCode = useCallback(() => {
    return roomId; // Use room ID as pairing code
  }, [roomId]);

  const close = useCallback(async () => {
    if (managerRef.current) {
      managerRef.current.close();
      managerRef.current = null;
    }
    await clearSignalingMutation({ roomId });
    setConnectionState({ status: 'disconnected' });
    setReceivedData(null);
    setOfferSdp('');
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
    setConnectionState,
    receivedData,
    setReceivedData,
    offerSdp,
    createOffer,
    getPairingCode,
    close
  };
}
