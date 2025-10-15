import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [feedType, setFeedType] = useState<'webcam' | 'upload' | 'url' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

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

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Stop webcam if running
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsRecording(false);
      
      // Set feed type first to show video element
      setFeedType('upload');
      
      // Then set up the video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        const url = URL.createObjectURL(file);
        videoRef.current.src = url;
        
        // Wait for video to load before playing
        videoRef.current.onloadeddata = () => {
          videoRef.current?.play().catch(err => {
            console.log('Auto-play prevented:', err);
          });
        };
        
        videoRef.current.load();
      }
      
      toast({
        title: "Video Uploaded",
        description: `Video file loaded for ${direction} lane`,
      });
    }
  }, [stream, direction, toast]);

  const handleUrlSubmit = useCallback(() => {
    if (streamUrl && videoRef.current) {
      // Stop webcam if running
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsRecording(false);
      
      // Clear srcObject and set src for URL
      videoRef.current.srcObject = null;
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      setFeedType('url');
      setShowUrlInput(false);
      
      toast({
        title: "Stream URL Set",
        description: `Stream loaded for ${direction} lane`,
      });
    }
  }, [streamUrl, stream, direction, toast]);

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
          {feedType ? (
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
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No video feed active</p>
            </div>
          )}
        </div>

        {/* Controls */}
        {!readOnly && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
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
              
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                size="sm"
                variant={showUrlInput ? 'secondary' : 'outline'}
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs"
              >
                <Link2 className="w-3 h-3 mr-1" />
                URL
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};