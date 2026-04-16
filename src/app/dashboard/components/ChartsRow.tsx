import React from 'react';
import LeadPipelineChart from './LeadPipelineChart';
import ActivityTrendChart from './ActivityTrendChart';
import CampaignPerformanceChart from './CampaignPerformanceChart';

export default function ChartsRow() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTrendChart />
        <CampaignPerformanceChart />
      </div>
      <LeadPipelineChart />
    </div>
  );
}