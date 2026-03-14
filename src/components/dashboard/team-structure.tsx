'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TeamMember } from './types';

interface TeamStructureProps {
  team: TeamMember[];
}

export function TeamStructure({ team }: TeamStructureProps) {
  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'Tech Lead': return 'bg-purple-500';
      case 'Backend Developers': return 'bg-emerald-500';
      case 'Frontend Developers': return 'bg-blue-500';
      case 'DevOps Engineer': return 'bg-orange-500';
      case 'QA Engineer': return 'bg-pink-500';
      case 'Product Owner': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getInitials = (role: string) => {
    return role.split(' ').map(w => w[0]).join('').slice(0, 2);
  };

  const totalCount = team.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>👥</span> Team Structure
        </CardTitle>
        <CardDescription>{totalCount} Team Members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="relative">
                <Avatar className={`h-10 w-10 ${getAvatarColor(member.role)}`}>
                  <AvatarFallback className="text-white font-medium">
                    {getInitials(member.role)}
                  </AvatarFallback>
                </Avatar>
                {member.count > 1 && (
                  <span className="absolute -top-1 -right-1 bg-slate-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {member.count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{member.role}</h4>
                <p className="text-xs text-slate-500 truncate">{member.responsibility}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Sprint Ceremonies */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Sprint Ceremonies</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-700">Sprint Planning</div>
              <div className="text-xs text-blue-500">Every 2 weeks • 2h</div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <div className="font-medium text-emerald-700">Daily Standup</div>
              <div className="text-xs text-emerald-500">Daily • 15min</div>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <div className="font-medium text-amber-700">Sprint Review</div>
              <div className="text-xs text-amber-500">Every 2 weeks • 1h</div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-700">Retrospective</div>
              <div className="text-xs text-purple-500">Every 2 weeks • 1h</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
