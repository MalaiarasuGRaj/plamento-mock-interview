
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePerformanceReport } from "@/ai/flows/generate-performance-report";
import type { InterviewSession, InterviewResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, Home } from "lucide-react";
import { Logo } from "@/components/icons";
import jsPDF from "jspdf";

export default function ResultsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem("interviewAceSession");
    if (!storedSession) {
      router.replace("/");
      return;
    }
    const parsedSession: InterviewSession = JSON.parse(storedSession);
    setSession(parsedSession);

    const generateReport = async () => {
      if (!parsedSession.results || parsedSession.results.length === 0) {
        setReport("No interview data found to generate a report.");
        setIsLoading(false);
        return;
      }
      try {
        const reportData = await generatePerformanceReport({
          userName: parsedSession.userDetails.name,
          jobRole: parsedSession.userDetails.jobRole,
          experience: parsedSession.userDetails.experience,
          interviewSummary: parsedSession.results.map(r => ({
            question: r.question.question,
            userAnswer: r.userAnswer,
            relevanceScore: r.evaluation.relevance_score,
            fluencyScore: r.evaluation.fluency_score,
            confidenceScore: r.evaluation.confidence_score,
            totalScore: r.evaluation.total_score,
            feedback: r.evaluation.feedback,
          })),
        });
        setReport(reportData);
      } catch (e) {
        console.error("Report generation failed", e);
        toast({
          variant: "destructive",
          title: "Report Error",
          description: "Could not generate the final report.",
        });
        setReport("Failed to generate report.");
      } finally {
        setIsLoading(false);
      }
    };
    generateReport();
  }, [router, toast]);
  
  const handleDownloadReport = () => {
    if (!report || !session) return;
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
  
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Interview Performance Report", pageWidth / 2, 20, { align: "center" });
  
    // User Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Candidate: ${session.userDetails.name}`, margin, 35);
    doc.text(`Job Role: ${session.userDetails.jobRole}`, margin, 42);
    doc.text(`Experience: ${session.userDetails.experience}`, margin, 49);
    
    // Summary Report
    doc.setFont("helvetica", "bold");
    doc.text("Summary Report", margin, 65);
    doc.setLineWidth(0.5);
    doc.line(margin, 66, pageWidth - margin, 66);
    
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(report, contentWidth);
    doc.text(summaryLines, margin, 72);

    let yPosition = 72 + (summaryLines.length * 7) + 10;

    // Detailed Breakdown
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Breakdown", margin, yPosition);
    doc.setLineWidth(0.5);
    yPosition += 1;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    session.results.forEach((result, index) => {
       if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
       }

      // Question
      doc.setFont("helvetica", "bold");
      const questionLines = doc.splitTextToSize(`Question ${index + 1}: ${result.question.question}`, contentWidth);
      doc.text(questionLines, margin, yPosition);
      yPosition += (questionLines.length * 5) + 2;

      // User Answer
      doc.setFont("helvetica", "italic");
      const answerLines = doc.splitTextToSize(`Your Answer: "${result.userAnswer}"`, contentWidth);
      doc.text(answerLines, margin, yPosition);
      yPosition += (answerLines.length * 5) + 4;
      
      // Feedback
      doc.setFont("helvetica", "bold");
      doc.text("Feedback:", margin, yPosition);
      yPosition += 5;
      doc.setFont("helvetica", "normal");
      const feedbackLines = doc.splitTextToSize(result.evaluation.feedback, contentWidth);
      doc.text(feedbackLines, margin, yPosition);
      yPosition += (feedbackLines.length * 5) + 4;

      // Scores
      const scores = `Relevance: ${result.evaluation.relevance_score.toFixed(1)} | Fluency: ${result.evaluation.fluency_score.toFixed(1)} | Confidence: ${result.evaluation.confidence_score.toFixed(1)} | Total: ${result.evaluation.total_score.toFixed(1)}`;
      doc.setFontSize(10);
      doc.text(scores, margin, yPosition);
      yPosition += 10;
       doc.setFontSize(12);

      if (index < session.results.length -1) {
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
    });

    doc.save(`Interview_Report_${session.userDetails.name.replace(" ", "_")}.pdf`);
  };
  
  const handleNewInterview = () => {
    localStorage.removeItem("interviewAceSession");
    router.push("/");
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-secondary/30">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground font-semibold">Generating your performance report...</p>
      </div>
    );
  }

  const averageScore = session.results.length > 0 
    ? session.results.reduce((acc, r) => acc + r.evaluation.total_score, 0) / session.results.length
    : 0;

  return (
    <main className="min-h-screen bg-secondary/30 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">Interview Report</h1>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Summary for {session.userDetails.name}</CardTitle>
            <CardDescription>{session.userDetails.jobRole} | {session.userDetails.experience}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(averageScore).replace('bg-','text-')} text-transparent bg-clip-text`}>{averageScore.toFixed(1)} / 10</p>
            </div>
            {report ? (
              <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-pre-wrap font-body text-sm">{report}</pre>
            ) : (
               <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
               </div>
            )}
          </Create>
        </Card>

        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="font-headline">Detailed Breakdown</CardTitle>
                <CardDescription>Review each question, your answer, and the AI's feedback.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {session.results.map((result, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger>
                               <div className="flex items-center justify-between w-full pr-4">
                                 <span className="text-left flex-1">Question {index + 1}</span>
                                 <Badge className={`${getScoreColor(result.evaluation.total_score)} text-white`}>{result.evaluation.total_score.toFixed(1)}</Badge>
                               </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <p className="font-semibold">{result.question.question}</p>
                                <p className="text-sm p-3 bg-muted rounded-md italic">"{result.userAnswer}"</p>
                                <Separator />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                                    <Badge variant="secondary">Relevance: {result.evaluation.relevance_score.toFixed(1)}</Badge>
                                    <Badge variant="secondary">Fluency: {result.evaluation.fluency_score.toFixed(1)}</Badge>
                                    <Badge variant="secondary">Confidence: {result.evaluation.confidence_score.toFixed(1)}</Badge>
                                </div>
                                <p className="text-sm font-medium">Feedback:</p>
                                <p className="text-sm text-muted-foreground">{result.evaluation.feedback}</p>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleDownloadReport} disabled={!report} size="lg">
                <Download className="mr-2 h-5 w-5"/>
                Download Report
            </Button>
             <Button onClick={handleNewInterview} variant="outline" size="lg">
                <Home className="mr-2 h-5 w-5"/>
                Start New Interview
            </Button>
        </div>
      </div>
    </main>
  );
}
