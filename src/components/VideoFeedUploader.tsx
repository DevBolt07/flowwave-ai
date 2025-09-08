import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Play, Square, Trash2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoFeedUploaderProps {
  intersectionId: string;
  onUploadComplete?: () => void;
}

interface VideoFeed {
  id: string;
  lane_no: number;
  feed_url: string;
  is_active: boolean;
  direction: string;
}

export const VideoFeedUploader = ({ intersectionId, onUploadComplete }: VideoFeedUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [feedType, setFeedType] = useState<'upload' | 'rtsp'>('upload');
  const [rtspUrl, setRtspUrl] = useState('');
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const lanes = [
    { no: 1, direction: 'North' },
    { no: 2, direction: 'South' },
    { no: 3, direction: 'East' },
    { no: 4, direction: 'West' },
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File",
        description: "Please select a video file (mp4, avi, mov, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // For demo purposes, we'll store the video as a blob URL
      // In production, you'd upload to a proper storage service
      const videoUrl = URL.createObjectURL(file);
      
      // Save video feed to Supabase
      const { error } = await supabase
        .from('video_feeds')
        .upsert({
          intersection_id: intersectionId,
          lane_no: selectedLane,
          feed_url: videoUrl,
          is_active: true,
        }, {
          onConflict: 'intersection_id,lane_no'
        });

      if (error) throw error;

      toast({
        title: "Video Uploaded",
        description: `Video feed uploaded for Lane ${selectedLane} (${lanes.find(l => l.no === selectedLane)?.direction})`,
      });

      onUploadComplete?.();
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video feed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRtspSubmit = async () => {
    if (!rtspUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid RTSP URL",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { error } = await supabase
        .from('video_feeds')
        .upsert({
          intersection_id: intersectionId,
          lane_no: selectedLane,
          feed_url: rtspUrl,
          is_active: true,
        }, {
          onConflict: 'intersection_id,lane_no'
        });

      if (error) throw error;

      toast({
        title: "RTSP Feed Added",
        description: `RTSP feed configured for Lane ${selectedLane} (${lanes.find(l => l.no === selectedLane)?.direction})`,
      });

      setRtspUrl('');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('RTSP configuration error:', error);
      toast({
        title: "Configuration Failed",
        description: "Failed to configure RTSP feed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleFeedStatus = async (feedId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('video_feeds')
        .update({ is_active: !currentStatus })
        .eq('id', feedId);

      if (error) throw error;

      toast({
        title: !currentStatus ? "Feed Activated" : "Feed Deactivated",
        description: `Video feed ${!currentStatus ? 'enabled' : 'disabled'}`,
      });

      onUploadComplete?.();
      
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update feed status",
        variant: "destructive",
      });
    }
  };

  const deleteFeed = async (feedId: string) => {
    try {
      const { error } = await supabase
        .from('video_feeds')
        .delete()
        .eq('id', feedId);

      if (error) throw error;

      toast({
        title: "Feed Deleted",
        description: "Video feed removed successfully",
      });

      onUploadComplete?.();
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete video feed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Video Feeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lane Selection */}
          <div>
            <Label htmlFor="lane-select">Select Lane</Label>
            <Select value={selectedLane.toString()} onValueChange={(value) => setSelectedLane(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lanes.map((lane) => (
                  <SelectItem key={lane.no} value={lane.no.toString()}>
                    Lane {lane.no} - {lane.direction}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feed Type Selection */}
          <div>
            <Label>Feed Type</Label>
            <div className="flex space-x-2 mt-2">
              <Button
                variant={feedType === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedType('upload')}
              >
                Upload Video
              </Button>
              <Button
                variant={feedType === 'rtsp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedType('rtsp')}
              >
                RTSP Stream
              </Button>
            </div>
          </div>

          {/* Upload Video */}
          {feedType === 'upload' && (
            <div className="space-y-3">
              <Label htmlFor="video-upload">Upload Video File</Label>
              <div className="flex space-x-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Browse'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: MP4, AVI, MOV, MKV. Videos will loop automatically.
              </p>
            </div>
          )}

          {/* RTSP URL */}
          {feedType === 'rtsp' && (
            <div className="space-y-3">
              <Label htmlFor="rtsp-url">RTSP Stream URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="rtsp-url"
                  placeholder="rtsp://192.168.1.100:8554/stream"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleRtspSubmit}
                  disabled={uploading || !rtspUrl.trim()}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add Stream
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the RTSP URL of your live camera feed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Feeds */}
      <Card>
        <CardHeader>
          <CardTitle>Current Video Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lanes.map((lane) => {
              const feed = videoFeeds.find(f => f.lane_no === lane.no);
              return (
                <div key={lane.no} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">Lane {lane.no} - {lane.direction}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feed ? 'Feed configured' : 'No feed'}
                      </p>
                    </div>
                    {feed && (
                      <div className="flex items-center space-x-2">
                        <Badge variant={feed.is_active ? 'default' : 'secondary'}>
                          {feed.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {feed && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFeedStatus(feed.id, feed.is_active)}
                      >
                        {feed.is_active ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteFeed(feed.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};