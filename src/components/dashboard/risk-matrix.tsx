'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Risk } from './types';

interface RiskMatrixProps {
  risks: Risk[];
}

export function RiskMatrix({ risks }: RiskMatrixProps) {
  const getLikelihoodPosition = (likelihood: Risk['likelihood']) => {
    switch (likelihood) {
      case 'Low': return 1;
      case 'Medium': return 2;
      case 'High': return 3;
    }
  };

  const getImpactPosition = (impact: Risk['impact']) => {
    switch (impact) {
      case 'Low': return 1;
      case 'Medium': return 2;
      case 'High': return 3;
      case 'Critical': return 4;
    }
  };

  const getRiskLevel = (likelihood: Risk['likelihood'], impact: Risk['impact']) => {
    const l = getLikelihoodPosition(likelihood);
    const i = getImpactPosition(impact);
    const score = l * i;
    
    if (score >= 6) return { level: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
    if (score >= 4) return { level: 'High', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' };
    if (score >= 2) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
  };

  const getCategoryIcon = (category: Risk['category']) => {
    switch (category) {
      case 'technical': return '⚙️';
      case 'operational': return '🏭';
      case 'security': return '🔒';
      case 'organizational': return '👥';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>⚠️</span> Risk Register
        </CardTitle>
        <CardDescription>Risk Assessment Matrix • {risks.length} Identified Risks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Matrix Grid */}
          <div className="lg:col-span-1">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Risk Matrix</h4>
            <div className="relative">
              {/* Y-axis label */}
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500 whitespace-nowrap">
                Likelihood
              </div>
              
              <div className="grid grid-cols-4 gap-1 text-xs">
                {/* Header row */}
                <div></div>
                <div className="text-center text-slate-500 p-1">Low</div>
                <div className="text-center text-slate-500 p-1">Medium</div>
                <div className="text-center text-slate-500 p-1">High</div>
                
                {/* Critical row */}
                <div className="text-right text-slate-500 p-1">Critical</div>
                <div className="bg-yellow-200 rounded p-1 min-h-8"></div>
                <div className="bg-orange-300 rounded p-1 min-h-8"></div>
                <div className="bg-red-400 rounded p-1 min-h-8"></div>
                
                {/* High row */}
                <div className="text-right text-slate-500 p-1">High</div>
                <div className="bg-green-200 rounded p-1 min-h-8"></div>
                <div className="bg-orange-200 rounded p-1 min-h-8"></div>
                <div className="bg-red-300 rounded p-1 min-h-8 flex items-center justify-center">
                  <span className="text-xs font-bold text-red-800">2</span>
                </div>
                
                {/* Medium row */}
                <div className="text-right text-slate-500 p-1">Medium</div>
                <div className="bg-green-100 rounded p-1 min-h-8"></div>
                <div className="bg-yellow-100 rounded p-1 min-h-8 flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-800">4</span>
                </div>
                <div className="bg-orange-200 rounded p-1 min-h-8 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-800">3</span>
                </div>
                
                {/* Low row */}
                <div className="text-right text-slate-500 p-1">Low</div>
                <div className="bg-green-50 rounded p-1 min-h-8"></div>
                <div className="bg-green-100 rounded p-1 min-h-8 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-800">1</span>
                </div>
                <div className="bg-yellow-100 rounded p-1 min-h-8"></div>
              </div>
              
              {/* X-axis label */}
              <div className="text-center text-xs text-slate-500 mt-2">Impact →</div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-slate-600">Critical Risk</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-orange-300 rounded" />
                <span className="text-slate-600">High Risk</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-yellow-200 rounded" />
                <span className="text-slate-600">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-200 rounded" />
                <span className="text-slate-600">Low Risk</span>
              </div>
            </div>
          </div>

          {/* Risk List */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Risk Details</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {risks.map((risk) => {
                const riskLevel = getRiskLevel(risk.likelihood, risk.impact);
                
                return (
                  <div 
                    key={risk.id}
                    className={`p-3 rounded-lg border ${riskLevel.bgColor} border-slate-200`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(risk.category)}</span>
                        <span className="font-medium text-sm">{risk.name}</span>
                      </div>
                      <Badge className={`${riskLevel.textColor} bg-white`} variant="outline">
                        {riskLevel.level}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 mb-2">
                      <span>Likelihood: <strong>{risk.likelihood}</strong></span>
                      <span>Impact: <strong>{risk.impact}</strong></span>
                    </div>
                    <p className="text-xs text-slate-600 bg-white/50 p-2 rounded">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
