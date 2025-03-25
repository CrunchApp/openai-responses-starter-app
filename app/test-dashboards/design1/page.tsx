"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Filter, Search, User, Bookmark, Award, Zap, School, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample data for education resources
const resources = [
  {
    id: 1,
    title: "Computer Science Bachelor's Degree",
    description: "4-year program covering programming, algorithms, and computer systems",
    category: "Degree",
    level: "Undergraduate",
    match: 98,
    location: "Online",
    tag: "Popular",
    icon: School,
  },
  {
    id: 2,
    title: "Data Science Bootcamp",
    description: "Intensive 12-week program to learn data analytics and machine learning",
    category: "Certificate",
    level: "Professional",
    match: 85,
    location: "Remote",
    tag: "Fast-track",
    icon: Zap,
  },
  {
    id: 3,
    title: "MBA in Technology Management",
    description: "Business administration degree with technology specialization",
    category: "Degree",
    level: "Graduate",
    match: 92,
    location: "Hybrid",
    tag: "Recommended",
    icon: Award,
  },
  {
    id: 4,
    title: "UX/UI Design Fundamentals",
    description: "Learn the basics of user experience and interface design",
    category: "Course",
    level: "Beginner",
    match: 78,
    location: "Online",
    tag: "Trending",
    icon: BookOpen,
  },
  {
    id: 5,
    title: "Cybersecurity Certification",
    description: "Professional certification in network security and ethical hacking",
    category: "Certificate",
    level: "Advanced",
    match: 88,
    location: "In-person",
    tag: "High-demand",
    icon: Shield,
  },
  {
    id: 6,
    title: "Full-Stack Web Development",
    description: "Comprehensive program covering front-end and back-end development",
    category: "Bootcamp",
    level: "Intermediate",
    match: 94,
    location: "Remote",
    tag: "Popular",
    icon: Code,
  },
];

export default function CardDashboard() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  // Filter resources based on active filter and search query
  const filteredResources = resources.filter(resource => {
    const matchesFilter = activeFilter === "all" || resource.category.toLowerCase() === activeFilter;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Education Pathways Explorer</h1>
        <p className="text-gray-600">Discover personalized educational opportunities tailored to your interests</p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div 
        className="bg-white rounded-lg p-4 mb-8 shadow-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Filter by:</span>
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="degree">Degrees</TabsTrigger>
                <TabsTrigger value="certificate">Certificates</TabsTrigger>
                <TabsTrigger value="course">Courses</TabsTrigger>
                <TabsTrigger value="bootcamp">Bootcamps</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search programs..."
              className="pl-10 bg-gray-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Resource Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredResources.map((resource) => (
          <motion.div key={resource.id} variants={itemVariants} whileHover={{ y: -5 }}>
            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-t-4" 
                  style={{ borderTopColor: getBorderColor(resource.category) }}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                       style={{ backgroundColor: getBackgroundColor(resource.category) }}>
                    <resource.icon className="w-6 h-6" style={{ color: getIconColor(resource.category) }} />
                  </div>
                  <Badge variant={getBadgeVariant(resource.tag)}>{resource.tag}</Badge>
                </div>
                <CardTitle>{resource.title}</CardTitle>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{resource.category}</Badge>
                  <Badge variant="outline">{resource.level}</Badge>
                  <Badge variant="outline">{resource.location}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div className="h-2.5 rounded-full" 
                       style={{ width: `${resource.match}%`, backgroundColor: getMatchColor(resource.match) }}></div>
                </div>
                <p className="text-xs text-right text-gray-500">{resource.match}% match</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button>View Details</Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredResources.length === 0 && (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-gray-500">No programs match your current filters. Try adjusting your search criteria.</p>
        </motion.div>
      )}
    </div>
  );
}

// Helper functions for styling
function getBorderColor(category: string) {
  switch (category.toLowerCase()) {
    case 'degree': return '#3b82f6'; // blue
    case 'certificate': return '#10b981'; // green
    case 'course': return '#8b5cf6'; // purple
    case 'bootcamp': return '#f97316'; // orange
    default: return '#6b7280'; // gray
  }
}

function getBackgroundColor(category: string) {
  switch (category.toLowerCase()) {
    case 'degree': return '#dbeafe'; // light blue
    case 'certificate': return '#d1fae5'; // light green
    case 'course': return '#ede9fe'; // light purple
    case 'bootcamp': return '#ffedd5'; // light orange
    default: return '#f3f4f6'; // light gray
  }
}

function getIconColor(category: string) {
  switch (category.toLowerCase()) {
    case 'degree': return '#3b82f6'; // blue
    case 'certificate': return '#10b981'; // green
    case 'course': return '#8b5cf6'; // purple
    case 'bootcamp': return '#f97316'; // orange
    default: return '#6b7280'; // gray
  }
}

function getMatchColor(match: number) {
  if (match >= 90) return '#10b981'; // green
  if (match >= 70) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getBadgeVariant(tag: string) {
  switch (tag.toLowerCase()) {
    case 'popular': return 'default';
    case 'recommended': return 'secondary';
    case 'trending': return 'destructive';
    case 'fast-track': return 'outline';
    case 'high-demand': return 'secondary';
    default: return 'default';
  }
}

// Missing icon imports
function Shield(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function Code(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
} 