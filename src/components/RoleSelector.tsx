import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Ambulance, MapPin, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  onShowDemo?: () => void;
}

export const RoleSelector = ({ onRoleSelect, onShowDemo }: RoleSelectorProps) => {
  const { profile, signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  if (!profile) {
    return <div>Loading profile...</div>;
  }
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Welcome, {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} User
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                AI-powered traffic optimization with emergency vehicle priority and real-time density monitoring
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Smart City Initiative</span>
          </div>
        </div>

        <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
          {roles.filter(role => role.id === profile.role).map((role) => (
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
                  size="lg"
                >
                  Access Dashboard
                </Button>
                
                {onShowDemo && role.id === 'authority' && (
                  <Button 
                    onClick={onShowDemo}
                    variant="outline"
                    className="w-full mt-2"
                    size="lg"
                  >
                    🎬 Launch Detection Demo
                  </Button>
                )}
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