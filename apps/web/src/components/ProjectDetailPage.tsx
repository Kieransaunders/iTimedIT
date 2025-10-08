import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { RecentEntriesTable } from "./RecentEntriesTable";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { useCurrency } from "../hooks/useCurrency";

interface ProjectDetailPageProps {
  projectId: string;
  onBackToProjects: () => void;
}

export function ProjectDetailPage({ projectId, onBackToProjects }: ProjectDetailPageProps) {
  const project = useQuery(api.projects.get, { id: projectId as Id<"projects"> });
  const categories = useQuery(api.categories.getCategories);
  const createManualEntry = useMutation(api.timer.createManualEntry);
  const { getCurrencySymbol, formatCurrency } = useCurrency();
  
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    note: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualEntrySubmit = async () => {
    if (!project) return;
    
    const startDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.startTime}:00`);
    const endDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.endTime}:00`);
    
    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createManualEntry({
        projectId: project._id,
        startedAt: startDateTime.getTime(),
        stoppedAt: endDateTime.getTime(),
        note: manualEntryForm.note || undefined,
        category: manualEntryForm.category || undefined
      });
      
      setShowManualEntryDialog(false);
      setManualEntryForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        note: '',
        category: ''
      });
      
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
      toast.success(`Added ${duration} minute${duration !== 1 ? 's' : ''} to ${project.name}`);
    } catch (error) {
      console.error('Failed to create manual entry:', error);
      toast.error('Failed to create time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBackToProjects}
          className="text-[#F85E00] hover:text-[#d14e00] flex items-center gap-2"
        >
          ← Back to Projects
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.name}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {project.client?.name} • {getCurrencySymbol()}{project.hourlyRate}/hr
            </p>
            {project.budgetType === "hours" && project.budgetHours && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allocated: {project.budgetHours} hours
              </p>
            )}
            {project.budgetType === "amount" && project.budgetAmount && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allocated: {formatCurrency(project.budgetAmount)}
              </p>
            )}
          </div>
          
          <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#F85E00] hover:bg-[#d14e00] text-white">
                + Add Time Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Manual Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={manualEntryForm.date}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="time"
                      value={manualEntryForm.startTime}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      value={manualEntryForm.endTime}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                {categories && categories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category (optional)</label>
                    <select
                      value={manualEntryForm.category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManualEntryForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-10 px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Note (optional)</label>
                  <textarea
                    placeholder="What did you work on?"
                    value={manualEntryForm.note}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualEntryForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleManualEntrySubmit}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Adding..." : "Add Entry"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowManualEntryDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <RecentEntriesTable projectId={projectId as Id<"projects">} />
    </div>
  );
}