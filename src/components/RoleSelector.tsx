import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Ambulance, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Role {
  id: 'normal' | 'authority' | 'emergency';
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

interface RoleSelectorProps {
  onRoleSelect: (role: Role['id']) => void;
}

export const RoleSelector = ({ onRoleSelect }: RoleSelectorProps) => {
  const roles: Role[] = [
    {
      id: 'normal',
      title: 'Citizen View',
      description: 'Monitor city-wide traffic conditions',
      icon: <Users className="w-8 h-8" />,
      features: [
        'View live traffic density',
        'Check signal timers',
        'Emergency alerts',
        'Intersection details'
      ],
      color: 'bg-primary text-primary-foreground'
    },
    {
      id: 'authority',
      title: 'Traffic Authority',
      description: 'Control and optimize traffic signals',
      icon: <Shield className="w-8 h-8" />,
      features: [
        'Live vehicle detection',
        'GST configuration',
        'Manual signal override',
        'ROI management',
        'Emergency coordination'
      ],
      color: 'bg-secondary text-secondary-foreground'
    },
    {
      id: 'emergency',
      title: 'Emergency Driver',
      description: 'Request priority green corridors',
      icon: <Ambulance className="w-8 h-8" />,
      features: [
        'Green corridor request',
        'Route optimization',
        'Real-time navigation',
        'Priority signaling'
      ],
      color: 'bg-emergency text-emergency-foreground'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Smart Traffic Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            AI-powered traffic optimization with emergency vehicle priority and real-time density monitoring
          </p>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Smart City Initiative</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <Card key={role.id} className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
              <div className={cn("absolute top-0 left-0 right-0 h-1", role.color)} />
              
              <CardHeader className="text-center pb-4">
                <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center", role.color)}>
                  {role.icon}
                </div>
                <CardTitle className="text-xl">{role.title}</CardTitle>
                <CardDescription className="text-sm">{role.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => onRoleSelect(role.id)}
                  className="w-full"
                  variant={role.id === 'emergency' ? 'destructive' : 'default'}
                >
                  Access {role.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            🚦 Real-time AI Detection • 🚑 Emergency Priority • 📊 Dynamic GST Optimization
          </p>
        </div>
      </div>
    </div>
  );
};