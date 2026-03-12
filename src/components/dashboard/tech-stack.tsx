'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TechItem {
  name: string;
  purpose: string;
  icon: string;
}

interface TechStackData {
  frontend: TechItem[];
  backend: TechItem[];
  infrastructure: TechItem[];
}

interface TechStackProps {
  techStack: TechStackData;
}

function TechGrid({ items }: { items: TechItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((tech, index) => (
        <div 
          key={index}
          className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span className="text-2xl">{tech.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{tech.name}</h4>
            <p className="text-xs text-slate-500 truncate">{tech.purpose}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TechStack({ techStack }: TechStackProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🛠️</span> Technology Stack
        </CardTitle>
        <CardDescription>Modern, Production-Ready Technologies</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="frontend" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="frontend" className="text-sm">
              Frontend ({techStack.frontend.length})
            </TabsTrigger>
            <TabsTrigger value="backend" className="text-sm">
              Backend ({techStack.backend.length})
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="text-sm">
              Infrastructure ({techStack.infrastructure.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="frontend" className="mt-0">
            <TechGrid items={techStack.frontend} />
          </TabsContent>
          
          <TabsContent value="backend" className="mt-0">
            <TechGrid items={techStack.backend} />
          </TabsContent>
          
          <TabsContent value="infrastructure" className="mt-0">
            <TechGrid items={techStack.infrastructure} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
