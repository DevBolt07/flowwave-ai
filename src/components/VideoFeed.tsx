import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Link2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Sample demo videos that loop by default
const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
];

interface VideoFeedProps {
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
  readOnly?: boolean;
}

export const VideoFeed = ({
  intersectionId,
  direction,
  readOnly = false,
}: VideoFeedProps) => {
  const [feedType, setFeedType] = useState<'demo' | 'webcam' | 'upload' | 'url'>('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Get demo video based on direction
  const getDemoVideoUrl = () => {
    const directionMap = { 'North': 0, 'South': 1, 'East': 2, 'West': 3 };
    return DEMO_VIDEOS[directionMap[direction]];
  };

  // Load demo video on mount
  useEffect(() => {
    if (videoRef.current && feedType === 'demo') {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        },
        audio: false,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setFeedType('webcam');
      setIsRecording(true);
      
      toast({
        title: "Webcam Connected",
        description: `Live feed active for ${direction} lane`,
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
      toast({
        title: "Webcam Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [direction, toast]);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setFeedType('demo');

    // Return to demo video
    if (videoRef.current) {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
  }, [stream, direction]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
      videoRef.current.load();
      setFeedType('upload');
      
      toast({
        title: "Video Uploaded",
        description: `Video file loaded for ${direction} lane`,
      });
    }
  }, [direction, toast]);

  const handleUrlSubmit = useCallback(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      setFeedType('url');
      setShowUrlInput(false);
      
      toast({
        title: "Stream URL Set",
        description: `Stream loaded for ${direction} lane`,
      });
    }
  }, [streamUrl, direction, toast]);

  const resetToDemo = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setFeedType('demo');
    setStreamUrl('');
    setShowUrlInput(false);
    
    if (videoRef.current) {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
    
    toast({
      title: "Demo Video Restored",
      description: `Showing demo video for ${direction} lane`,
    });
  }, [stream, direction, toast]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{direction} Lane</CardTitle>
          <Badge variant="default" className="text-xs">
            Live Feed
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Video Feed */}
        <div className="relative aspect-video bg-muted rounded overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            onLoadedData={() => {
              // Auto-play and loop videos
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
              }
            }}
          />
          
          {/* Demo badge */}
          {feedType === 'demo' && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                <Video className="w-3 h-3 mr-1" />
                Demo Video
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        {!readOnly && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <Button
                size="sm"
                variant={feedType === 'webcam' ? 'destructive' : 'outline'}
                onClick={feedType === 'webcam' ? stopWebcam : startWebcam}
                className="text-xs"
              >
                <Camera className="w-3 h-3 mr-1" />
                {feedType === 'webcam' ? 'Stop' : 'Cam'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload
              </Button>

              <Button
                size="sm"
                variant={showUrlInput ? 'secondary' : 'outline'}
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs"
              >
                <Link2 className="w-3 h-3 mr-1" />
                URL
              </Button>

              <Button
                size="sm"
                variant={feedType === 'demo' ? 'default' : 'outline'}
                onClick={resetToDemo}
                className="text-xs"
                disabled={feedType === 'demo'}
              >
                <Video className="w-3 h-3 mr-1" />
                Demo
              </Button>
            </div>

            {/* URL Input */}
            {showUrlInput && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="stream-url" className="text-xs">Stream URL or Video URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="stream-url"
                    type="text"
                    placeholder="https://example.com/stream.m3u8"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleUrlSubmit}
                    disabled={!streamUrl}
                    className="text-xs h-8"
                  >
                    Load
                  </Button>
                </div>
              </div>
            )}
            
            <Input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};