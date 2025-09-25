import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, ArrowRight, Users, MapPin } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

interface Venue {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

const eventSchema = z.object({
  title: z.string().min(3, "Event title must be at least 3 characters"),
  type: z.enum(["technical", "non-technical"]),
  topic: z.string().optional(),
  studentCount: z.number().min(1, "Student count must be at least 1").optional(),
  date: z.date(),
  venueId: z.string().min(1, "Please select a venue"),
});

const AddEvent = () => {
  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    topic: "",
    studentCount: "",
    date: null as Date | null,
    venueId: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('capacity', { ascending: true });

    if (error) {
      toast({
        title: "Error fetching venues",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setVenues(data || []);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Validate basic details
      if (!formData.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter an event title",
          variant: "destructive",
        });
        return;
      }
      if (!formData.type) {
        toast({
          title: "Validation Error", 
          description: "Please select an event type",
          variant: "destructive",
        });
        return;
      }
      if (formData.type === "technical") {
        if (!formData.topic.trim()) {
          toast({
            title: "Validation Error",
            description: "Please enter a topic for technical events",
            variant: "destructive",
          });
          return;
        }
        if (!formData.studentCount || parseInt(formData.studentCount) < 1) {
          toast({
            title: "Validation Error",
            description: "Please enter the number of students",
            variant: "destructive",
          });
          return;
        }
      }
      if (!formData.date) {
        toast({
          title: "Validation Error",
          description: "Please select an event date",
          variant: "destructive",
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const validationData = {
        title: formData.title.trim(),
        type: formData.type as "technical" | "non-technical",
        topic: formData.topic || undefined,
        studentCount: formData.studentCount ? parseInt(formData.studentCount) : undefined,
        date: formData.date!,
        venueId: formData.venueId,
      };

      const validation = eventSchema.parse(validationData);

      const eventData = {
        title: validation.title,
        type: validation.type,
        topic: validation.topic || null,
        student_count: validation.studentCount || null,
        event_date: validation.date.toISOString().split('T')[0],
        venue_id: validation.venueId,
        user_id: user?.id,
        status: 'pending',
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) {
        toast({
          title: "Error creating event",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Event Created Successfully",
          description: "Your event has been submitted for admin approval.",
        });
        navigate("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedVenue = venues.find(v => v.id === formData.venueId);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Event</h1>
          <p className="text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>Enter the basic information for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Event Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="technical" id="technical" />
                  <Label htmlFor="technical">Technical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-technical" id="non-technical" />
                  <Label htmlFor="non-technical">Non-Technical</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type === "technical" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="topic">Event Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Machine Learning, Web Development"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentCount">Number of Students</Label>
                  <Input
                    id="studentCount"
                    type="number"
                    placeholder="Expected number of participants"
                    value={formData.studentCount}
                    onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date || undefined}
                    onSelect={(date) => setFormData({ ...formData, date: date || null })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleNextStep} className="w-full">
              Next: Select Venue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Venue</CardTitle>
            <CardDescription>Choose the most suitable venue for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {venues.map((venue) => (
                <Card
                  key={venue.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    formData.venueId === venue.id && "ring-2 ring-primary bg-accent"
                  )}
                  onClick={() => setFormData({ ...formData, venueId: venue.id })}
                >
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{venue.type} venue</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>Capacity: {venue.capacity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedVenue && (
              <div className="p-4 bg-accent rounded-lg">
                <h4 className="font-semibold text-sm">Selected Venue:</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedVenue.name} - Capacity for {selectedVenue.capacity} people
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.venueId || loading}
                className="flex-1"
              >
                {loading ? "Creating Event..." : "Create Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddEvent;