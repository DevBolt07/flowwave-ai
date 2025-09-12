import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LaneWindow } from "@/components/LaneWindow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/ClientOnly";

interface Intersection {
  id: string;
  name: string;
}

export const AuthorityDashboard = () => {
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [selectedIntersection, setSelectedIntersection] = useState<Intersection | null>(null);
  const { toast } = useToast();

  const fetchIntersections = useCallback(async () => {
    const { data, error } = await supabase.from('intersections').select('id, name');
    if (error) {
      console.error("Error fetching intersections:", error);
      toast({ title: "Error", description: "Could not fetch intersection data.", variant: "destructive" });
    } else {
      setIntersections(data as Intersection[]);
      if (data.length > 0) {
        setSelectedIntersection(data[0]);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchIntersections();
  }, [fetchIntersections]);

  const handleIntersectionChange = (id: string) => {
    const intersection = intersections.find(i => i.id === id) || null;
    setSelectedIntersection(intersection);
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">V2.0 - Authority Dashboard</h1>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Intersection Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleIntersectionChange} value={selectedIntersection?.id || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Select an intersection" />
            </SelectTrigger>
            <SelectContent>
              {intersections.map(intersection => (
                <SelectItem key={intersection.id} value={intersection.id}>{intersection.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedIntersection && (
        <ClientOnly>
          <Card>
            <CardHeader>
              <CardTitle>Live Video Analysis - {selectedIntersection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LaneWindow intersectionId={selectedIntersection.id} direction="North" />
                <LaneWindow intersectionId={selectedIntersection.id} direction="South" />
                <LaneWindow intersectionId={selectedIntersection.id} direction="East" />
                <LaneWindow intersectionId={selectedIntersection.id} direction="West" />
              </div>
            </CardContent>
          </Card>
        </ClientOnly>
      )}
    </div>
  );
};