"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as pdfjs from "pdfjs-dist";
import { generateInterviewQuestions } from "@/ai/flows/generate-interview-questions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { InterviewSession } from "@/lib/types";
import { Loader2, UploadCloud, Laptop } from "lucide-react";
import { Logo } from "@/components/icons";
import { useIsMobile } from "@/hooks/use-mobile";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  jobRole: z.string().min(2, "Job role is required."),
  experience: z.string({ required_error: "Experience level is required." }),
  interviewType: z.enum(["Technical", "HR"]),
  resume: z.any().refine((files) => files?.length === 1, "Resume is required."),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interviewType: "Technical",
    },
  });

  const resumeFileList = watch("resume");

  const parsePdf = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        if (!event.target?.result) return reject(new Error("File reading failed"));
        try {
          const pdf = await pdfjs.getDocument(event.target.result).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => ('str' in item ? item.str : "")).join(" ");
          }
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    try {
      const resumeFile = data.resume[0];
      const resumeText = await parsePdf(resumeFile);
      
      const questions = await generateInterviewQuestions({
        userName: data.name,
        resumeText,
        jobRole: data.jobRole,
        experience: data.experience,
        interviewType: data.interviewType,
      });

      if (!questions || questions.length === 0) {
        throw new Error("Failed to generate interview questions. Please try again.");
      }

      const session: InterviewSession = {
        userDetails: {
          name: data.name,
          jobRole: data.jobRole,
          experience: data.experience,
          interviewType: data.interviewType,
          resumeText,
        },
        questions,
        results: [],
      };

      localStorage.setItem("interviewAceSession", JSON.stringify(session));
      router.push("/instructions");

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
      setIsLoading(false);
    }
  };
  
  if (isMobile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
        <div className="text-center">
            <Laptop className="mx-auto h-24 w-24 text-primary mb-4" />
            <h1 className="text-2xl font-bold font-headline text-primary mb-2">Desktop Recommended</h1>
            <p className="max-w-md text-muted-foreground">
                For the best experience, please use a desktop or laptop computer. The full interface is not optimized for mobile devices.
            </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Logo className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold font-headline text-primary">Interview Ace</h1>
      </div>
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-center">Prepare for your Interview</CardTitle>
          <CardDescription className="text-center">
            Fill in the details below to start your personalized mock interview.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Jane Doe" disabled={isLoading} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role</Label>
                <Input id="jobRole" {...register("jobRole")} placeholder="e.g. Software Engineer" disabled={isLoading} />
                {errors.jobRole && <p className="text-sm text-destructive">{errors.jobRole.message}</p>}
              </div>
              <div className="space-y-2">
                 <Label htmlFor="experience">Experience Level</Label>
                 <Select
                    onValueChange={(value) => setValue("experience", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1 years">0-1 years</SelectItem>
                      <SelectItem value="2-5 years">2-5 years</SelectItem>
                      <SelectItem value="5-8 years">5-8 years</SelectItem>
                      <SelectItem value="8-10 years">8-10 years</SelectItem>
                      <SelectItem value="10-12 years">10-12 years</SelectItem>
                      <SelectItem value="12-15 years">12-15 years</SelectItem>
                      <SelectItem value="15+ years">15+ years</SelectItem>
                    </SelectContent>
                  </Select>
                 {errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interview Type</Label>
               <Select
                onValueChange={(value: "Technical" | "HR") => setValue("interviewType", value)}
                defaultValue="Technical"
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interview type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label htmlFor="resume">Upload Resume (.pdf)</Label>
                <Label htmlFor="resume" className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-muted ${errors.resume ? 'border-destructive' : ''}`}>
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {fileName || "Click to upload or drag and drop"}
                  </p>
                  <Input 
                    id="resume" 
                    type="file" 
                    className="hidden" 
                    accept=".pdf"
                    {...register("resume", {
                      onChange: (e) => setFileName(e.target.files?.[0]?.name || ""),
                    })}
                    disabled={isLoading}
                  />
                </Label>
               {errors.resume && <p className="text-sm text-destructive">{errors.resume.message as string}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Preparing your interview..." : "Start Interview"}
            </Button>
          </CardFooter>
        </form>
      </Card>
       <p className="text-center text-xs text-muted-foreground mt-4">
        © {new Date().getFullYear()} Interview Ace. All Rights Reserved.
      </p>
    </main>
  );
}
