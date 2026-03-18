'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sprint } from './types';

interface SprintRoadmapProps {
  sprints: Sprint[];
  currentSprint?: number;
}

export function SprintRoadmap({ sprints, currentSprint = 0 }: SprintRoadmapProps) {
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Foundation': return 'bg-blue-500';
      case 'Core Operations': return 'bg-emerald-500';
      case 'Procurement': return 'bg-amber-500';
      case 'Enterprise Ready': return 'bg-purple-500';
      default: return 'bg-slate-500';
    }
  };

  const getPhaseBgColor = (phase: string) => {
    switch (phase) {
      case 'Foundation': return 'bg-blue-50 border-blue-200';
      case 'Core Operations': return 'bg-emerald-50 border-emerald-200';
      case 'Procurement': return 'bg-amber-50 border-amber-200';
      case 'Enterprise Ready': return 'bg-purple-50 border-purple-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getPriorityColor = (priority: Sprint['priority']) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-700';
      case 'P1': return 'bg-amber-100 text-amber-700';
      case 'P2': return 'bg-blue-100 text-blue-700';
    }
  };

  const getSprintStatus = (sprint: Sprint) => {
    if (currentSprint > sprint.id) return 'completed';
    if (currentSprint === sprint.id) return 'in-progress';
    return 'upcoming';
  };

  const phases = ['Foundation', 'Core Operations', 'Procurement', 'Enterprise Ready'];
  
  const overallProgress = currentSprint > 0 
    ? Math.round(((currentSprint - 1) / sprints.length) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>🎯</span> Sprint Roadmap
            </CardTitle>
            <CardDescription>16 Sprints • 2 Weeks Each</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{overallProgress}%</div>
            <div className="text-xs text-slate-500">Complete</div>
          </div>
        </div>
        <Progress value={overallProgress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        {phases.map((phase) => {
          const phaseSprints = sprints.filter(s => s.phase === phase);
          
          return (
            <div key={phase} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${getPhaseColor(phase)}`} />
                <h4 className="font-semibold text-slate-700">{phase}</h4>
                <span className="text-xs text-slate-400">
                  (Sprints {phaseSprints[0]?.id}-{phaseSprints[phaseSprints.length - 1]?.id})
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {phaseSprints.map((sprint) => {
                  const status = getSprintStatus(sprint);
                  
                  return (
                    <div
                      key={sprint.id}
                      className={`rounded-lg border p-3 transition-all ${
                        status === 'in-progress' 
                          ? 'ring-2 ring-blue-400 ring-offset-2' 
                          : status === 'completed'
                          ? 'opacity-60'
                          : ''
                      } ${getPhaseBgColor(sprint.phase)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">{sprint.name}</span>
                          <Badge className={`text-xs ${getPriorityColor(sprint.priority)}`}>
                            {sprint.priority}
                          </Badge>
                        </div>
                        {status === 'in-progress' && (
                          <Badge className="bg-blue-500 text-white animate-pulse">
                            Current
                          </Badge>
                        )}
                        {status === 'completed' && (
                          <Badge className="bg-emerald-500 text-white">
                            ✓
                          </Badge>
                        )}
                      </div>
                      
                      <h5 className="font-medium text-slate-800 mb-1">{sprint.focus}</h5>
                      <p className="text-xs text-slate-500 mb-2">Weeks {sprint.weekStart}-{sprint.weekEnd}</p>
                      
                      <div className="space-y-1">
                        {sprint.deliverables.slice(0, 3).map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="text-slate-600">{d}</span>
                          </div>
                        ))}
                        {sprint.deliverables.length > 3 && (
                          <span className="text-xs text-slate-400">+{sprint.deliverables.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
