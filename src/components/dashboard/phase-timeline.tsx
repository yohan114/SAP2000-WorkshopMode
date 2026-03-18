'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Phase } from './types';

interface PhaseTimelineProps {
  phases: Phase[];
  currentWeek?: number;
}

export function PhaseTimeline({ phases, currentWeek = 0 }: PhaseTimelineProps) {
  const getPhaseProgress = (phase: Phase) => {
    if (currentWeek < phase.startWeek) return 0;
    if (currentWeek >= phase.endWeek) return 100;
    const totalWeeks = phase.endWeek - phase.startWeek + 1;
    const completedWeeks = currentWeek - phase.startWeek + 1;
    return Math.round((completedWeeks / totalWeeks) * 100);
  };

  const getPhaseStatus = (phase: Phase) => {
    if (currentWeek < phase.startWeek) return 'upcoming';
    if (currentWeek > phase.endWeek) return 'completed';
    return 'in-progress';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📅</span> Implementation Timeline
        </CardTitle>
        <CardDescription>4-Phase Delivery Approach • 32 Weeks Total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase);
              const progress = getPhaseProgress(phase);
              
              return (
                <div key={phase.id} className="relative pl-10 pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div 
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                      status === 'completed' 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : status === 'in-progress'
                        ? 'bg-white border-blue-500 animate-pulse'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                  
                  <div className={`rounded-lg border p-4 ${
                    status === 'in-progress' ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: phase.color }}>
                          Phase {index + 1}: {phase.name}
                        </h3>
                        <p className="text-sm text-slate-500">{phase.weeks}</p>
                      </div>
                      <Badge 
                        variant={status === 'completed' ? 'default' : status === 'in-progress' ? 'secondary' : 'outline'}
                        className={status === 'completed' ? 'bg-emerald-500' : status === 'in-progress' ? 'bg-blue-500 text-white' : ''}
                      >
                        {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">{phase.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {phase.deliverables.map((d, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {d}
                        </Badge>
                      ))}
                    </div>
                    
                    {status === 'in-progress' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Week markers */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Week 1</span>
              <span>Week 12 (MVP)</span>
              <span>Week 32 (Go-Live)</span>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full mt-2">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="absolute h-full"
                  style={{
                    left: `${((phase.startWeek - 1) / 32) * 100}%`,
                    width: `${((phase.endWeek - phase.startWeek + 1) / 32) * 100}%`,
                    backgroundColor: phase.color,
                    opacity: 0.7,
                    borderRadius: index === 0 ? '9999px 0 0 9999px' : index === 3 ? '0 9999px 9999px 0' : 0,
                  }}
                />
              ))}
              {/* MVP marker */}
              <div 
                className="absolute w-1 h-5 bg-amber-400 -top-1"
                style={{ left: `${(12 / 32) * 100}%` }}
              />
              <div 
                className="absolute text-xs text-amber-600 -top-6"
                style={{ left: `${(12 / 32) * 100}%`, transform: 'translateX(-50%)' }}
              >
                MVP
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
