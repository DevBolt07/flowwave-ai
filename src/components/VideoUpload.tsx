
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File, X } from 'lucide-react';

interface VideoUploadProps {
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
  onUploadComplete: () => void;
}

export const VideoUpload = ({ intersectionId, direction, onUploadComplete }: VideoUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const videoFile = acceptedFiles[0];
      if (videoFile.type.startsWith('video/')) {
        setFile(videoFile);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid video file.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] }
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    
    const fileName = `${intersectionId}_${direction}_${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      toast({
        title: 'Upload Failed',
        description: uploadError.message,
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('video_feeds').insert({
      intersection_id: intersectionId,
      lane_no: getLaneNumber(direction),
      video_url: publicUrl,
      is_active: true,
      direction: direction,
    });

    if (dbError) {
        toast({
            title: 'Database Error',
            description: `Failed to save video feed to database: ${dbError.message}`,
            variant: 'destructive',
        });
        setIsUploading(false);
        return;
    }

    toast({
      title: 'Upload Successful',
      description: `${direction} lane video has been updated.`,
    });
    
    setIsUploading(false);
    onUploadComplete();
  };

  const getLaneNumber = (dir: 'North' | 'South' | 'East' | 'West') => {
    switch (dir) {
      case 'North': return 1;
      case 'South': return 2;
      case 'East': return 3;
      case 'West': return 4;
      default: return 0;
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg text-center">
      {file ? (
        <div className="flex flex-col items-center">
            <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                <File className="h-6 w-6 text-gray-500 mr-2" />
                <span className="font-mono text-sm">{file.name}</span>
                <button onClick={removeFile} className="ml-2 text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <Button onClick={handleUpload} disabled={isUploading} className="mt-4">
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </Button>
            {isUploading && <Progress value={progress} className="w-full mt-2" />}
        </div>
      ) : (
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive ? 'Drop the video here ...' : "Drag 'n' drop a video, or click to select"}
          </p>
        </div>
      )}
    </div>
  );
};
