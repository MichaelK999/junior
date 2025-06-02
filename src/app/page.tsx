'use client'

import { Button } from "@/components/ui/button";
import { CloudUpload } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { useCallback, useState, useEffect } from 'react';
import BeforeUploaded from "@/components/main_components/BeforeUploaded";
import AfterUploaded from "@/components/main_components/AfterUploaded";


// Feedback type
interface VideoAnalysisFeedback {
  hookRating: number;
  hookExplanation: string;
  engagementRating: number;
  engagementExplanation: string;
}


export default function Home() {
  const [phase, setPhase] = useState<'upload' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<VideoAnalysisFeedback | null>(null);




  return (
    <>
        {phase === 'upload' ? (
        <BeforeUploaded file={file} setPhase={setPhase} setFile={setFile} setFeedback={setFeedback}/>) 
        : 
          (
            <AfterUploaded feedback={feedback}/>)
          }
    </>


  );




}
