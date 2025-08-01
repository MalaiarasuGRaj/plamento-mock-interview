
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
import { Mic, MicOff, Bot, Loader2, Info, LogOut, Timer, Check, Send } from "lucide-react";
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

const QUESTION_TIMER_SECONDS = 30;

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'finished'>('idle');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<InterviewSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  const evaluateInBackground = async (audioBlob: Blob, questionIndex: number) => {
    try {
      const isLastQuestion = questionIndex >= (sessionRef.current?.questions.length ?? 0) - 1;
       if (isLastQuestion) {
        setStatus('finished');
        router.push('/results');
      }

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const sttResult = await speechToText(base64Audio);
        if (sttResult.error || !sttResult.transcript) {
           const errorMessage = sttResult.error || "Speech-to-text failed.";
           throw new Error(errorMessage.includes('429') 
            ? "You have exceeded the API rate limit. Please wait a moment before trying again." 
            : errorMessage);
        }
        const answerTranscript = sttResult.transcript;

        const currentSession = sessionRef.current;
        if (!currentSession) return;
        
        const currentQuestion = currentSession.questions[questionIndex];
        const evaluation = await evaluateUserAnswer({
          question: currentQuestion.question,
          expectedKeywords: currentQuestion.expected_keywords.join(", "),
          answerTranscript: answerTranscript,
        });

        const newResult: InterviewResult = {
          question: currentQuestion,
          userAnswer: answerTranscript,
          evaluation: {
            ...evaluation,
            relevance_score: evaluation.relevance_score ?? 0,
            fluency_score: evaluation.fluency_score ?? 0,
            confidence_score: evaluation.confidence_score ?? 0,
            total_score: evaluation.total_score ?? 0,
            feedback: evaluation.feedback ?? "No feedback provided."
          }
        };
        
        if (currentSession) {
            const updatedResults = [...currentSession.results, newResult];
            const updatedSession = { ...currentSession, results: updatedResults };
            sessionRef.current = updatedSession;
            localStorage.setItem("interviewAceSession", JSON.stringify(updatedSession));
            
            setSession(prev => prev ? ({...prev, results: [...prev.results, newResult]}) : null);

            if (!isLastQuestion) {
              moveToNextQuestion();
            }
        }
      };
      reader.onerror = () => {
        throw new Error("Failed to read audio data.");
      };
    } catch (e) {
      console.error("Background evaluation failed for question " + questionIndex, e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during evaluation.";
       toast({ 
        variant: "destructive", 
        title: `Evaluation Error Q${questionIndex + 1}`, 
        description: errorMessage
      });
      
      setStatus('idle');
    }
  };
  
  const moveToNextQuestion = useCallback(() => {
    const currentSession = sessionRef.current;
    if (currentSession && currentQuestionIndex < currentSession.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeLeft(QUESTION_TIMER_SECONDS);
        setStatus('idle');
    }
  }, [currentQuestionIndex]);

  const handleStop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    setStatus('processing');
    
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      evaluateInBackground(audioBlob, currentQuestionIndex);
      audioChunksRef.current = [];
    } else {
      // Handle case with no audio recorded
       const currentSession = sessionRef.current;
        if (currentSession && currentQuestionIndex >= currentSession.questions.length - 1) {
          setStatus('finished');
          router.push("/results");
        } else {
           moveToNextQuestion();
        }
    }
  }, [currentQuestionIndex, evaluateInBackground, moveToNextQuestion, router]);

  useEffect(() => {
    const storedSession = localStorage.getItem("interviewAceSession");
    if (!storedSession) {
      router.replace("/");
      return;
    }
    const parsedSession: InterviewSession = JSON.parse(storedSession);
    
    if (parsedSession.results.length === parsedSession.questions.length && parsedSession.questions.length > 0) {
        router.push('/results');
        return;
    }

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
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [router]);


  useEffect(() => {
    if (status === 'listening') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleStop();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, handleStop]);
  
  const startListening = () => {
    if (mediaStreamRef.current && status === 'idle' && isCameraReady) {
      setTimeLeft(QUESTION_TIMER_SECONDS);
      audioChunksRef.current = [];
      try {
        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.start();
        setStatus('listening');
      } catch (err) {
        console.error("MediaRecorder error:", err);
        setError("Could not start recording. Please check your browser compatibility.");
        toast({ variant: "destructive", title: "Recording Error", description: "Could not start recording." });
      }
    }
  };
  
  const finishRecording = () => {
    if (mediaRecorderRef.current && status === 'listening') {
       handleStop();
    }
  };
  
  const handleEndInterview = () => {
    if (sessionRef.current && sessionRef.current.results.length > 0) {
      router.push("/results");
    } else {
      localStorage.removeItem("interviewAceSession");
      router.push("/");
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
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

  const isTechnical = session.userDetails.interviewType === 'Technical';
  const interviewer = {
    name: isTechnical ? "MGRaj" : "Shruthi",
    title: isTechnical ? "Tech Lead" : "HR Lead",
    avatar: isTechnical 
        ? "/assets/Tech - Lead.png"
        : "/assets/HR - Lead.png",
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-black">
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
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                <video ref={videoRef} autoPlay muted className="h-full w-full object-cover scale-x-[-1]"></video>
                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-75">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Starting Camera...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

            <Card className="shadow-lg flex flex-col items-center justify-center">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center flex-grow">
                <Avatar className="h-40 w-40 mb-4 border-4 border-primary/20">
                  <AvatarImage 
                    src={interviewer.avatar}
                    onLoad={() => setIsAvatarLoaded(true)}
                  />
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
                {isAvatarLoaded ? (
                  <>
                    <p className="text-xl font-bold">{interviewer.name}</p>
                    <p className="text-md text-muted-foreground">{interviewer.title}</p>
                  </>
                ) : (
                  <p className="text-lg font-semibold">Joining...</p>
                )}
              </CardContent>
            </Card>
        </div>

        {isCameraReady && isAvatarLoaded && currentQuestion && (
          <>
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-grow">
                  <p className="font-semibold text-sm mb-1">Question {currentQuestionIndex + 1} of {session.questions.length}:</p>
                  <p className="text-lg">{currentQuestion.question}</p>
                </div>
                 <div className="flex items-center gap-4">
                  {status === 'listening' && (
                    <div className="flex items-center gap-2 text-lg font-semibold text-destructive">
                      <Timer className="h-6 w-6" />
                      <span>{timeLeft}s</span>
                    </div>
                  )}
                  <div className="flex-shrink-0">
                      {status === 'listening' ? (
                          <Button onClick={finishRecording} size="icon" className="rounded-full w-16 h-16 bg-accent hover:bg-accent/90">
                              <MicOff className="h-8 w-8" />
                              <span className="sr-only">I'm Done</span>
                          </Button>
                      ) : (
                          <Button onClick={startListening} size="icon" className="rounded-full w-16 h-16" disabled={status !== 'idle'}>
                              {status === 'idle' && <Mic className="h-8 w-8" />}
                              {status === 'processing' && <Loader2 className="h-8 w-8 animate-spin" />}
                              {status === 'finished' && <Send className="h-8 w-8" />}
                              <span className="sr-only">
                                {status === 'idle' && 'Answer Now'}
                                {status === 'processing' && 'Processing...'}
                                {status === 'finished' && 'Finishing up...'}
                              </span>
                          </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
