'use client'

import { Button } from "@/components/ui/button";
import { CloudUpload } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { useCallback, useState } from 'react';

interface VideoAnalysisFeedback {
    hookRating: number;
    hookExplanation: string;
    engagementRating: number;
    engagementExplanation: string;
  }

interface BeforeUploadedProps {
    file: File | null;
    setFile: (file: File) => void;
    setPhase: (phase: 'upload' | 'review') => void;
    setFeedback: (feedback: VideoAnalysisFeedback) => void;
  }

  export default function BeforeUploaded({ file, setFile, setPhase, setFeedback }: BeforeUploadedProps) {
    // Uploading state
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {

    // Change the phase to review, which will stop rendering this
    setUploading(true);

    console.log('Uploaded files:', acceptedFiles);

    const selectedFile = acceptedFiles[0];

    setFile(selectedFile);

    const formData = new FormData();
    formData.append('file', selectedFile);
  
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  
    if (!res.ok) {
      console.error('Upload failed');
      return;
    }
  
    const result = await res.json();
    console.log(result);
    setFeedback(result);
    console.log('Upload success:', result);
    setUploading(false);
    setPhase('review');



  }, [setFile, setPhase]);

  const options = {
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.png']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024,
    disabled: uploading,
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(options);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        {...getRootProps()}
        className={`w-1/3 p-10 border-2 rounded-xl bg-gray-100 flex flex-col items-center justify-center transition cursor-pointer hover:border-dashed ${
          isDragActive ? 'bg-gray-200' : ''
        }` 
      }
      >
        <input {...getInputProps()} />

        <Button variant="default" className="text-lg h-10" size="lg" disabled={uploading}>
          <div className="flex items-center cursor-pointer">
          <CloudUpload className="w-5 h-5 mr-2" />
          Upload a File
          </div>
        </Button>
      </div>


    </div>
  );
}