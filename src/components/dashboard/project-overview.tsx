'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectOverview } from './types';

interface ProjectOverviewCardProps {
  overview: ProjectOverview;
}

export function ProjectOverviewCard({ overview }: ProjectOverviewCardProps) {
  return (
    <Card className="border-t-4 border-t-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{overview.name}</CardTitle>
            <CardDescription className="text-base mt-1">
              Super Master Plan v{overview.version}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-sm px-3 py-1">
            {overview.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-500">Timeline</p>
            <p className="text-2xl font-bold text-slate-900">{overview.totalWeeks} weeks</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-500">Sprints</p>
            <p className="text-2xl font-bold text-slate-900">{overview.totalSprints}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-600">MVP Delivery</p>
            <p className="text-2xl font-bold text-amber-700">Week {overview.mvpWeek}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-500">Team Size</p>
            <p className="text-2xl font-bold text-slate-900">{overview.teamSize}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
