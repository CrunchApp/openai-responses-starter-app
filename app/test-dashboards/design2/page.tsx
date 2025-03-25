"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, LineChart, Calendar, GraduationCap, 
  DollarSign, Globe, Layers, X, Plus, Settings, 
  Sun, Moon, ChevronDown, ChevronUp, Menu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@radix-ui/react-avatar";

// Available modules for the dashboard
const availableModules = [
  { id: "programs", title: "Recommended Programs", icon: BookOpen, description: "Educational programs based on your profile" },
  { id: "progress", title: "Learning Progress", icon: LineChart, description: "Track your educational achievements" },
  { id: "timeline", title: "Education Timeline", icon: Calendar, description: "Your educational journey and milestones" },
  { id: "finances", title: "Financial Aid", icon: DollarSign, description: "Scholarships and funding opportunities" },
  { id: "institutions", title: "Top Institutions", icon: GraduationCap, description: "Leading schools in your areas of interest" },
  { id: "global", title: "Global Opportunities", icon: Globe, description: "International education and exchange programs" },
  { id: "skills", title: "Skills Analysis", icon: Layers, description: "Assessment of your current skills and gaps" },
];

export default function ModularDashboard() {
  const [activeModules, setActiveModules] = useState([
    "programs", "progress", "timeline", "finances"
  ]);
  const [darkMode, setDarkMode] = useState(false);
  const [moduleExpanded, setModuleExpanded] = useState<Record<string, boolean>>({});
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  
  // Toggle a module's expanded state
  const toggleModuleExpanded = (moduleId: string) => {
    setModuleExpanded({
      ...moduleExpanded,
      [moduleId]: !moduleExpanded[moduleId]
    });
  };

  // Add a module to the dashboard
  const addModule = (moduleId: string) => {
    if (!activeModules.includes(moduleId)) {
      setActiveModules([...activeModules, moduleId]);
    }
  };

  // Remove a module from the dashboard
  const removeModule = (moduleId: string) => {
    setActiveModules(activeModules.filter(id => id !== moduleId));
  };

  // Drag and drop handlers
  const handleDragStart = (moduleId: string) => {
    setDraggedModule(moduleId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetModuleId: string) => {
    if (draggedModule && draggedModule !== targetModuleId) {
      const updatedModules = [...activeModules];
      const draggedIndex = updatedModules.indexOf(draggedModule);
      const targetIndex = updatedModules.indexOf(targetModuleId);
      
      updatedModules.splice(draggedIndex, 1);
      updatedModules.splice(targetIndex, 0, draggedModule);
      
      setActiveModules(updatedModules);
      setDraggedModule(null);
    }
  };

  // Get module details by ID
  const getModuleDetails = (moduleId: string) => {
    return availableModules.find(module => module.id === moduleId) || availableModules[0];
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <div className={`fixed top-0 left-0 right-0 z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md px-4 py-2`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Menu className="h-6 w-6 md:hidden" />
            <h1 className="text-xl font-bold">Vista Education Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 bg-blue-100">
                  <span className="font-semibold text-blue-600">JD</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Help</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container mx-auto pt-20 px-4 pb-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <motion.div 
          className={`md:w-1/4 p-4 rounded-lg sticky top-20 h-fit ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Welcome, John</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Your educational journey is 45% complete
            </p>
            <Progress value={45} className="mt-2" />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Available Modules</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dashboard Settings</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <p className="text-sm text-gray-500">
                      Configure your dashboard layout and appearance
                    </p>
                    <div className="flex items-center justify-between">
                      <span>Dark mode</span>
                      <Switch 
                        checked={darkMode} 
                        onCheckedChange={setDarkMode} 
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2">
              {availableModules
                .filter(module => !activeModules.includes(module.id))
                .map(module => (
                  <motion.div 
                    key={module.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-2 rounded-md flex items-center justify-between ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="flex items-center">
                      <module.icon className="w-4 h-4 mr-2" />
                      <span className="text-sm">{module.title}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0" 
                      onClick={() => addModule(module.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs justify-start">
                <Calendar className="h-3 w-3 mr-1" />
                Schedule
              </Button>
              <Button variant="outline" size="sm" className="text-xs justify-start">
                <BookOpen className="h-3 w-3 mr-1" />
                Resources
              </Button>
              <Button variant="outline" size="sm" className="text-xs justify-start">
                <DollarSign className="h-3 w-3 mr-1" />
                Financing
              </Button>
              <Button variant="outline" size="sm" className="text-xs justify-start">
                <GraduationCap className="h-3 w-3 mr-1" />
                Applications
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content - Modular Dashboard */}
        <motion.div 
          className="md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {activeModules.map(moduleId => {
            const module = getModuleDetails(moduleId);
            const isExpanded = moduleExpanded[moduleId];
            
            return (
              <motion.div
                key={moduleId}
                layoutId={moduleId}
                className={`${isExpanded ? 'md:col-span-2' : 'md:col-span-1'}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                draggable
                onDragStart={() => handleDragStart(moduleId)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(moduleId)}
              >
                <Card className={`h-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${getModuleColor(moduleId)}`}>
                          <module.icon className="h-4 w-4" />
                        </div>
                        <CardTitle>{module.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleModuleExpanded(moduleId)}
                        >
                          {isExpanded ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:text-red-500"
                          onClick={() => removeModule(moduleId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {moduleId === "programs" && (
                      <div className="space-y-3">
                        {renderProgramModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "progress" && (
                      <div className="space-y-4">
                        {renderProgressModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "timeline" && (
                      <div>
                        {renderTimelineModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "finances" && (
                      <div className="space-y-3">
                        {renderFinanceModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "institutions" && (
                      <div className="space-y-3">
                        {renderInstitutionsModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "global" && (
                      <div className="space-y-3">
                        {renderGlobalModule(darkMode)}
                      </div>
                    )}
                    {moduleId === "skills" && (
                      <div className="space-y-3">
                        {renderSkillsModule(darkMode)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          
          {activeModules.length === 0 && (
            <div className={`col-span-2 flex flex-col items-center justify-center p-12 rounded-lg border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              <Layers className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Your dashboard is empty</h3>
              <p className="text-sm text-center mb-4">
                Add modules from the sidebar to personalize your education dashboard
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Add Your First Module</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Modules</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {availableModules.map(module => (
                      <div 
                        key={module.id} 
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-100"
                        onClick={() => {
                          addModule(module.id);
                        }}
                      >
                        <div className="flex items-center">
                          <module.icon className="w-5 h-5 mr-2" />
                          <div>
                            <h4 className="font-medium">{module.title}</h4>
                            <p className="text-sm text-gray-500">{module.description}</p>
                          </div>
                        </div>
                        <Plus className="w-5 h-5" />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Helper function to get module color
function getModuleColor(moduleId: string) {
  switch (moduleId) {
    case 'programs': return 'bg-blue-100 text-blue-600';
    case 'progress': return 'bg-green-100 text-green-600';
    case 'timeline': return 'bg-purple-100 text-purple-600';
    case 'finances': return 'bg-amber-100 text-amber-600';
    case 'institutions': return 'bg-indigo-100 text-indigo-600';
    case 'global': return 'bg-cyan-100 text-cyan-600';
    case 'skills': return 'bg-rose-100 text-rose-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// Module content rendering functions
function renderProgramModule(darkMode: boolean) {
  return (
    <>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} flex justify-between items-center`}>
        <div>
          <h4 className="font-medium text-sm">Computer Science Master's</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Stanford University</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>98% Match</div>
      </div>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} flex justify-between items-center`}>
        <div>
          <h4 className="font-medium text-sm">Data Science Bootcamp</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>General Assembly</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>92% Match</div>
      </div>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} flex justify-between items-center`}>
        <div>
          <h4 className="font-medium text-sm">UX/UI Design Course</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Interaction Design Foundation</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>85% Match</div>
      </div>
    </>
  );
}

function renderProgressModule(darkMode: boolean) {
  return (
    <>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Core Skills</span>
          <span className="text-sm font-medium">75%</span>
        </div>
        <Progress value={75} className="h-2" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Specialization</span>
          <span className="text-sm font-medium">45%</span>
        </div>
        <Progress value={45} className="h-2" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Project Portfolio</span>
          <span className="text-sm font-medium">60%</span>
        </div>
        <Progress value={60} className="h-2" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Certifications</span>
          <span className="text-sm font-medium">30%</span>
        </div>
        <Progress value={30} className="h-2" />
      </div>
    </>
  );
}

function renderTimelineModule(darkMode: boolean) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 ml-2.5"></div>
      
      <div className="mb-4 relative">
        <div className={`absolute left-0 w-5 h-5 rounded-full -ml-2.5 ${darkMode ? 'bg-purple-800' : 'bg-purple-500'}`}></div>
        <div className="ml-4">
          <h4 className="text-sm font-medium">Bachelor's in Computer Science</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>2018 - 2022</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Completed with honors, focused on AI and Machine Learning</p>
        </div>
      </div>
      
      <div className="mb-4 relative">
        <div className={`absolute left-0 w-5 h-5 rounded-full -ml-2.5 ${darkMode ? 'bg-purple-800' : 'bg-purple-500'}`}></div>
        <div className="ml-4">
          <h4 className="text-sm font-medium">Software Engineering Internship</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Summer 2022</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Contributed to backend development at a tech startup</p>
        </div>
      </div>
      
      <div className="mb-4 relative">
        <div className={`absolute left-0 w-5 h-5 rounded-full -ml-2.5 ${darkMode ? 'bg-purple-200 border border-purple-500' : 'bg-purple-200 border border-purple-500'}`}></div>
        <div className="ml-4">
          <h4 className="text-sm font-medium">Master's in Data Science</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>2023 - Present</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>In progress, expected completion in 2024</p>
        </div>
      </div>
      
      <div className="relative">
        <div className={`absolute left-0 w-5 h-5 rounded-full -ml-2.5 border-2 border-dashed ${darkMode ? 'border-purple-400 bg-gray-800' : 'border-purple-400 bg-white'}`}></div>
        <div className="ml-4">
          <h4 className="text-sm font-medium">Future: AI Specialization</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Recommended Next Step</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Advanced certification in ML/AI applications</p>
        </div>
      </div>
    </div>
  );
}

function renderFinanceModule(darkMode: boolean) {
  return (
    <>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-amber-50'} space-y-2`}>
        <div className="flex justify-between">
          <h4 className="font-medium text-sm">Merit Scholarship</h4>
          <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>$15,000</div>
        </div>
        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Deadline: November 15, 2023</p>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="text-xs h-7">Apply Now</Button>
        </div>
      </div>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-amber-50'} space-y-2`}>
        <div className="flex justify-between">
          <h4 className="font-medium text-sm">Tech Student Grant</h4>
          <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>$8,500</div>
        </div>
        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Deadline: December 1, 2023</p>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="text-xs h-7">Apply Now</Button>
        </div>
      </div>
    </>
  );
}

function renderInstitutionsModule(darkMode: boolean) {
  return (
    <>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-indigo-50'} flex items-center space-x-3`}>
        <div className="w-10 h-10 bg-indigo-100 rounded-md flex items-center justify-center">
          <GraduationCap className={`w-6 h-6 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
        </div>
        <div>
          <h4 className="font-medium text-sm">Stanford University</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Top programs in Computer Science</p>
        </div>
      </div>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-indigo-50'} flex items-center space-x-3`}>
        <div className="w-10 h-10 bg-indigo-100 rounded-md flex items-center justify-center">
          <GraduationCap className={`w-6 h-6 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
        </div>
        <div>
          <h4 className="font-medium text-sm">MIT</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Leading technology research institution</p>
        </div>
      </div>
    </>
  );
}

function renderGlobalModule(darkMode: boolean) {
  return (
    <>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-cyan-50'} flex items-center space-x-3`}>
        <div className="w-10 h-10 bg-cyan-100 rounded-md flex items-center justify-center">
          <Globe className={`w-6 h-6 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
        </div>
        <div>
          <h4 className="font-medium text-sm">Study Abroad - UK</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Exchange programs at Oxford and Cambridge</p>
        </div>
      </div>
      <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-cyan-50'} flex items-center space-x-3`}>
        <div className="w-10 h-10 bg-cyan-100 rounded-md flex items-center justify-center">
          <Globe className={`w-6 h-6 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
        </div>
        <div>
          <h4 className="font-medium text-sm">International Internships</h4>
          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tech opportunities in Singapore and Japan</p>
        </div>
      </div>
    </>
  );
}

function renderSkillsModule(darkMode: boolean) {
  return (
    <>
      <div>
        <h4 className="text-sm font-medium mb-2">Current Skills Analysis</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs">Programming</span>
              <span className="text-xs">Expert</span>
            </div>
            <Progress value={90} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs">Data Analysis</span>
              <span className="text-xs">Intermediate</span>
            </div>
            <Progress value={65} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs">Machine Learning</span>
              <span className="text-xs">Beginner</span>
            </div>
            <Progress value={40} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs">Project Management</span>
              <span className="text-xs">Intermediate</span>
            </div>
            <Progress value={70} className="h-1.5" />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Recommended Skill Development</h4>
        <div className={`p-2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-rose-50'} text-xs`}>
          Focus on enhancing Machine Learning and AI capabilities to align with career goals
        </div>
      </div>
    </>
  );
} 