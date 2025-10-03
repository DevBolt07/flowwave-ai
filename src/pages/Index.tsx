import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSelector } from "@/components/RoleSelector";
import { CitizenDashboard } from "@/components/CitizenDashboard";
import { AuthorityDashboard } from "@/components/AuthorityDashboard";
import { EmergencyDashboard } from "@/components/EmergencyDashboard";

type UserRole = 'normal' | 'authority' | 'emergency' | null;

const Index = () => {
  const { user, profile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBackToRoleSelector = () => {
    setSelectedRole(null);
  };

  // Show loading if profile not loaded yet
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Role Selection Screen (only show if no role selected)
  if (!selectedRole) {
    return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }

  // Render appropriate dashboard based on selected role
  // But ensure user can only access their own role
  const userRole = profile.role as UserRole;
  const roleToShow = selectedRole === userRole ? selectedRole : userRole;

  switch (roleToShow) {
    case 'normal':
      return <CitizenDashboard onBack={handleBackToRoleSelector} />;
    case 'authority':
      return <AuthorityDashboard onBack={handleBackToRoleSelector} />;
    case 'emergency':
      return <EmergencyDashboard onBack={handleBackToRoleSelector} />;
    default:
      return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }
};

export default Index;