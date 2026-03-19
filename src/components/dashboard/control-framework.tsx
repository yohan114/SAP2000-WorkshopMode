'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuardRule, WebSocketEvent, BackgroundJob } from './types';

interface ControlFrameworkProps {
  guardRules: GuardRule[];
  wsEvents: WebSocketEvent[];
  bgJobs: BackgroundJob[];
}

export function ControlFramework({ guardRules, wsEvents, bgJobs }: ControlFrameworkProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔐</span> Control Framework
        </CardTitle>
        <CardDescription>State Guards, Real-time Events & Background Jobs</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="guards" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="guards" className="text-sm">
              Guards ({guardRules.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="text-sm">
              Events ({wsEvents.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-sm">
              Jobs ({bgJobs.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="guards" className="mt-0">
            <div className="space-y-2">
              {guardRules.map((guard, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-red-50 border-red-100"
                >
                  <div className="flex-1">
                    <code className="text-sm font-mono text-red-700">{guard.name}</code>
                    <p className="text-xs text-slate-600 mt-1">{guard.rule}</p>
                  </div>
                  <Badge variant="outline" className="bg-white text-xs">
                    {guard.enforcement}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="events" className="mt-0">
            <div className="space-y-2">
              {wsEvents.map((event, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg border bg-blue-50 border-blue-100"
                >
                  <code className="text-sm font-mono text-blue-700">{event.event}</code>
                  <div className="flex gap-4 mt-2 text-xs text-slate-600">
                    <span><strong>Subscribers:</strong> {event.subscribers}</span>
                    <span><strong>Action:</strong> {event.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="jobs" className="mt-0">
            <div className="space-y-2">
              {bgJobs.map((job, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 border-amber-100"
                >
                  <div className="flex-1">
                    <code className="text-sm font-mono text-amber-700">{job.name}</code>
                    <p className="text-xs text-slate-600 mt-1">{job.purpose}</p>
                  </div>
                  <Badge variant="outline" className="bg-white text-xs">
                    {job.schedule}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
