import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, ArrowRight, Users, MapPin, Clock, Zap, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { VenueSelectionAlgorithm, VenueMatch } from "@/utils/venueSelection";
import { Tables } from "@/integrations/supabase/types";

type Venue = Tables<'venues'>;

const FACILITY_OPTIONS = [
  "Projector", "Sound System", "AC", "Whiteboard", "Internet", "Stage", 
  "Seating", "Open Ground", "Computers", "High-Speed WiFi", "Lighting", 
  "Food Stalls", "Temporary Stalls"
];

const COMPUTING_REQUIREMENTS = [
  "Computer Lab", "High-speed WiFi", "Projector", "Extra Power Outlets"
];

const EVENT_CATEGORIES = [
  "Cultural", "Sports", "Fun Activity", "Debate", "Performance", 
  "Food Stall", "Treasure Hunt", "Fashion Show"
];

const SPACE_TYPES = [
  "Indoor Hall", "Outdoor Ground", "Stage", "Classroom"
];

const eventSchema = z.object({
  title: z.string().min(3, "Event title must be at least 3 characters"),
  type: z.enum(["technical", "non-technical"]),
  topic: z.string().optional(),
  studentCount: z.number().min(1, "Student count must be at least 1"),
  date: z.date(),
  timeSlot: z.string().min(1, "Please select a time slot"),
  duration: z.number().min(1, "Duration must be at least 1 hour"),
  facilitiesRequired: z.array(z.string()),
  priority: z.enum(["high", "medium", "low"]),
  venueId: z.string().min(1, "Please select a venue"),
  // Technical specific
  computingRequirement: z.array(z.string()).optional(),
  isGroupEvent: z.boolean().optional(),
  numberOfTeams: z.number().optional(),
  evaluationSetup: z.boolean().optional(),
  // Non-technical specific
  eventCategory: z.string().optional(),
  spaceType: z.string().optional(),
  stageRequirement: z.boolean().optional(),
  soundRequirement: z.boolean().optional(),
  stallsNeeded: z.number().optional(),
  audienceParticipation: z.boolean().optional(),
});

