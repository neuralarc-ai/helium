import { ChangelogData } from "../sections/changelog";

export const changeLogData: ChangelogData[] = [
    {
      version: "Version 2.0.0",
      date: "July 2025",
      title: "Introducing Custom Agents, Agent Marketplace, and much more!",
      description:
        "The most significant update for Suna yet. Build, customize, and share AI agents. Connect any service, automate complex workflows, and discover a thriving marketplace of community-built agents.",
      items: [
        "Custom Agent Builder - Create specialized AI agents with tailored system prompts and behaviors",
        "Model Context Protocol (MCP) Integration - Connect agents to any external service",
        "Agent Marketplace - Discover, install, and share agents with the community",
        "Visual Workflow Designer - Build complex multi-step workflows with conditional logic",
        "Unified Integrations Hub - Manage all your service connections in one place",
        "Version Control for Agents - Track changes, create versions, and rollback safely",
        "Advanced Agent Configuration - Fine-tune model parameters, tools, and capabilities",
        "Enterprise-Grade Security - Encrypted credential management and secure agent execution"
      ],
      image: "/thumbnail-dark.png",
      button: {
        url: "/agents",
        text: "Explore Agents",
      },
    },
  ];