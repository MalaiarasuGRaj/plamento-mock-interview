"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { evaluateUserAnswer } from "@/ai/flows/evaluate-user-answer";
import type { InterviewSession, InterviewQuestion, InterviewResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mic, MicOff, Bot, Loader2, Info } from "lucide-react";

// Extend window for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'listening' | 'evaluating' | 'next_question'>('idle');
  const [transcript, setTranscript] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem("interviewAceSession");
    if (!storedSession) {
      router.replace("/");
      return;
    }
    const parsedSession: InterviewSession = JSON.parse(storedSession);
    setSession(parsedSession);
    
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript((prev) => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            setError("Microphone access was denied. Please enable it in your browser settings to continue.");
        } else {
            setError("Speech recognition failed. Please check your microphone and try again.");
        }
        setStatus('idle');
      };
    } else {
      setError("Speech Recognition is not supported by your browser. Please use Google Chrome.");
    }

    // Setup Camera and Microphone
    const getMediaPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraReady(true);
        } catch (err) {
            console.error("Media access error:", err);
            setError("Camera and microphone access is required. Please enable it in your browser settings.");
        }
    };
    
    getMediaPermissions();

    return () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, [router]);

  const startListening = () => {
    if (recognitionRef.current && status === 'idle') {
      setTranscript("");
      recognitionRef.current.start();
      setStatus('listening');
    }
  };

  const stopListeningAndEvaluate = async () => {
    if (recognitionRef.current && status === 'listening') {
      recognitionRef.current.stop();
      setStatus('evaluating');
      
      const currentQuestion = session!.questions[currentQuestionIndex];
      try {
        const evaluation = await evaluateUserAnswer({
          question: currentQuestion.question,
          expectedKeywords: currentQuestion.expected_keywords.join(", "),
          answerTranscript: transcript,
        });
        
        const newResult: InterviewResult = {
          question: currentQuestion,
          userAnswer: transcript,
          evaluation: {
            ...evaluation,
            relevance_score: evaluation.relevance_score ?? 0,
            fluency_score: evaluation.fluency_score ?? 0,
            confidence_score: evaluation.confidence_score ?? 0,
            total_score: evaluation.total_score ?? 0,
            feedback: evaluation.feedback ?? "No feedback provided."
          }
        };

        const updatedSession = { ...session!, results: [...session!.results, newResult] };
        setSession(updatedSession);
        localStorage.setItem("interviewAceSession", JSON.stringify(updatedSession));

        moveToNextQuestion();

      } catch (e) {
        console.error("Evaluation failed", e);
        toast({ variant: "destructive", title: "Evaluation Error", description: "Could not evaluate the answer." });
        setStatus('idle');
      }
    }
  };

  const moveToNextQuestion = () => {
    setStatus('next_question');
    setTimeout(() => {
      if (currentQuestionIndex < session!.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setStatus('idle');
      } else {
        router.push("/results");
      }
    }, 3000);
  };
  
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-secondary/50">
      <div className="w-full max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold font-headline text-primary">Interview in Progress</h2>
          <div className="text-right">
            <p className="font-semibold">{session.userDetails.name}</p>
            <p className="text-sm text-muted-foreground">{session.userDetails.jobRole}</p>
          </div>
        </div>

        <Progress value={progress} className="w-full" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                {!isCameraReady ? (
                  <div className="h-full w-full flex items-center justify-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay muted className="h-full w-full object-cover scale-x-[-1]"></video>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg flex flex-col">
             <CardContent className="p-4 flex flex-col items-center justify-center text-center flex-grow">
               <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                 <AvatarImage src="https://placehold.co/128x128.png" data-ai-hint="professional avatar" />
                 <AvatarFallback>AI</AvatarFallback>
               </Avatar>
               <div className="min-h-[100px] flex items-center justify-center">
                <p className="text-lg font-semibold">{currentQuestion.question}</p>
               </div>
             </CardContent>
          </Card>
        </div>

        <div className="text-center">
            {status === 'listening' ? (
                <Button onClick={stopListeningAndEvaluate} size="lg" className="rounded-full w-48 h-16 bg-accent hover:bg-accent/90">
                    <MicOff className="mr-2 h-6 w-6" />
                    I'm Done
                </Button>
            ) : (
                <Button onClick={startListening} size="lg" className="rounded-full w-48 h-16" disabled={status !== 'idle' || !isCameraReady}>
                    {status === 'idle' && <><Mic className="mr-2 h-6 w-6" /> Answer Now</>}
                    {status === 'evaluating' && <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Evaluating...</>}
                    {status === 'next_question' && <><Bot className="mr-2 h-6 w-6" /> Next Question...</>}
                </Button>
            )}
        </div>
        
        <Card className="min-h-[120px]">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">Your Answer:</h3>
            <p className="text-muted-foreground text-sm italic">{transcript || "Your transcribed answer will appear here..."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
