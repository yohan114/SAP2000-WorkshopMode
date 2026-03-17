'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KPI } from './types';

interface KPIMetricsProps {
  technicalKPIs: KPI[];
  businessKPIs: KPI[];
}

function KPICard({ kpi, icon }: { kpi: KPI; icon: string }) {
  return (
    <div className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-slate-400">{kpi.id}</span>
      </div>
      <h4 className="font-medium text-sm text-slate-700 mb-1">{kpi.name}</h4>
      <p className="text-xl font-bold text-slate-900">{kpi.target}</p>
    </div>
  );
}

function getKPIIcon(name: string, type: 'technical' | 'business'): string {
  if (type === 'technical') {
    if (name.includes('Response')) return '⚡';
    if (name.includes('Load')) return '📱';
    if (name.includes('Sync')) return '🔄';
    if (name.includes('Coverage')) return '📊';
    if (name.includes('Security')) return '🔒';
    return '📈';
  } else {
    if (name.includes('Fraud')) return '🛡️';
    if (name.includes('GRN')) return '📦';
    if (name.includes('SLA')) return '⏱️';
    if (name.includes('Material')) return '🔧';
    if (name.includes('Adoption')) return '👥';
    return '📈';
  }
}

export function KPIMetrics({ technicalKPIs, businessKPIs }: KPIMetricsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Technical KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>⚙️</span> Technical KPIs
          </CardTitle>
          <CardDescription>Performance & Quality Targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {technicalKPIs.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} icon={getKPIIcon(kpi.name, 'technical')} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>💼</span> Business KPIs
          </CardTitle>
          <CardDescription>Operational Excellence Targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {businessKPIs.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} icon={getKPIIcon(kpi.name, 'business')} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
