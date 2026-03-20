// WCP Master Plan Data Types

export interface Phase {
  id: string;
  name: string;
  weeks: string;
  startWeek: number;
  endWeek: number;
  color: string;
  description: string;
  deliverables: string[];
  exitCriteria: string;
}

export interface Sprint {
  id: number;
  name: string;
  focus: string;
  weekStart: number;
  weekEnd: number;
  phase: string;
  deliverables: string[];
  exitCriteria: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  priority: 'P0' | 'P1' | 'P2';
}

export interface Module {
  id: string;
  name: string;
  dependsOn: string[];
  blocks: string[];
  priority: 'P0' | 'P1' | 'P2';
  phase: number;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming';
}

export interface Risk {
  id: string;
  name: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigation: string;
  category: 'technical' | 'operational' | 'security' | 'organizational';
}

export interface KPI {
  id: string;
  name: string;
  target: string;
  category: 'technical' | 'business';
  unit: string;
}

export interface TeamMember {
  role: string;
  count: number;
  responsibility: string;
}

export interface GuardRule {
  name: string;
  rule: string;
  enforcement: string;
}

export interface WebSocketEvent {
  event: string;
  subscribers: string;
  action: string;
}

export interface BackgroundJob {
  name: string;
  schedule: string;
  purpose: string;
}

// Project Overview
export interface ProjectOverview {
  name: string;
  version: string;
  totalWeeks: number;
  totalSprints: number;
  mvpWeek: number;
  teamSize: string;
  status: string;
}
