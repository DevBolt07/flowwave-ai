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

  // Role Selection Screen
  if (!selectedRole) {
    return <RoleSelector onRoleSelect={handleRoleSelect} />;
  }

  // Render appropriate dashboard based on selected role
  switch (selectedRole) {
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