
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, Video, AlertCircle } from 'lucide-react';
import { VideoFeed } from '@/components/VideoFeed';

interface LaneWindowProps {
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
}

export const LaneWindow = ({ intersectionId, direction }: LaneWindowProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    if (!file.type.startsWith('video/')) {
      const err = 'Invalid file type. Please upload a video file.';
      setError(err);
      toast({ title: 'Upload Error', description: err, variant: 'destructive' });
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    console.log(`Starting upload for ${direction} lane...`);

    const fileName = `${intersectionId}_${direction}_${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      const err = `Upload failed: ${uploadError.message}`;
      console.error('Upload Error:', err);
      setError(err);
      toast({ title: 'Upload Failed', description: 'Check console for more details.', variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    console.log(`Upload successful for ${direction}. Retrieving public URL...`);
    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);

    if (!publicUrl) {
        const err = 'Could not retrieve public URL for the uploaded video.';
        console.error('URL Error:', err);
        setError(err);
        toast({ title: 'Error', description: err, variant: 'destructive' });
        setIsUploading(false);
        return;
    }
    
    setVideoUrl(publicUrl);
    setIsUploading(false);
    toast({ title: 'Upload Complete', description: `Video for ${direction} lane is now active.` });

  }, [intersectionId, direction, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop, 
      multiple: false, 
      noClick: isUploading 
  });

  const renderContent = () => {
    if (videoUrl) {
      return (
        <VideoFeed
          videoUrl={videoUrl}
          intersectionId={intersectionId}
          direction={direction}
          onDetectionUpdate={(data) => console.log('Detection Update:', data)} // Placeholder
          detectionModel="yolov8n.pt"
          isActive={true}
          handleManualOverride={() => {}} // Placeholder
        />
      );
    }

    if (isUploading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="mb-2">Uploading...</p>
          <Progress value={uploadProgress} className="w-3/4" />
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                <AlertCircle className="w-10 h-10 mb-2" />
                <h4 className="font-semibold">Upload Failed</h4>
                <p className="text-xs mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-4">Try Again</Button>
            </div>
        );
    }

    return (
      <div {...getRootProps()} className={`flex flex-col items-center justify-center h-full text-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/60'}`}>
        <input {...getInputProps()} />
        <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="font-semibold">Drag & Drop or Click</p>
        <p className="text-sm text-muted-foreground">to upload video for the {direction} lane.</p>
        <Button variant="outline" size="sm" className="mt-4 pointer-events-none">Upload from PC</Button>
      </div>
    );
  };

  return (
    <div className="w-full aspect-video bg-muted/20 rounded-lg overflow-hidden">
      {renderContent()}
    </div>
  );
};
