import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/api";

export interface OrientationData {
  type: 'orientation';
  alpha: number;    // 0-360 (compass)
  beta: number;     // -180 to 180 (front-back tilt)
  gamma: number;    // -90 to 90 (left-right tilt)
  timestamp: number;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onDataReceived: ((data: OrientationData) => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  private isHost: boolean = false;
  private roomId: string = '';
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  setOnDataReceived(callback: (data: OrientationData) => void): void {
    this.onDataReceived = callback;
  }

  setOnConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChange = callback;
  }

  private updateConnectionState(state: ConnectionState): void {
    this.onConnectionStateChange?.(state);
  }

  async createOffer(createOfferMutation: any, addIceCandidateMutation: any): Promise<string> {
    try {
      this.isHost = true;
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      this.setupPeerConnection(addIceCandidateMutation);

      // Create data channel for host
      this.dataChannel = this.peerConnection.createDataChannel('orientation', {
        ordered: true
      });
      this.setupDataChannel();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Store offer in Convex
      await createOfferMutation({
        offerSdp: JSON.stringify(offer),
        roomId: this.roomId
      });

      this.updateConnectionState({ status: 'disconnected' });
      return JSON.stringify(offer);
    } catch (error) {
      this.updateConnectionState({ 
        status: 'error', 
        error: `Failed to create offer: ${error}` 
      });
      throw error;
    }
  }

  async createAnswer(offerSdp: string, createAnswerMutation: any, addIceCandidateMutation: any): Promise<string> {
    try {
      this.isHost = false;
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      this.setupPeerConnection(addIceCandidateMutation);

      const offer = JSON.parse(offerSdp);
      await this.peerConnection.setRemoteDescription(offer);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Store answer in Convex
      await createAnswerMutation({
        answerSdp: JSON.stringify(answer),
        roomId: this.roomId
      });

      this.updateConnectionState({ status: 'connecting' });
      
      // Set timeout to prevent getting stuck in connecting state
      this.connectionTimeout = setTimeout(() => {
        if (this.peerConnection?.connectionState === 'connecting') {
          console.log('Connection timeout - resetting to disconnected');
          this.updateConnectionState({ status: 'disconnected' });
        }
      }, 15000); // 15 second timeout
      
      return JSON.stringify(answer);
    } catch (error) {
      this.updateConnectionState({ 
        status: 'error', 
        error: `Failed to create answer: ${error}` 
      });
      throw error;
    }
  }

  async setRemoteDescription(sdp: string): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection');
    
    const description = JSON.parse(sdp);
    console.log('Setting remote description:', description.type);
    await this.peerConnection.setRemoteDescription(description);
    console.log('Remote description set successfully');
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection');
    await this.peerConnection.addIceCandidate(candidate);
  }

  private setupPeerConnection(addIceCandidateMutation: any): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
          console.log('ICE candidate generated:', event.candidate);
          // Send ICE candidate through Convex
          addIceCandidateMutation({
            candidate: JSON.stringify(event.candidate),
            roomId: this.roomId
          }).catch(console.error);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      
      switch (state) {
        case 'connected':
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          console.log('WebRTC connection established');
          this.updateConnectionState({ status: 'connected' });
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          console.log('WebRTC connection lost');
          this.updateConnectionState({ status: 'disconnected' });
          break;
        case 'connecting':
          console.log('WebRTC connecting...');
          this.updateConnectionState({ status: 'connecting' });
          break;
        case 'new':
          console.log('WebRTC connection new');
          this.updateConnectionState({ status: 'disconnected' });
          break;
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('Data channel received:', event.channel.label);
      const channel = event.channel;
      this.setupDataChannel(channel);
    };
  }

  private setupDataChannel(channel?: RTCDataChannel): void {
    if (channel) {
      this.dataChannel = channel;
    }

    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.updateConnectionState({ status: 'connected' });
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data: OrientationData = JSON.parse(event.data);
        console.log('Received data via WebRTC:', data);
        this.onDataReceived?.(data);
      } catch (error) {
        console.error('Failed to parse orientation data:', error);
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      // Don't immediately set to disconnected - let connection state handle it
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.updateConnectionState({ 
        status: 'error', 
        error: 'Data channel error' 
      });
    };
  }

  sendData(data: OrientationData): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      console.log('Sending data via WebRTC:', data);
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.log('Data channel not ready, state:', this.dataChannel?.readyState);
    }
  }

  close(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.updateConnectionState({ status: 'disconnected' });
  }

  getConnectionState(): ConnectionState {
    if (!this.peerConnection) {
      return { status: 'disconnected' };
    }

    switch (this.peerConnection.connectionState) {
      case 'connected':
        return { status: 'connected' };
      case 'connecting':
        return { status: 'connecting' };
      case 'disconnected':
      case 'failed':
      case 'closed':
        return { status: 'disconnected' };
      default:
        return { status: 'disconnected' };
    }
  }
}
