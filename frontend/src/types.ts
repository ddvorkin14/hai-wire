export interface ChannelInfo {
  id: string;
  name: string;
}

export interface Category {
  Key: string;
  Name: string;
  Description: string;
}

export interface ProcessedMessage {
  ID: number;
  MessageTS: string;
  ChannelID: string;
  Author: string;
  Category: string;
  Confidence: number;
  Summary: string;
  Reasoning: string;
  Routed: boolean;
  CreatedAt: string;
}

export interface TriageEvent {
  message_ts: string;
  author: string;
  category: string;
  confidence: number;
  summary: string;
  routed: boolean;
}

export type View = 'wizard' | 'feed' | 'settings' | 'log';
