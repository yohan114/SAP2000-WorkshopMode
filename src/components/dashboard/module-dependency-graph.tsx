'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Module } from './types';

interface ModuleDependencyGraphProps {
  modules: Module[];
}

export function ModuleDependencyGraph({ modules }: ModuleDependencyGraphProps) {
  const getPriorityColor = (priority: Module['priority']) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-700 border-red-200';
      case 'P1': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'P2': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPhaseColor = (phase: number) => {
    switch (phase) {
      case 1: return 'border-l-blue-500';
      case 2: return 'border-l-emerald-500';
      case 3: return 'border-l-amber-500';
      case 4: return 'border-l-purple-500';
      default: return 'border-l-slate-300';
    }
  };

  const moduleMap = new Map(modules.map(m => [m.id, m]));
  
  // Critical path modules (P0)
  const criticalModules = modules.filter(m => m.priority === 'P0');
  const phase1Modules = modules.filter(m => m.phase === 1);
  const phase2Modules = modules.filter(m => m.phase === 2);
  const phase3Modules = modules.filter(m => m.phase === 3);
  const phase4Modules = modules.filter(m => m.phase === 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔗</span> Module Dependencies
        </CardTitle>
        <CardDescription>Critical Path Analysis • Priority-based Dependencies</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor('P0')}>P0</Badge>
            <span className="text-sm text-slate-500">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor('P1')}>P1</Badge>
            <span className="text-sm text-slate-500">High</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor('P2')}>P2</Badge>
            <span className="text-sm text-slate-500">Medium</span>
          </div>
        </div>

        {/* Critical Path */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Critical Path
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {criticalModules.map((module, index) => (
              <div key={module.id} className="flex items-center gap-2">
                <div 
                  className={`px-3 py-1.5 rounded-lg border-2 border-l-4 ${getPhaseColor(module.phase)} bg-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                >
                  {module.name}
                </div>
                {index < criticalModules.length - 1 && (
                  <span className="text-slate-300">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phase Groups */}
        <div className="space-y-4">
          {[phase1Modules, phase2Modules, phase3Modules, phase4Modules].map((phaseModules, phaseIndex) => (
            phaseModules.length > 0 && (
              <div key={phaseIndex} className="border rounded-lg p-4 bg-slate-50/50">
                <h4 className="text-sm font-semibold text-slate-600 mb-3">
                  Phase {phaseIndex + 1} Modules
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {phaseModules.map((module) => (
                    <div 
                      key={module.id}
                      className={`p-3 rounded-lg border-l-4 ${getPhaseColor(module.phase)} bg-white shadow-sm hover:shadow transition-shadow`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{module.name}</span>
                        <Badge className={getPriorityColor(module.priority)} variant="outline">
                          {module.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{module.description}</p>
                      {module.dependsOn.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <span>Depends on:</span>
                          {module.dependsOn.map(depId => {
                            const dep = moduleMap.get(depId);
                            return dep ? (
                              <span key={depId} className="px-1.5 py-0.5 bg-slate-100 rounded">
                                {dep.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
