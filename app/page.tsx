'use client';

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Globe, BrainCircuit, BookOpen, ChevronDown } from "lucide-react";
import { FloatingImages } from "@/components/ui/FloatingImages";
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { gsap } from 'gsap';

export default function Home() {
  // Refs for animation targets
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State for interaction effects
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const [scrollPromptVisible, setScrollPromptVisible] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Video error handler
  const handleVideoError = () => {
    console.error("Video failed to load");
    setVideoError(true);
  };

  // Handle entrance animations
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    // Handle scroll prompt visibility
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setScrollPromptVisible(false);
      } else {
        setScrollPromptVisible(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Wait for DOM elements to be available before applying animations
    // Using a small delay to ensure elements are rendered
    const animationTimeout = setTimeout(() => {
      try {
        // Check if hero elements exist before creating context
        const heroTitleExists = document.querySelector('.hero-title');
        const heroDescriptionExists = document.querySelector('.hero-description');
        const heroButtonsExists = document.querySelector('.hero-buttons');
        
        if (!heroTitleExists || !heroDescriptionExists || !heroButtonsExists) {
          console.log('Hero elements not found, skipping animations');
          return;
        }
        
        // Create a GSAP context for proper cleanup
        const ctx = gsap.context(() => {
          // Hero section entrance animation with timeline
          const tl = gsap.timeline({ delay: 0.5 });
          
          // Animate hero elements in sequence
          tl.from(".hero-title", { 
            opacity: 0, 
            y: 30, 
            duration: 0.8,
            ease: "power3.out" 
          })
          .from(".hero-description", { 
            opacity: 0, 
            y: 30, 
            duration: 0.8,
            ease: "power3.out" 
          }, "-=0.6")
          .from(".hero-buttons", { 
            opacity: 0, 
            y: 30, 
            duration: 0.8,
            ease: "power3.out" 
          }, "-=0.6");
          
          // Only animate scroll prompt if it exists
          const scrollPrompt = document.querySelector('.scroll-prompt');
          if (scrollPrompt) {
            tl.from(".scroll-prompt", { 
              opacity: 0, 
              y: 20, 
              duration: 0.6,
              ease: "power3.out",
              repeat: -1,
              yoyo: true
            }, "-=0.2");
          }
          
          // Features section animation on scroll - only if element exists
          if (featuresRef.current && document.querySelector('.features-text')) {
            gsap.from(".features-text", { 
              opacity: 0,
              x: -30,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: featuresRef.current,
                start: "top 80%",
                toggleActions: "play none none none"
              }
            });
            
            // Check if feature cards exist
            if (document.querySelector('.feature-card')) {
              gsap.from(".feature-card", { 
                opacity: 0,
                x: 30,
                stagger: 0.15,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: featuresRef.current,
                  start: "top 80%",
                  toggleActions: "play none none none"
                }
              });
            }
          }
          
          // Testimonial animation on scroll - only if element exists
          if (testimonialRef.current && document.querySelector('.testimonial')) {
            gsap.from(".testimonial", { 
              opacity: 0,
              scale: 0.9,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: testimonialRef.current,
                start: "top 80%",
                toggleActions: "play none none none"
              }
            });
          }
        }, heroRef); // Scope the context to our heroRef container
        
        // Store context in ref for cleanup
        return () => {
          // Clear all animations and ScrollTrigger instances
          ctx.revert(); // This kills all GSAP animations created in this context
        };
      } catch (error) {
        // Gracefully handle GSAP errors
        console.error('Error initializing animations:', error);
      }
    }, 500); // 500ms delay to ensure DOM is fully loaded
    
    // Proper cleanup function
    return () => {
      // Remove scroll event listener
      window.removeEventListener('scroll', handleScroll);
      
      // Clear the animation timeout
      clearTimeout(animationTimeout);
    };
  }, []);  // Empty dependency array means this runs once on mount

  return (
    <PageWrapper allowGuest={true}>
      <div className="relative min-h-screen overflow-x-hidden">
        <FloatingImages />

        {/* Hero Section - With smaller text and buttons */}
        <main 
          ref={heroRef} 
          className="relative z-30 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 pt-16 pb-24 text-center bg-gradient-to-b from-background/80 via-background/70 to-background/80"
        >
          <div className="max-w-3xl mt-[-80px]">
            <h1 className="hero-title text-4xl md:text-5xl font-extrabold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Navigate Your Academic Future with Vista
            </h1>
            <p className="hero-description text-lg md:text-xl text-foreground/90 mb-6 max-w-2xl mx-auto">
              Your AI-powered guide to discovering the perfect educational path, 
              tailored to your unique goals and potential.
            </p>
            <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="default" 
                className="group relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-primary/40"
                onMouseEnter={() => setIsHovered(1)}
                onMouseLeave={() => setIsHovered(null)}
              >
                <span className={`absolute inset-0 bg-primary-foreground/10 transform transition-transform duration-300 ${isHovered === 1 ? 'scale-90 opacity-100' : 'scale-0 opacity-0'}`}></span>
                <Link href="/profile-wizard" className="flex items-center">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              {/* <Button 
                variant="outline" 
                size="default" 
                className="relative overflow-hidden transition-all duration-300"
                onMouseEnter={() => setIsHovered(2)}
                onMouseLeave={() => setIsHovered(null)}
              >
                <span className={`absolute inset-0 bg-primary/10 transform transition-transform duration-300 ${isHovered === 2 ? 'scale-90 opacity-100' : 'scale-0 opacity-0'}`}></span>
                <Link href="/auth/login">Log In</Link>
              </Button> */}
            </div>
          </div>
          
          {/* Move the scroll prompt up */}
          {scrollPromptVisible && (
            <div className="scroll-prompt absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' })}>
              <span className="text-sm text-foreground/70 mb-2">Discover More</span>
              <ChevronDown className="h-6 w-6 text-primary animate-bounce" />
            </div>
          )}
        </main>

        {/* Features Section - Restructured with vertical cards and text on left */}
        <section ref={featuresRef} className="relative z-20 py-24 px-4 bg-gradient-to-b from-background to-background/95">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Text Container - Left side (on larger screens) */}
              <div className="features-text lg:w-2/5 lg:sticky lg:top-24 lg:self-start">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">Your Partner in Educational Success</h2>
                <p className="text-lg text-foreground/80 mb-6">
                  With decades of expertise in global education and AI-powered insights, Vista helps you navigate the complex world of academic choices and career paths.
                </p>
                <p className="text-lg text-foreground/80 mb-6">
                  Our Education Adviser provides tailored recommendations based on your unique profile, connecting you with the perfect programs worldwide.
                </p>
                <div className="hidden lg:block">
                  <Button 
                    size="default" 
                    className="group"
                  >
                    <Link href="/profile-wizard" className="flex items-center">
                      Create Your Profile
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Feature Cards - Right side, stacked vertically */}
              <div className="lg:w-3/5">
                <div className="space-y-6">
                  {/* Feature Card 1 */}
                  <div className="feature-card bg-muted/40 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-102 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shrink-0">
                        <GraduationCap className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Personalized Recommendations</h3>
                        <p className="text-foreground/70">
                          Receive tailored university and program suggestions based on your profile, interests, and academic strengths.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Feature Card 2 */}
                  <div className="feature-card bg-muted/40 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-102 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shrink-0">
                        <Globe className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Global Opportunities</h3>
                        <p className="text-foreground/70">
                          Explore educational pathways in the UK, USA, Canada, France, Italy, and beyond with expert local insights.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Feature Card 3 */}
                  <div className="feature-card bg-muted/40 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-102 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shrink-0">
                        <BrainCircuit className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
                        <p className="text-foreground/70">
                          Make confident decisions with advanced AI analysis of your profile, preferences, and potential matches.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Feature Card 4 */}
                  <div className="feature-card bg-muted/40 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-102 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shrink-0">
                        <BookOpen className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Expert Guidance</h3>
                        <p className="text-foreground/70">
                          Get instant answers about applications, programs, and admissions from our AI assistant, supported by expert knowledge.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile-only button */}
                  <div className="lg:hidden mt-6">
                    <Button 
                      size="default" 
                      className="w-full group"
                    >
                      <Link href="/profile-wizard" className="flex items-center justify-center w-full">
                        Explore Programs
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonial/CTA Section - Keep as is */}
        <section ref={testimonialRef} className="relative z-20 py-20 px-4 bg-gradient-to-b from-background/95 to-background">
          <div className="container mx-auto">
            <div className="testimonial bg-primary/5 rounded-2xl p-8 md:p-12 shadow-lg max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-1/2">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary">
                    Join Thousands of Successful Students
                  </h2>
                  <p className="mb-6 text-foreground/80">
                    "Vista transformed my search for the right university. 
                    The personalized recommendations perfectly matched my goals, and the AI assistant
                    answered my questions instantly & on point. I'm now attending my dream program!"
                  </p>
                  <div className="flex items-center">
                    <div className="mr-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        <img 
                          src="/images/11062b_a5f0c551c3bf4fefbd09cf3ad35aace7~mv2.jpeg" 
                          alt="Student portrait" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">Vinay E.</p>
                      <p className="text-sm text-foreground/70">International Medical Student</p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2 bg-foreground/5 p-6 rounded-xl">
                  <div className="mb-6 rounded-lg overflow-hidden relative" style={{ minHeight: "200px" }}>
                    {!videoError ? (
                      <video 
                        ref={videoRef}
                        className="w-full h-auto rounded-lg"
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        preload="auto"
                        onError={handleVideoError}
                      >
                        <source src="/images/file2.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                        <p className="text-foreground/70">Video preview unavailable</p>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Begin Your Success Story</h3>
                  <p className="mb-6 text-foreground/80">
                    Take the first step toward your ideal educational journey with personalized guidance.
                  </p>
                  <Button className="w-full group" size="lg">
                    <Link href="/profile-wizard" className="flex items-center justify-center w-full">
                      Start Your Vista Journey
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
