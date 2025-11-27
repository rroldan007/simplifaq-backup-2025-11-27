import React from 'react';
import { Card } from '../ui/Card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-slate-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-5 bg-slate-200 rounded w-96 animate-pulse"></div>
      </div>

      {/* Financial summary skeleton */}
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-slate-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-lg animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Status cards */}
        <div className="h-5 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="p-4 border-l-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-slate-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-12 animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent invoices skeleton */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-slate-200 rounded w-24 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-slate-200 rounded w-40 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="h-6 bg-slate-200 rounded w-32 mb-6 animate-pulse"></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-slate-200 rounded w-32 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="h-6 bg-slate-200 rounded w-32 mb-6 animate-pulse"></div>
            
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-slate-200 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-slate-200 rounded w-32 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-slate-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}