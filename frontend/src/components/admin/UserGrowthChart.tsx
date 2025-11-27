import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface UserGrowthChartProps {
  data: Array<{ month: string; users: number }>;
  loading?: boolean;
}

export function UserGrowthChart({ data, loading }: UserGrowthChartProps) {
  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Croissance des utilisateurs</h3>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="md" />
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Croissance des utilisateurs</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Aucune donnée disponible</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxUsers = Math.max(...data.map(d => d.users));
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  // Create SVG path for the line
  const createPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    
    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${path} ${command} ${point.x} ${point.y}`;
    }, '');
    
    return pathData;
  };

  // Create points for the chart
  const points = data.map((item, index) => ({
    x: padding + (index * (chartWidth - 2 * padding)) / (data.length - 1),
    y: chartHeight - padding - ((item.users / maxUsers) * (chartHeight - 2 * padding)),
  }));

  const linePath = createPath(points);

  // Create area path (for gradient fill)
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x} ${chartHeight - padding}` +
    ` L ${padding} ${chartHeight - padding} Z`;

  // Format month labels
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  // Calculate growth rate
  const firstValue = data[0]?.users || 0;
  const lastValue = data[data.length - 1]?.users || 0;
  const growthRate = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Croissance des utilisateurs</h3>
            <p className="text-sm text-gray-500">Nouveaux utilisateurs par mois</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900">
              {lastValue.toLocaleString('fr-FR')}
            </p>
            <p className={`text-sm font-medium ${
              growthRate >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="relative">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="userGrowthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
              return (
                <g key={index}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray={index === 0 ? "none" : "2,2"}
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {Math.round(maxUsers * ratio).toLocaleString('fr-FR')}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#userGrowthGradient)"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 transition-all cursor-pointer"
                />
                
                {/* Tooltip on hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  <rect
                    x={point.x - 30}
                    y={point.y - 35}
                    width="60"
                    height="25"
                    rx="4"
                    fill="rgba(0, 0, 0, 0.8)"
                  />
                  <text
                    x={point.x}
                    y={point.y - 18}
                    textAnchor="middle"
                    className="text-xs fill-white"
                  >
                    {data[index].users.toLocaleString('fr-FR')}
                  </text>
                </g>
              </g>
            ))}

            {/* X-axis labels */}
            {data.map((item, index) => {
              const x = padding + (index * (chartWidth - 2 * padding)) / (data.length - 1);
              return (
                <text
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {formatMonth(item.month)}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Nouveaux utilisateurs</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">
              Total: {data.reduce((sum, item) => sum + item.users, 0).toLocaleString('fr-FR')} utilisateurs
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}