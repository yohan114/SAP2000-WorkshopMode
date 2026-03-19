'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Book, 
  Code, 
  Search, 
  ExternalLink, 
  Download, 
  Copy,
  CheckCircle,
  Zap,
  Shield,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs/json')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load API spec:', err);
        setLoading(false);
      });
  }, []);

  const copyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(endpoint);
    toast.success('Endpoint copied to clipboard');
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const downloadSpec = () => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wcp-api-spec.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('API specification downloaded');
  };

  const getEndpointsByTag = () => {
    if (!spec?.paths) return {};
    const tagged: Record<string, Array<{ path: string; method: string; summary: string }>> = {};
    
    Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, details]: [string, any]) => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const tags = details.tags || ['Other'];
          tags.forEach((tag: string) => {
            if (!tagged[tag]) tagged[tag] = [];
            tagged[tag].push({
              path,
              method: method.toUpperCase(),
              summary: details.summary || path,
            });
          });
        }
      });
    });
    
    return tagged;
  };

  const endpointsByTag = getEndpointsByTag();
  const filteredTags = Object.keys(endpointsByTag).filter(tag =>
    searchTerm ? 
      tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpointsByTag[tag].some(e => 
        e.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.summary.toLowerCase().includes(searchTerm.toLowerCase())
      )
      : true
  );

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-100 text-emerald-700';
      case 'POST': return 'bg-blue-100 text-blue-700';
      case 'PUT': return 'bg-amber-100 text-amber-700';
      case 'PATCH': return 'bg-purple-100 text-purple-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Book className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">WCP API Documentation</h1>
                <p className="text-sm text-slate-500">Workshop Control Platform REST API Reference</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={downloadSpec}>
                <Download className="h-4 w-4 mr-2" />
                Download Spec
              </Button>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <a href="/api/docs/json" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  OpenAPI JSON
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search endpoints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">API Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total Endpoints</span>
                  <Badge variant="secondary">{Object.values(endpointsByTag).flat().length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Categories</span>
                  <Badge variant="secondary">{Object.keys(endpointsByTag).length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Version</span>
                  <Badge variant="secondary">{spec?.info?.version || '1.0.0'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Rate Limiting: 100 req/min
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Bearer Token Auth
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Database className="h-4 w-4 text-blue-500" />
                  Pagination Support
                </div>
              </CardContent>
            </Card>

            {/* Tag Navigation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {filteredTags.map(tag => (
                  <a
                    key={tag}
                    href={`#${tag.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-50 text-sm"
                  >
                    <span>{tag}</span>
                    <Badge variant="outline" className="text-xs">
                      {endpointsByTag[tag].length}
                    </Badge>
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
                  <p className="text-slate-500 mt-4">Loading API documentation...</p>
                </CardContent>
              </Card>
            ) : (
              filteredTags.map(tag => (
                <Card key={tag} id={tag.toLowerCase().replace(/\s+/g, '-')}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-emerald-600" />
                          {tag}
                        </CardTitle>
                        <CardDescription>
                          {spec?.tags?.find((t: any) => t.name === tag)?.description || `${endpointsByTag[tag].length} endpoints`}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{endpointsByTag[tag].length} endpoints</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {endpointsByTag[tag]
                        .filter(e => 
                          !searchTerm || 
                          e.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.summary.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((endpoint, idx) => (
                        <div
                          key={`${endpoint.method}-${endpoint.path}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 group"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={getMethodColor(endpoint.method)}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm font-mono text-slate-700">
                              {endpoint.path}
                            </code>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500 hidden md:block max-w-xs truncate">
                              {endpoint.summary}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyEndpoint(`${endpoint.method} ${endpoint.path}`)}
                            >
                              {copiedEndpoint === `${endpoint.method} ${endpoint.path}` ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Authentication Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">
                  Most API endpoints require authentication using a Bearer token in the Authorization header.
                </p>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-slate-100">
                    Authorization: Bearer &lt;your-token-here&gt;
                  </code>
                </div>
                <p className="text-sm text-slate-500">
                  Obtain your token from the authentication endpoint or your account settings.
                </p>
              </CardContent>
            </Card>

            {/* Error Responses */}
            <Card>
              <CardHeader>
                <CardTitle>Error Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { code: 400, desc: 'Bad Request - Invalid parameters' },
                    { code: 401, desc: 'Unauthorized - Authentication required' },
                    { code: 403, desc: 'Forbidden - Insufficient permissions' },
                    { code: 404, desc: 'Not Found - Resource does not exist' },
                    { code: 422, desc: 'Unprocessable Entity - Validation failed' },
                    { code: 429, desc: 'Too Many Requests - Rate limit exceeded' },
                    { code: 500, desc: 'Internal Server Error' },
                  ].map(({ code, desc }) => (
                    <div key={code} className="flex items-center gap-3 text-sm">
                      <Badge variant={code >= 500 ? 'destructive' : code >= 400 ? 'secondary' : 'default'}>
                        {code}
                      </Badge>
                      <span className="text-slate-600">{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
