// Custom hook for Emergency Response Simulation
// Manages the complete emergency workflow with OSRM routing

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateOSRMRoute, 
  convertOSRMGeometryToLeaflet,
  getMockRoute,
  OSRMRouteResponse 
} from '@/lib/osrm-routing';
import { 
  findNearestAvailableAmbulance, 
  updateAmbulanceStatus,
  ambulanceSimulator,
  SimulatedAmbulance 
} from '@/lib/ambulance-simulation';
import { 
  greenCorridorManager,
  identifySignalsOnRoute,
  TrafficSignal 
} from '@/lib/green-corridor';
import { findNearestHospital } from '@/lib/supabase-api';

export interface EmergencySimulationState {
  isActive: boolean;
  phase: 'idle' | 'dispatching' | 'en_route_to_patient' | 'at_scene' | 'transporting' | 'completed';
  emergencyId: string | null;
  ambulance: SimulatedAmbulance | null;
  patientLocation: [number, number] | null;
  hospitalLocation: { id: string; name: string; location: [number, number] } | null;
  leg1Route: [number, number][] | null; // Ambulance to Patient
  leg2Route: [number, number][] | null; // Patient to Hospital
  affectedSignals: TrafficSignal[];
  eta: number | null; // ETA in minutes
  distanceKm: number | null;
}

