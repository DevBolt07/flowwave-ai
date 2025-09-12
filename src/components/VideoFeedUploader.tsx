import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoFeedUploaderProps {
  intersectionId: string;
  onUploadComplete?: () => void;
}

export const VideoFeedUploader = ({ intersectionId, onUploadComplete }: VideoFeedUploaderProps) => {
  const [saving, setSaving] = useState(false);
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState('');
  const { toast } = useToast();

  const lanes = [
    { no: 1, direction: 'North' },
    { no: 2, direction: 'South' },
    { no: 3, direction: 'East' },
    { no: 4, direction: 'West' },
  ];

  const handleUrlSubmit = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
        new URL(videoUrl);
    } catch (_) {
        toast({
            title: "Invalid URL",
            description: "The provided URL is not valid.",
            variant: "destructive",
        });
        return;
    }


    setSaving(true);

    try {
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
        title: "Video Feed Saved",
        description: `Video feed URL configured for Lane ${selectedLane} (${lanes.find(l => l.no === selectedLane)?.direction})`
      });

      setVideoUrl('');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('URL configuration error:', error);
      toast({
        title: "Configuration Failed",
        description: (error as Error).message || "Failed to configure video feed URL",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Video Feed</CardTitle>
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

          {/* Video URL Input */}
          <div className="space-y-3">
              <Label htmlFor="video-url">Video URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://... or rtsp://..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={saving}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleUrlSubmit}
                  disabled={saving || !videoUrl.trim()}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a video URL (e.g., YouTube, .mp4) or an RTSP stream URL.
              </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
