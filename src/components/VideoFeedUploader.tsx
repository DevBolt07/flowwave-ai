import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Link, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useRealtimeData } from "@/hooks/useRealtimeData";

interface VideoFeedUploaderProps {
  intersectionId: string;
  intersectionName: string;
}

export const VideoFeedUploader = ({ intersectionId, intersectionName }: VideoFeedUploaderProps) => {
  const [feedUrl, setFeedUrl] = useState("");
  const [selectedLane, setSelectedLane] = useState<string>("");
  const [uploadType, setUploadType] = useState<"file" | "rtsp">("file");
  const [uploading, setUploading] = useState(false);
  
  const { toast } = useToast();
  const { 
    videoFeeds, 
    createVideoFeed, 
    updateVideoFeed, 
    deleteVideoFeed,
    getVideoFeedsByIntersection 
  } = useRealtimeData();
  
  const intersectionFeeds = getVideoFeedsByIntersection(intersectionId);
  const laneDirections = ['North', 'East', 'South', 'West'];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedLane) return;

    setUploading(true);
    try {
      // In a real implementation, you'd upload to storage and get the URL
      // For now, we'll simulate with a local URL
      const videoUrl = URL.createObjectURL(file);
      
      const laneNo = laneDirections.indexOf(selectedLane) + 1;
      await createVideoFeed(intersectionId, laneNo, videoUrl);
      
      toast({
        title: "Feed Uploaded",
        description: `Video feed for ${selectedLane} lane uploaded successfully`,
      });
      
      setSelectedLane("");
      event.target.value = "";
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload video feed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRtspAdd = async () => {
    if (!feedUrl || !selectedLane) return;

    setUploading(true);
    try {
      const laneNo = laneDirections.indexOf(selectedLane) + 1;
      await createVideoFeed(intersectionId, laneNo, feedUrl);
      
      toast({
        title: "RTSP Feed Added",
        description: `RTSP feed for ${selectedLane} lane added successfully`,
      });
      
      setFeedUrl("");
      setSelectedLane("");
    } catch (error) {
      toast({
        title: "Add Failed",
        description: "Failed to add RTSP feed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleFeedStatus = async (feedId: string, isActive: boolean) => {
    await updateVideoFeed(feedId, { is_active: !isActive });
    toast({
      title: isActive ? "Feed Deactivated" : "Feed Activated",
      description: `Video feed ${isActive ? "stopped" : "started"}`,
    });
  };

  const removeFeed = async (feedId: string) => {
    await deleteVideoFeed(feedId);
    toast({
      title: "Feed Removed",
      description: "Video feed removed successfully",
    });
  };

  const getDirectionFromLaneNo = (laneNo: number) => {
    return laneDirections[laneNo - 1] || `Lane ${laneNo}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>{intersectionName} - Video Feed Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant={uploadType === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("file")}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={uploadType === "rtsp" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("rtsp")}
            >
              <Link className="w-4 h-4 mr-2" />
              RTSP URL
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lane Direction</Label>
              <Select value={selectedLane} onValueChange={setSelectedLane}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lane direction" />
                </SelectTrigger>
                <SelectContent>
                  {laneDirections.map((direction) => (
                    <SelectItem key={direction} value={direction}>
                      {direction} Lane
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {uploadType === "file" ? (
                <>
                  <Label>Video File</Label>
                  <Input
                    type="file"
                    accept="video/mp4,video/avi,video/mov"
                    onChange={handleFileUpload}
                    disabled={!selectedLane || uploading}
                  />
                </>
              ) : (
                <>
                  <Label>RTSP URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="rtsp://camera-ip:554/stream"
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                    />
                    <Button 
                      onClick={handleRtspAdd}
                      disabled={!feedUrl || !selectedLane || uploading}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Current Feeds */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Video Feeds</h3>
          {intersectionFeeds.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No video feeds configured for this intersection
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {intersectionFeeds.map((feed) => (
                <Card key={feed.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span className="font-medium">
                        {getDirectionFromLaneNo(feed.lane_no)}
                      </span>
                      <Badge variant={feed.is_active ? "secondary" : "outline"}>
                        {feed.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFeedStatus(feed.id, feed.is_active)}
                      >
                        {feed.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFeed(feed.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {feed.feed_url}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};