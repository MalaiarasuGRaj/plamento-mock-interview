"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Sun, Volume2 } from "lucide-react";

export default function InstructionsPage() {
  const router = useRouter();

  const handleProceed = () => {
    router.push("/interview");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-black">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-center">Get Ready!</CardTitle>
          <CardDescription className="text-center">
            Follow these steps to ensure the best interview experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <Camera className="h-6 w-6 text-primary mt-1" />
                <div>
                    <h3 className="font-semibold">Enable Camera & Microphone</h3>
                    <p className="text-sm text-muted-foreground">Your browser will ask for permission. Please allow access so we can see and hear you.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <Sun className="h-6 w-6 text-primary mt-1" />
                <div>
                    <h3 className="font-semibold">Find a Well-Lit Area</h3>
                    <p className="text-sm text-muted-foreground">Make sure your face is clearly visible and not covered by shadows.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <Volume2 className="h-6 w-6 text-primary mt-1" />
                <div>
                    <h3 className="font-semibold">Speak Clearly</h3>
                    <p className="text-sm text-muted-foreground">Speak at a normal volume. The AI will transcribe your answers.</p>
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleProceed} className="w-full" size="lg">
                I'm Ready, Let's Start
            </Button>
        </CardFooter>
      </Card>
      <p className="text-center text-xs text-muted-foreground mt-4">
        © {new Date().getFullYear()} Interview Ace. All Rights Reserved.
      </p>
    </main>
  );
}