export function useEmergencySimulation() {
  const { toast } = useToast();
  const [state, setState] = useState<EmergencySimulationState>({
    isActive: false,
    phase: 'idle',
    emergencyId: null,
    ambulance: null,
    patientLocation: null,
    hospitalLocation: null,
    leg1Route: null,
    leg2Route: null,
    affectedSignals: [],
    eta: null,
    distanceKm: null,
  });
  
  const [useOSRM, setUseOSRM] = useState(true); // Toggle for OSRM vs mock routing

  /**
   * Start emergency response simulation
   */
  const startEmergency = useCallback(async (
    patientLocation: [number, number],
    specialty?: string
  ) => {
    try {
      setState(prev => ({ ...prev, phase: 'dispatching' }));
      
      toast({
        title: "Emergency Response Initiated",
        description: "Analyzing situation and dispatching ambulance...",
      });

      // Step 1: Find nearest available ambulance
      const ambulance = await findNearestAvailableAmbulance(patientLocation);
      if (!ambulance) {
        throw new Error('No available ambulances found');
      }

      // Step 2: Find nearest hospital with specialty
      const hospital = await findNearestHospital(
        patientLocation[0],
        patientLocation[1],
        specialty
      );
      if (!hospital) {
        throw new Error('No suitable hospital found');
      }

      const ambulanceLocation: [number, number] = [
        ambulance.current_latitude,
        ambulance.current_longitude,
      ];
      const hospitalLocation: [number, number] = [
        hospital.latitude,
        hospital.longitude,
      ];

      // Step 3: Calculate routes using OSRM
      let leg1Route: [number, number][] = [];
      let leg2Route: [number, number][] = [];
      let totalDistance = 0;
      let totalDuration = 0;

      try {
        if (useOSRM) {
          // Leg 1: Ambulance to Patient
          const leg1Response = await calculateOSRMRoute(ambulanceLocation, patientLocation);
          leg1Route = convertOSRMGeometryToLeaflet(leg1Response.routes[0].geometry);
          
          // Leg 2: Patient to Hospital
          const leg2Response = await calculateOSRMRoute(patientLocation, hospitalLocation);
          leg2Route = convertOSRMGeometryToLeaflet(leg2Response.routes[0].geometry);
          
          totalDistance = (leg1Response.routes[0].distance + leg2Response.routes[0].distance) / 1000;
          totalDuration = (leg1Response.routes[0].duration + leg2Response.routes[0].duration) / 60;
        } else {
          throw new Error('Using mock routing');
        }
      } catch (error) {
        console.warn('OSRM not available, using mock routing:', error);
        // Fallback to mock routing
        const leg1Mock = getMockRoute(ambulanceLocation, patientLocation);
        const leg2Mock = getMockRoute(patientLocation, hospitalLocation);
        
        leg1Route = convertOSRMGeometryToLeaflet(leg1Mock.routes[0].geometry);
        leg2Route = convertOSRMGeometryToLeaflet(leg2Mock.routes[0].geometry);
        
        totalDistance = (leg1Mock.routes[0].distance + leg2Mock.routes[0].distance) / 1000;
        totalDuration = (leg1Mock.routes[0].duration + leg2Mock.routes[0].duration) / 60;
      }

      // Step 4: Create emergency record in database
      const { data: emergency, error: emergencyError } = await supabase
        .from('emergencies')
        .insert({
          ambulance_id: ambulance.id,
          hospital_id: hospital.id,
          source_latitude: patientLocation[0],
          source_longitude: patientLocation[1],
          destination_latitude: hospitalLocation[0],
          destination_longitude: hospitalLocation[1],
          status: 'active',
          emergency_type: 'medical',
          priority_level: 1,
          eta_minutes: Math.round(totalDuration),
          route: { leg1: leg1Route, leg2: leg2Route },
          workflow_status: 'dispatched',
        })
        .select()
        .single();

      if (emergencyError) throw emergencyError;

      // Step 5: Identify traffic signals on complete route
      const completeRoute = [...leg1Route, ...leg2Route];
      const signals = await identifySignalsOnRoute(completeRoute);

      // Step 6: Activate green corridor
      await greenCorridorManager.createCorridor(
        emergency.id,
        ambulance.id,
        completeRoute
      );

      // Step 7: Update ambulance status and start simulation
      await updateAmbulanceStatus(ambulance.id, 'en_route');
      ambulanceSimulator.startMovement(ambulance.id, leg1Route, 50);

      setState({
        isActive: true,
        phase: 'en_route_to_patient',
        emergencyId: emergency.id,
        ambulance: ambulance,
        patientLocation,
        hospitalLocation: {
          id: hospital.id,
          name: hospital.name,
          location: hospitalLocation,
        },
        leg1Route,
        leg2Route,
        affectedSignals: signals,
        eta: Math.round(totalDuration),
        distanceKm: Number(totalDistance.toFixed(2)),
      });

      toast({
        title: "Emergency Response Active",
        description: `${ambulance.vehicle_id} dispatched. ${signals.length} signals cleared. ETA: ${Math.round(totalDuration)} min`,
        variant: "default",
      });

    } catch (error) {
      console.error('Error starting emergency:', error);
      toast({
        title: "Emergency Response Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      setState(prev => ({ ...prev, phase: 'idle', isActive: false }));
    }
  }, [toast, useOSRM]);

  /**
   * End emergency response
   */
  const endEmergency = useCallback(async () => {
    if (!state.emergencyId || !state.ambulance) return;

    try {
      // Stop ambulance simulation
      ambulanceSimulator.stopMovement(state.ambulance.id);

      // Deactivate green corridor
      await greenCorridorManager.removeCorridor(state.emergencyId);

      // Update emergency status
      await supabase
        .from('emergencies')
        .update({ 
          status: 'completed',
          workflow_status: 'completed' 
        })
        .eq('id', state.emergencyId);

      // Reset ambulance to available
      await updateAmbulanceStatus(state.ambulance.id, 'available');

      setState({
        isActive: false,
        phase: 'idle',
        emergencyId: null,
        ambulance: null,
        patientLocation: null,
        hospitalLocation: null,
        leg1Route: null,
        leg2Route: null,
        affectedSignals: [],
        eta: null,
        distanceKm: null,
      });

      toast({
        title: "Emergency Completed",
        description: "Ambulance returned to service",
      });
    } catch (error) {
      console.error('Error ending emergency:', error);
      toast({
        title: "Error",
        description: "Failed to end emergency",
        variant: "destructive",
      });
    }
  }, [state, toast]);

  return {
    state,
    startEmergency,
    endEmergency,
    useOSRM,
    setUseOSRM,
  };
}
