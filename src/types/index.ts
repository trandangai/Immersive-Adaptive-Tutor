export type MasteryLevel = 'beginner' | 'intermediate' | 'advanced';
export type PacingStatus = 'optimal' | 'needs_reinforcement';
export type TutorPersonaTone = 'socratic' | 'encouraging' | 'challenging';

export interface Checkpoint {
  id: string;
  title: string;
  description: string;
  keyQuestion: string;
  estimatedMinutes?: number;
  status?: 'pending' | 'active' | 'mastered';
}

export interface Roadmap {
  topicTitle: string;
  subjectArea: string;
  baselineDifficulty: MasteryLevel;
  summary: string;
  checkpoints: Checkpoint[];
}

export interface SocraticMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  audioUrl?: string;
  keyTakeaway?: string;
}

export interface Flashcard {
  id: string;
  userId?: string;
  sessionId?: string;
  concept: string;
  front: string;
  back: string;
  difficulty: MasteryLevel;
  mastered: boolean;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  topicTitle: string;
  subjectArea: string;
  masteryLevel: MasteryLevel;
  comprehensionScore: number;
  pacingStatus: PacingStatus;
  summaryNotes: string;
  topicsMastered: string[];
  topicsNeedingReview: string[];
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  iconLink?: string;
  size?: string;
}

export interface LearnerProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  totalSessions: number;
  topicsMasteredCount: number;
  createdAt: string;
  updatedAt: string;
}