const AddEvent = () => {
  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [venueMatches, setVenueMatches] = useState<VenueMatch[]>([]);
  const [alternatives, setAlternatives] = useState<VenueMatch[]>([]);
  const [formData, setFormData] = useState({
    // Basic fields
    title: "",
    type: "",
    topic: "",
    studentCount: "",
    date: null as Date | null,
    timeSlot: "",
    duration: 2,
    facilitiesRequired: [] as string[],
    priority: "medium",
    venueId: "",
    // Technical specific
    computingRequirement: [] as string[],
    isGroupEvent: false,
    numberOfTeams: 0,
    evaluationSetup: false,
    // Non-technical specific
    eventCategory: "",
    spaceType: "",
    stageRequirement: false,
    soundRequirement: false,
    stallsNeeded: 0,
    audienceParticipation: false,
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
      .order('area_sqft', { ascending: true });

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

  const runVenueAlgorithm = () => {
    if (!formData.date || !formData.timeSlot || !formData.studentCount) return;

    const algorithm = new VenueSelectionAlgorithm(venues);
    const dateTimeString = `${format(formData.date, 'yyyy-MM-dd')} ${formData.timeSlot}`;
    
    const results = algorithm.findBestVenues({
      participants: parseInt(formData.studentCount),
      facilitiesRequired: formData.facilitiesRequired,
      preferredDateTime: dateTimeString,
      priority: formData.priority as 'high' | 'medium' | 'low',
      eventType: formData.type as 'technical' | 'non-technical',
      spaceType: formData.spaceType,
    });

    setVenueMatches(results.exactMatches);
    setAlternatives(results.alternatives);
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
      if (!formData.studentCount || parseInt(formData.studentCount) < 1) {
        toast({
          title: "Validation Error",
          description: "Please enter the number of participants",
          variant: "destructive",
        });
        return;
      }
      if (!formData.date) {
        toast({
          title: "Validation Error",
          description: "Please select an event date",
          variant: "destructive",
        });
        return;
      }
      if (!formData.timeSlot) {
        toast({
          title: "Validation Error",
          description: "Please select a time slot",
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
      }
      if (formData.type === "non-technical") {
        if (!formData.eventCategory) {
          toast({
            title: "Validation Error",
            description: "Please select an event category",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Run venue algorithm
      runVenueAlgorithm();
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
        studentCount: parseInt(formData.studentCount),
        date: formData.date!,
        timeSlot: formData.timeSlot,
        duration: formData.duration,
        facilitiesRequired: formData.facilitiesRequired,
        priority: formData.priority as "high" | "medium" | "low",
        venueId: formData.venueId,
        computingRequirement: formData.computingRequirement,
        isGroupEvent: formData.isGroupEvent,
        numberOfTeams: formData.numberOfTeams,
        evaluationSetup: formData.evaluationSetup,
        eventCategory: formData.eventCategory || undefined,
        spaceType: formData.spaceType || undefined,
        stageRequirement: formData.stageRequirement,
        soundRequirement: formData.soundRequirement,
        stallsNeeded: formData.stallsNeeded,
        audienceParticipation: formData.audienceParticipation,
      };

      const validation = eventSchema.parse(validationData);

      const eventData = {
        title: validation.title,
        type: validation.type,
        topic: validation.topic || null,
        student_count: validation.studentCount,
        event_date: validation.date.toISOString().split('T')[0],
        time_slot: validation.timeSlot,
        duration_hours: validation.duration,
        facilities_required: validation.facilitiesRequired,
        priority: validation.priority,
        venue_id: validation.venueId,
        user_id: user?.id,
        status: 'pending',
        // Technical fields
        computing_requirement: validation.computingRequirement || [],
        is_group_event: validation.isGroupEvent || false,
        number_of_teams: validation.numberOfTeams || 0,
        evaluation_setup: validation.evaluationSetup || false,
        // Non-technical fields
        event_category: validation.eventCategory || null,
        space_type: validation.spaceType || null,
        stage_requirement: validation.stageRequirement || false,
        sound_requirement: validation.soundRequirement || false,
        stalls_needed: validation.stallsNeeded || 0,
        audience_participation: validation.audienceParticipation || false,
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
  const selectedMatch = venueMatches.find(m => m.venue.id === formData.venueId);

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
            <CardDescription>Enter the comprehensive information for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Event Name / Title</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentCount">Expected Participants</Label>
                  <Input
                    id="studentCount"
                    type="number"
                    placeholder="Number of people"
                    value={formData.studentCount}
                    onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 2 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Preferred Time</Label>
                  <Select value={formData.timeSlot} onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="15:00">3:00 PM</SelectItem>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Event Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High - Override smaller events</SelectItem>
                    <SelectItem value="medium">Medium - Normal priority</SelectItem>
                    <SelectItem value="low">Low - Flexible scheduling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Facilities Required</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FACILITY_OPTIONS.map((facility) => (
                    <div key={facility} className="flex items-center space-x-2">
                      <Checkbox
                        id={facility}
                        checked={formData.facilitiesRequired.includes(facility)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              facilitiesRequired: [...formData.facilitiesRequired, facility]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              facilitiesRequired: formData.facilitiesRequired.filter(f => f !== facility)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={facility} className="text-sm">{facility}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Event Specific */}
            {formData.type === "technical" && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Technical Event Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic / Domain</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., AI, Coding, IoT, Robotics"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Computing Requirements</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPUTING_REQUIREMENTS.map((req) => (
                      <div key={req} className="flex items-center space-x-2">
                        <Checkbox
                          id={req}
                          checked={formData.computingRequirement.includes(req)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                computingRequirement: [...formData.computingRequirement, req]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                computingRequirement: formData.computingRequirement.filter(r => r !== req)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={req} className="text-sm">{req}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Format</Label>
                    <RadioGroup
                      value={formData.isGroupEvent ? "group" : "individual"}
                      onValueChange={(value) => setFormData({ ...formData, isGroupEvent: value === "group" })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="individual" id="individual" />
                        <Label htmlFor="individual">Individual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="group" id="group" />
                        <Label htmlFor="group">Group/Team</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {formData.isGroupEvent && (
                    <div className="space-y-2">
                      <Label htmlFor="numberOfTeams">Number of Teams</Label>
                      <Input
                        id="numberOfTeams"
                        type="number"
                        value={formData.numberOfTeams}
                        onChange={(e) => setFormData({ ...formData, numberOfTeams: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="evaluationSetup"
                    checked={formData.evaluationSetup}
                    onCheckedChange={(checked) => setFormData({ ...formData, evaluationSetup: !!checked })}
                  />
                  <Label htmlFor="evaluationSetup">Evaluation Setup Needed (Judges Table, Mic, Display Screen)</Label>
                </div>
              </div>
            )}

            {/* Non-Technical Event Specific */}
            {formData.type === "non-technical" && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Non-Technical Event Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Category</Label>
                    <Select value={formData.eventCategory} onValueChange={(value) => setFormData({ ...formData, eventCategory: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Space Type Needed</Label>
                    <Select value={formData.spaceType} onValueChange={(value) => setFormData({ ...formData, spaceType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select space type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stageRequirement"
                      checked={formData.stageRequirement}
                      onCheckedChange={(checked) => setFormData({ ...formData, stageRequirement: !!checked })}
                    />
                    <Label htmlFor="stageRequirement">Stage Required</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="soundRequirement"
                      checked={formData.soundRequirement}
                      onCheckedChange={(checked) => setFormData({ ...formData, soundRequirement: !!checked })}
                    />
                    <Label htmlFor="soundRequirement">Sound/Music System</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stallsNeeded">Stalls/Booths Needed</Label>
                    <Input
                      id="stallsNeeded"
                      type="number"
                      placeholder="Number of stalls"
                      value={formData.stallsNeeded}
                      onChange={(e) => setFormData({ ...formData, stallsNeeded: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="audienceParticipation"
                      checked={formData.audienceParticipation}
                      onCheckedChange={(checked) => setFormData({ ...formData, audienceParticipation: !!checked })}
                    />
                    <Label htmlFor="audienceParticipation">Audience Participation Expected</Label>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleNextStep} className="w-full">
              Next: Smart Venue Selection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Smart Venue Selection</CardTitle>
            <CardDescription>AI-powered venue matching based on your requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Perfect Matches */}
            {venueMatches.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-600">Perfect Matches</h3>
                </div>
                <div className="grid gap-4">
                  {venueMatches.map((match) => (
                    <Card
                      key={match.venue.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent border-green-200",
                        formData.venueId === match.venue.id && "ring-2 ring-green-500 bg-green-50"
                      )}
                      onClick={() => setFormData({ ...formData, venueId: match.venue.id })}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <MapPin className="h-5 w-5 text-green-600" />
                            <div>
                              <h3 className="font-semibold">{match.venue.name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">{match.venue.type}</p>
                              <p className="text-xs text-green-600 mt-1">{match.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-4 text-sm mb-2">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {match.venue.capacity}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                {match.score}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{match.venue.area_sqft} sq ft</p>
                          </div>
                        </div>
                        {match.venue.facilities && match.venue.facilities.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Available Facilities:</p>
                            <div className="flex flex-wrap gap-1">
                              {match.venue.facilities.map((facility, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                  {facility}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Options */}
            {alternatives.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-600">Alternative Options</h3>
                </div>
                <div className="grid gap-4">
                  {alternatives.map((alt) => (
                    <Card
                      key={alt.venue.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent border-orange-200",
                        formData.venueId === alt.venue.id && "ring-2 ring-orange-500 bg-orange-50"
                      )}
                      onClick={() => setFormData({ ...formData, venueId: alt.venue.id })}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <MapPin className="h-5 w-5 text-orange-600" />
                            <div>
                              <h3 className="font-semibold">{alt.venue.name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">{alt.venue.type}</p>
                              <p className="text-xs text-orange-600 mt-1">{alt.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-4 text-sm mb-2">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {alt.venue.capacity}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                {alt.score}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{alt.venue.area_sqft} sq ft</p>
                          </div>
                        </div>
                        {alt.venue.facilities && alt.venue.facilities.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Available Facilities:</p>
                            <div className="flex flex-wrap gap-1">
                              {alt.venue.facilities.map((facility, idx) => (
                                <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                  {facility}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {venueMatches.length === 0 && alternatives.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No venues found matching your requirements. Please adjust your criteria and try again.</p>
              </div>
            )}

            {(selectedVenue || selectedMatch) && (
              <div className="p-4 bg-accent rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Selected Venue Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Name:</strong> {selectedVenue?.name}</p>
                    <p><strong>Type:</strong> {selectedVenue?.type}</p>
                    <p><strong>Capacity:</strong> {selectedVenue?.capacity} people</p>
                  </div>
                  <div>
                    <p><strong>Area:</strong> {selectedVenue?.area_sqft} sq ft</p>
                    <p><strong>Required:</strong> {formData.studentCount ? parseInt(formData.studentCount) * 6 : 0} sq ft</p>
                    {selectedMatch && <p><strong>Match Score:</strong> {selectedMatch.score}/100</p>}
                  </div>
                </div>
                {selectedMatch && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Analysis:</strong> {selectedMatch.reason}
                  </p>
                )}
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