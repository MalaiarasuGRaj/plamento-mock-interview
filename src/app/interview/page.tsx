"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { evaluateUserAnswer } from "@/ai/flows/evaluate-user-answer";
import { speechToText } from "@/ai/flows/speech-to-text";
import type { InterviewSession, InterviewResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mic, MicOff, Bot, Loader2, Info, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const storedSession = localStorage.getItem("interviewAceSession");
    if (!storedSession) {
      router.replace("/");
      return;
    }
    const parsedSession: InterviewSession = JSON.parse(storedSession);
    setSession(parsedSession);

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
        setIsCameraReady(false);
      }
    };

    getMediaPermissions();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [router]);

  const startListening = () => {
    if (mediaStreamRef.current && status === 'idle' && isCameraReady) {
      setTranscript("");
      audioChunksRef.current = [];
      try {
        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = stopListeningAndEvaluate;
        mediaRecorderRef.current.start();
        setStatus('listening');
      } catch (err) {
        console.error("MediaRecorder error:", err);
        setError("Could not start recording. Please check your browser compatibility.");
      }
    }
  };
  
  const finishRecording = () => {
    if (mediaRecorderRef.current && status === 'listening') {
       mediaRecorderRef.current.stop();
    }
  };

  const stopListeningAndEvaluate = async () => {
      setStatus('evaluating');
      if (audioChunksRef.current.length === 0) {
        toast({
          variant: "destructive",
          title: "No answer detected",
          description: "It seems we couldn't hear you. Please try answering again.",
        });
        setStatus('idle');
        return;
      }
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      try {
        // Convert blob to base64 data URI
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            
            // 1. Speech to Text
            const sttResult = await speechToText(base64Audio);
            if (!sttResult.transcript) {
                throw new Error(sttResult.error || "Speech-to-text failed.");
            }
            const answerToEvaluate = sttResult.transcript;
            setTranscript(answerToEvaluate);

            // 2. Evaluate Answer
            const currentQuestion = session!.questions[currentQuestionIndex];
            const evaluation = await evaluateUserAnswer({
              question: currentQuestion.question,
              expectedKeywords: currentQuestion.expected_keywords.join(", "),
              answerTranscript: answerToEvaluate,
            });

            const newResult: InterviewResult = {
              question: currentQuestion,
              userAnswer: answerToEvaluate,
              evaluation: {
                ...evaluation,
                relevance_score: evaluation.relevance_score ?? 0,
                fluency_score: evaluation.fluency_score ?? 0,
                confidence_score: evaluation.confidence_score ?? 0,
                total_score: evaluation.total_score ?? 0,
                feedback: evaluation.feedback ?? "No feedback provided."
              }
            };

            setSession(prev => {
              if (!prev) return null;
              const updatedSession = { ...prev, results: [...prev.results, newResult] };
              localStorage.setItem("interviewAceSession", JSON.stringify(updatedSession));
              return updatedSession;
            });

            moveToNextQuestion();
        };

        reader.onerror = () => {
            throw new Error("Failed to read audio data.");
        };

      } catch (e) {
        console.error("Evaluation pipeline failed", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during evaluation.";
        toast({ variant: "destructive", title: "Evaluation Error", description: errorMessage });
        setStatus('idle');
      }
  };

  const moveToNextQuestion = () => {
    setStatus('next_question');
    setTimeout(() => {
      if (currentQuestionIndex < session!.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTranscript("");
        setStatus('idle');
      } else {
        router.push("/results");
      }
    }, 3000);
  };
  
  const handleEndInterview = () => {
    if (session && session.results.length > 0) {
      router.push("/results");
    } else {
      localStorage.removeItem("interviewAceSession");
      router.push("/");
    }
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{session.userDetails.name}</p>
              <p className="text-sm text-muted-foreground">{session.userDetails.jobRole}</p>
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <LogOut className="mr-2 h-4 w-4" /> End
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to end the interview?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {session.results.length > 0 
                      ? "You will be taken to the results page for the questions you have completed."
                      : "Your progress will not be saved, and you will be returned to the home page."
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndInterview}>
                    End Interview
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video ref={videoRef} autoPlay muted className="h-full w-full object-cover scale-x-[-1]"></video>
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg flex flex-col items-center justify-center">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center flex-grow">
              <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
                <AvatarImage src="https://firebasestorage.googleapis.com/v0/b/interview-ace-dev/o/interviewer.jpg?alt=media&token=1c6a2e4b-6142-4217-91a5-927361a350a4" data-ai-hint="professional avatar" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <p className="text-lg font-semibold">Virtual Interviewer</p>
            </CardContent>
          </Card>
        </div>

         <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex-grow">
              <p className="font-semibold text-sm mb-1">Question {currentQuestionIndex + 1}:</p>
              <p className="text-lg">{currentQuestion.question}</p>
            </div>
            <div className="flex-shrink-0">
                {status === 'listening' ? (
                    <Button onClick={finishRecording} size="icon" className="rounded-full w-16 h-16 bg-accent hover:bg-accent/90">
                        <MicOff className="h-8 w-8" />
                        <span className="sr-only">I'm Done</span>
                    </Button>
                ) : (
                    <Button onClick={startListening} size="icon" className="rounded-full w-16 h-16" disabled={status !== 'idle' || !isCameraReady}>
                        {status === 'idle' && <Mic className="h-8 w-8" />}
                        {status === 'evaluating' && <Loader2 className="h-8 w-8 animate-spin" />}
                        {status === 'next_question' && <Bot className="h-8 w-8" />}
                        <span className="sr-only">
                           {status === 'idle' && 'Answer Now'}
                           {status === 'evaluating' && 'Evaluating...'}
                           {status === 'next_question' && 'Next Question...'}
                        </span>
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>

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
