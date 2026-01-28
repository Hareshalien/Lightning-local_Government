
export interface Report {
  id: string;
  address: string;
  dateTime: string;
  description: string;
  imageBase64: string;
  latitude: number;
  longitude: number;
  timestampString?: string; // For the formatted string provided in prompt
}

export type ViewMode = 'map' | 'list' | 'solution';

export interface AnalysisResult {
  strategicOverview: string;
  prioritizedReports: SolutionItem[];
}

export interface SolutionItem {
  reportId: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  displayTitle: string;
  actionPlan: string;
  recommendedResource: string;
  justification: string;
  isRelevant: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: Date;
}

export interface VerificationResult {
  matchesDescription: boolean;
  isRelevant: boolean; // New: Checks if it is a gov matter
  findings: string[]; // New: List of observations instead of single string
}
