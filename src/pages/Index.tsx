import { useState } from "react";
import { RoleSelector } from "@/components/RoleSelector";
import { CitizenDashboard } from "@/components/CitizenDashboard";
import { AuthorityDashboard } from "@/components/AuthorityDashboard";
import { EmergencyDashboard } from "@/components/EmergencyDashboard";

type UserRole = 'normal' | 'authority' | 'emergency' | null;

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

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