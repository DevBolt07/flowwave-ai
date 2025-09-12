{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20,
    # Add the docker CLI tool to the environment
    pkgs.docker,
    # Add the Supabase CLI
    pkgs.supabase_cli
  ];

  # Enable the Docker daemon service
  services.docker.enable = true;

  idx.extensions = [
    # Swapped to a more relevant extension for React projects
    "esbenp.prettier-vscode"
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "npm",
          "run",
          "dev",
          "--",
          "--port",
          "$PORT",
          "--host",
          "0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}