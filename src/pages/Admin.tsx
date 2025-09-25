import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Calendar, MapPin, Users, BookOpen, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  type: string;
  topic: string | null;
  student_count: number | null;
  event_date: string;
  status: string;
  created_at: string;
  venues: {
    name: string;
    capacity: number;
  };
  creator_name?: string;
}

const Admin = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    fetchEvents();
  }, [isAdmin, navigate]);

  const fetchEvents = async () => {
    try {
      // First get all events with venues
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          type,
          topic,
          student_count,
          event_date,
          status,
          created_at,
          user_id,
          venues (
            name,
            capacity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching events",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Then get profiles for the users
      const userIds = eventsData?.map(event => event.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      // Combine the data
      const eventsWithCreators = eventsData?.map(event => {
        const creator = profilesData?.find(profile => profile.user_id === event.user_id);
        return {
          ...event,
          creator_name: creator?.name || 'Unknown User'
        };
      }) || [];

      setEvents(eventsWithCreators);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: 'approved' | 'rejected') => {
    setUpdatingEventId(eventId);
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId);

      if (error) {
        toast({
          title: "Error updating event",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Event ${status}`,
          description: `The event has been ${status} successfully.`,
        });
        
        // Update local state
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, status }
            : event
        ));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const pendingEvents = events.filter(event => event.status === 'pending');
  const approvedEvents = events.filter(event => event.status === 'approved');
  const rejectedEvents = events.filter(event => event.status === 'rejected');

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage event approvals and system overview</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">{pendingEvents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{approvedEvents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedEvents.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No pending events</p>
              </CardContent>
            </Card>
          ) : (
            pendingEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>
                        Submitted by {event.creator_name}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{event.type}</span>
                      {event.topic && <span>• {event.topic}</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(event.event_date).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {event.venues.name} (Capacity: {event.venues.capacity})
                    </div>
                    
                    {event.student_count && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {event.student_count} students expected
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateEventStatus(event.id, 'approved')}
                      disabled={updatingEventId === event.id}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateEventStatus(event.id, 'rejected')}
                      disabled={updatingEventId === event.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedEvents.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No approved events</p>
              </CardContent>
            </Card>
          ) : (
            approvedEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="flex justify-between items-center p-6">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.venues.name}
                      </span>
                      <span>By {event.creator_name}</span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedEvents.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No rejected events</p>
              </CardContent>
            </Card>
          ) : (
            rejectedEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="flex justify-between items-center p-6">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.venues.name}
                      </span>
                      <span>By {event.creator_name}</span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;