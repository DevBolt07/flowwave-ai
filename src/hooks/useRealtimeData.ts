import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export interface Lane {
  id: string;
  intersection_id: string;
  lane_no: number;
  direction: string;
  vehicle_count: number;
  current_count: number;
  gst_time: number;
  signal_state: 'red' | 'green' | 'amber';
  has_emergency: boolean;
  updated_at: string;
}

export interface VideoFeed {
  id: string;
  intersection_id: string;
  lane_no: number;
  feed_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Emergency {
  id: string;
  driver_id?: string;
  vehicle_id?: string;
  route: Json;
  source_latitude?: number;
  source_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  status: 'active' | 'completed' | 'cancelled';
  priority_level: number;
  eta_minutes?: number;
  created_at: string;
}

export interface TrafficLog {
  id: string;
  intersection_id?: string;
  emergency_id?: string;
  event_type: string;
  message: string;
  metadata: Json;
  created_at: string;
}

export interface Intersection {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  roi_polygons: Json;
  config: Json;
}

export const useRealtimeData = () => {
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load intersections
      const { data: intersectionsData, error: intersectionsError } = await supabase
        .from('intersections')
        .select('*')
        .order('name');

      if (intersectionsError) throw intersectionsError;
      setIntersections((intersectionsData || []) as Intersection[]);

      // Load lanes
      const { data: lanesData, error: lanesError } = await supabase
        .from('lanes')
        .select('*')
        .order('intersection_id, lane_no');

      if (lanesError) throw lanesError;
      setLanes(lanesData || []);

      // Load video feeds
      const { data: videoFeedsData, error: videoFeedsError } = await supabase
        .from('video_feeds')
        .select('*')
        .eq('is_active', true)
        .order('intersection_id, lane_no');

      if (videoFeedsError) throw videoFeedsError;
      setVideoFeeds(videoFeedsData || []);

      // Load active emergencies
      const { data: emergenciesData, error: emergenciesError } = await supabase
        .from('emergencies')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (emergenciesError) throw emergenciesError;
      setEmergencies((emergenciesData || []) as Emergency[]);

      // Load recent logs
      const { data: logsData, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Data Loading Error",
        description: "Failed to load traffic data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Setup realtime subscriptions
  useEffect(() => {
    // Subscribe to lanes changes
    const lanesChannel = supabase
      .channel('lanes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lanes'
        },
        (payload) => {
          console.log('Lanes update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setLanes(prev => [...prev, payload.new as Lane]);
          } else if (payload.eventType === 'UPDATE') {
            setLanes(prev => prev.map(lane => 
              lane.id === payload.new.id ? payload.new as Lane : lane
            ));
          } else if (payload.eventType === 'DELETE') {
            setLanes(prev => prev.filter(lane => lane.id !== payload.old.id));
          }
          
          // Show toast for significant changes
          if (payload.eventType === 'UPDATE' && payload.new.signal_state !== payload.old.signal_state) {
            toast({
              title: "Signal Updated",
              description: `${payload.new.direction} lane signal changed to ${payload.new.signal_state}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to video feeds changes
    const videoFeedsChannel = supabase
      .channel('video-feeds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_feeds'
        },
        (payload) => {
          console.log('Video feeds update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setVideoFeeds(prev => [...prev, payload.new as VideoFeed]);
          } else if (payload.eventType === 'UPDATE') {
            setVideoFeeds(prev => prev.map(feed => 
              feed.id === payload.new.id ? payload.new as VideoFeed : feed
            ));
          } else if (payload.eventType === 'DELETE') {
            setVideoFeeds(prev => prev.filter(feed => feed.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to emergencies changes
    const emergenciesChannel = supabase
      .channel('emergencies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergencies'
        },
        (payload) => {
          console.log('Emergencies update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setEmergencies(prev => [...prev, payload.new as Emergency]);
            toast({
              title: "Emergency Alert",
              description: "New emergency vehicle detected",
              variant: "destructive",
            });
          } else if (payload.eventType === 'UPDATE') {
            setEmergencies(prev => prev.map(emergency => 
              emergency.id === payload.new.id ? payload.new as Emergency : emergency
            ));
          } else if (payload.eventType === 'DELETE') {
            setEmergencies(prev => prev.filter(emergency => emergency.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to logs changes
    const logsChannel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs'
        },
        (payload) => {
          console.log('New log:', payload);
          setLogs(prev => [payload.new as TrafficLog, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lanesChannel);
      supabase.removeChannel(videoFeedsChannel);
      supabase.removeChannel(emergenciesChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [toast]);

  // Utility functions
  const updateLane = useCallback(async (laneId: string, updates: Partial<Lane>) => {
    try {
      const { error } = await supabase
        .from('lanes')
        .update(updates)
        .eq('id', laneId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating lane:', err);
      toast({
        title: "Update Error",
        description: "Failed to update lane data",
        variant: "destructive",
      });
    }
  }, [toast]);

  const createEmergency = useCallback(async (emergency: {
    driver_id?: string;
    vehicle_id?: string;
    route?: Json;
    source_latitude?: number;
    source_longitude?: number;
    destination_latitude?: number;
    destination_longitude?: number;
    status?: 'active' | 'completed' | 'cancelled';
    priority_level?: number;
    eta_minutes?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .insert([emergency])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating emergency:', err);
      toast({
        title: "Emergency Error",
        description: "Failed to create emergency record",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateEmergency = useCallback(async (emergencyId: string, updates: {
    driver_id?: string;
    vehicle_id?: string;
    route?: Json;
    source_latitude?: number;
    source_longitude?: number;
    destination_latitude?: number;
    destination_longitude?: number;
    status?: 'active' | 'completed' | 'cancelled';
    priority_level?: number;
    eta_minutes?: number;
  }) => {
    try {
      const { error } = await supabase
        .from('emergencies')
        .update(updates)
        .eq('id', emergencyId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating emergency:', err);
      toast({
        title: "Update Error",
        description: "Failed to update emergency data",
        variant: "destructive",
      });
    }
  }, [toast]);

  const createLog = useCallback(async (log: {
    intersection_id?: string;
    emergency_id?: string;
    event_type: string;
    message: string;
    metadata?: Json;
  }) => {
    try {
      const { error } = await supabase
        .from('logs')
        .insert([log]);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating log:', err);
    }
  }, []);

  const getLanesByIntersection = useCallback((intersectionId: string) => {
    return lanes.filter(lane => lane.intersection_id === intersectionId);
  }, [lanes]);

  const getActiveEmergencies = useCallback(() => {
    return emergencies.filter(emergency => emergency.status === 'active');
  }, [emergencies]);

  // Video feed management functions
  const createVideoFeed = useCallback(async (intersectionId: string, laneNo: number, feedUrl: string) => {
    try {
      const { data, error } = await supabase
        .from('video_feeds')
        .insert([{ intersection_id: intersectionId, lane_no: laneNo, feed_url: feedUrl }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating video feed:', err);
      toast({
        title: "Feed Error",
        description: "Failed to create video feed",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateVideoFeed = useCallback(async (feedId: string, updates: Partial<VideoFeed>) => {
    try {
      const { error } = await supabase
        .from('video_feeds')
        .update(updates)
        .eq('id', feedId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating video feed:', err);
      toast({
        title: "Update Error",
        description: "Failed to update video feed",
        variant: "destructive",
      });
    }
  }, [toast]);

  const deleteVideoFeed = useCallback(async (feedId: string) => {
    try {
      const { error } = await supabase
        .from('video_feeds')
        .delete()
        .eq('id', feedId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting video feed:', err);
      toast({
        title: "Delete Error",
        description: "Failed to delete video feed",
        variant: "destructive",
      });
    }
  }, [toast]);

  const getVideoFeedsByIntersection = useCallback((intersectionId: string) => {
    return videoFeeds.filter(feed => feed.intersection_id === intersectionId && feed.is_active);
  }, [videoFeeds]);

  return {
    // Data
    intersections,
    lanes,
    videoFeeds,
    emergencies,
    logs,
    loading,
    error,
    
    // Actions
    updateLane,
    createEmergency,
    updateEmergency,
    createLog,
    createVideoFeed,
    updateVideoFeed,
    deleteVideoFeed,
    
    // Utilities
    getLanesByIntersection,
    getVideoFeedsByIntersection,
    getActiveEmergencies,
    refetch: loadInitialData,
  };
};