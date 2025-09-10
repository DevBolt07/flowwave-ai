import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoFeed } from '@/components/VideoFeed';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface DetectionStats {
  totalVehicles: number;
  activeFeeds: number;
  detectionRate: number;
  averageConfidence: number;
}

export const TrafficDetectionDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<DetectionStats>({
    totalVehicles: 0,
    activeFeeds: 4,
    detectionRate: 0,
    averageConfidence: 0
  });
  
  const { intersections, lanes, getLanesByIntersection } = useRealtimeData();
  
  // Use the first intersection for demo, or create mock data
  const demoIntersection = intersections[0] || {
    id: 'demo-intersection',
    name: 'Demo Traffic Intersection',
    latitude: 40.7128,
    longitude: -74.0060
  };

  const demoLanes = getLanesByIntersection(demoIntersection.id).slice(0, 4);
  
  // Sample video sources (using webcam as fallback)
  const sampleVideos = [
    { lane: 1, direction: 'North' as const, name: 'Lane 1 - North Bound' },
    { lane: 2, direction: 'South' as const, name: 'Lane 2 - South Bound' },
    { lane: 3, direction: 'East' as const, name: 'Lane 3 - East Bound' },
    { lane: 4, direction: 'West' as const, name: 'Lane 4 - West Bound' }
  ];

  const handleDetectionUpdate = (laneNo: number, result: any) => {
    console.log(`Detection update for lane ${laneNo}:`, result);
    
    // Update stats based on detection results
    setStats(prevStats => ({
      totalVehicles: result.total_vehicles || prevStats.totalVehicles,
      activeFeeds: 4,
      detectionRate: result.processing_time_ms ? Math.round(1000 / result.processing_time_ms * 100) / 100 : prevStats.detectionRate,
      averageConfidence: result.confidence ? Math.round(result.confidence * 100) : prevStats.averageConfidence
    }));
  };

  const toggleDetection = () => {
    setIsRunning(!isRunning);
  };

  const resetDemo = () => {
    setIsRunning(false);
    setStats({
      totalVehicles: 0,
      activeFeeds: 4,
      detectionRate: 0,
      averageConfidence: 0
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Traffic Detection Demo System
            <div className="flex gap-2">
              <Button
                onClick={toggleDetection}
                variant={isRunning ? "destructive" : "default"}
                size="sm"
              >
                {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isRunning ? 'Stop Detection' : 'Start Detection'}
              </Button>
              <Button onClick={resetDemo} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalVehicles}</div>
              <div className="text-sm text-muted-foreground">Total Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.activeFeeds}</div>
              <div className="text-sm text-muted-foreground">Active Feeds</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.detectionRate}</div>
              <div className="text-sm text-muted-foreground">Detection/sec</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.averageConfidence}%</div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Detection Active" : "Detection Stopped"}
            </Badge>
            <Badge variant="outline">Model: YOLOv8</Badge>
            <Badge variant="outline">Demo Mode</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Video Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sampleVideos.map((video) => (
          <Card key={video.lane}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {video.name}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Lane {video.lane}
                  </Badge>
                  {demoLanes[video.lane - 1] && (
                    <Badge 
                      variant={demoLanes[video.lane - 1].signal_state === 'green' ? 'default' : 
                              demoLanes[video.lane - 1].signal_state === 'amber' ? 'secondary' : 'destructive'}
                    >
                      {demoLanes[video.lane - 1].signal_state?.toUpperCase() || 'RED'}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VideoFeed
                intersectionId={demoIntersection.id}
                direction={video.direction}
                onDetectionUpdate={(result) => handleDetectionUpdate(video.lane, result)}
                detectionModel="yolov8"
                isActive={isRunning}
              />
              
              {demoLanes[video.lane - 1] && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{demoLanes[video.lane - 1].vehicle_count || 0}</div>
                    <div className="text-muted-foreground">Vehicles</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{demoLanes[video.lane - 1].gst_time || 0}s</div>
                    <div className="text-muted-foreground">GST Time</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">
                      {demoLanes[video.lane - 1].has_emergency ? '⚠️' : '✅'}
                    </div>
                    <div className="text-muted-foreground">Status</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Click "Start Detection" to begin AI-powered vehicle detection on all 4 lanes</p>
          <p>2. Allow camera access when prompted (using webcam as traffic feed simulation)</p>
          <p>3. Watch real-time detection results with bounding boxes and vehicle counts</p>
          <p>4. Vehicle data automatically updates traffic signal timing (GST calculation)</p>
          <p>5. Emergency scenarios are randomly simulated during detection</p>
          <p className="font-medium text-foreground mt-4">
            Note: This demo uses webcam feeds to simulate traffic cameras. In production, 
            these would be replaced with actual CCTV camera feeds from traffic intersections.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};