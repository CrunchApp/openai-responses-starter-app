'use client';

import React from 'react';
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Globe, MapPin, GraduationCap, Users, Award, Star, Printer, Download, CheckCircle, ArrowLeft, BookOpen, Building, Heart, Target, Shield, Briefcase } from "lucide-react";

export default function BrochurePage() {
  const handlePrint = () => {
    window.print();
  };
  
  const handleSavePDF = () => {
    // For PDF, we'll use the print dialog with specific instructions
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>ویستا - بروشور خدمات</title>
            <style>
              body { 
                font-family: 'Vazir', 'Tahoma', Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                direction: rtl;
              }
              .instruction {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #0ea5e9;
                border-radius: 12px;
                padding: 24px;
                margin: 20px 0;
                box-shadow: 0 10px 25px rgba(14, 165, 233, 0.1);
              }
              h1 { color: #0f172a; margin-bottom: 1rem; }
              h3 { color: #0ea5e9; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <h1>ذخیره بروشور به صورت PDF</h1>
            <div class="instruction">
              <h3>راهنمای ذخیره‌سازی PDF:</h3>
              <ol style="text-align: right; max-width: 500px; margin: 0 auto; line-height: 1.8;">
                <li>این پنجره را ببندید</li>
                <li>روی دکمه "چاپ بروشور" کلیک کنید</li>
                <li>در پنجره چاپ، قسمت "Destination" را به "Save as PDF" تغییر دهید</li>
                <li>گزینه "Background graphics" را فعال کنید</li>
                <li>دکمه "Save" را کلیک کنید</li>
              </ol>
            </div>
            <button onclick="window.close()" style="padding: 12px 24px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">بستن پنجره</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };



  return (
    <PageWrapper allowGuest={true}>
      <div className="min-h-screen bg-white print:bg-white font-persian" dir="rtl">
        {/* Print/PDF Action Buttons - Hidden in print */}
        <div className="fixed top-6 left-6 z-50 flex gap-3 print:hidden">
          <Button
            onClick={handlePrint}
            className="bg-white text-slate-800 hover:bg-slate-50 shadow-xl border-2 border-slate-200 hover:border-primary transition-all duration-300"
            size="sm"
          >
            <Printer className="h-4 w-4 ml-2" />
            چاپ بروشور
          </Button>
          <Button
            onClick={handleSavePDF}
            className="bg-gradient-to-r from-primary to-blue-600 text-white hover:from-primary/90 hover:to-blue-600/90 shadow-xl border-0 transition-all duration-300"
            size="sm"
          >
            <Download className="h-4 w-4 ml-2" />
            ذخیره PDF
          </Button>
        </div>
        
        {/* Print Header - Only visible in print */}
        <div className="hidden print:block text-center py-6 border-b-4 border-gradient-to-r from-primary to-blue-600 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">بروشور خدمات ویستا مشاوران</h1>
          <p className="text-base text-slate-700 mt-2 font-medium">www.vista-consultants.com | ۰۲۰ ۷۹۴۶ ۰۹۵۸ +۴۴</p>
          <div className="w-32 h-1 bg-gradient-to-r from-primary to-blue-600 mx-auto mt-3 rounded-full"></div>
        </div>
        
        {/* Artistic Cover Section */}
        <section className="brochure-cover relative h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden print:h-auto print:page-break-after-always">
          {/* Advanced Artistic Background */}
          <div className="absolute inset-0">
            {/* Layered Geometric Shapes */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-blue-500/5 rounded-full blur-3xl transform rotate-12"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/8 to-purple-500/5 rounded-full blur-2xl"></div>
            <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-bl from-emerald-500/6 to-teal-500/4 rounded-full blur-xl transform -rotate-45"></div>
            
            {/* Decorative Moroccan-inspired patterns */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 400 400">
                <defs>
                  <pattern id="islamicPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary"/>
                    <path d="M30 10 L50 30 L30 50 L10 30 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-500"/>
                    <circle cx="30" cy="30" r="5" fill="currentColor" className="text-indigo-500" opacity="0.4"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#islamicPattern)" />
              </svg>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-8 py-16">
            {/* Elegant Logo Container with Islamic geometric frame */}
            <div className="mb-12 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-full blur-2xl transform scale-150"></div>
              <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border-2 border-white/50">
                <div className="absolute inset-2 border-2 border-primary/20 rounded-2xl"></div>
                <img 
                  src="/vista_logo.png" 
                  alt="Vista Consultants" 
                  className="h-32 w-auto mx-auto drop-shadow-lg print:h-24 relative z-10"
                />
              </div>
            </div>

            {/* Enhanced Main Title with artistic frame */}
            <div className="mb-12 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-blue-500/5 to-indigo-500/5 rounded-3xl blur-xl"></div>
              <div className="relative bg-white/30 backdrop-blur-sm rounded-3xl p-8 border border-white/40">
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-primary rounded-full"></div>
                    <Star className="h-8 w-8 text-primary" />
                    <div className="w-24 h-0.5 bg-gradient-to-l from-transparent via-primary to-primary rounded-full"></div>
                  </div>
                </div>
                
                <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 tracking-wide leading-tight print:text-6xl">
                  ویستا مشاوران
                </h1>
                
                <h2 className="text-4xl font-medium text-slate-700 mb-6 print:text-2xl">
                  شریک قابل اعتماد شما در موفقیت بین‌المللی
                </h2>
                
                <div className="w-48 h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500 mx-auto rounded-full"></div>
                
                {/* Subtitle with mission */}
                <p className="text-xl text-slate-600 mt-6 leading-relaxed max-w-3xl mx-auto print:text-base">
                  ارائه خدمات توسط شرکت Vista Consultants، ثبت شده در بریتانیا
                </p>
              </div>
            </div>

            {/* Enhanced Statistics with artistic containers */}
            <div className="mb-16 max-w-5xl">
              <p className="text-2xl text-slate-600 leading-relaxed mb-8 print:text-lg">
                با بیش از یک دهه تجربه در ارائه خدمات تخصصی مهاجرت، تحصیل، کسب‌وکار و مشاوره‌های مالی، 
                ویستا مشاوران همراه مطمئن شما در مسیر دستیابی به اهداف بین‌المللی‌تان است
              </p>
              
              <div className="grid grid-cols-4 gap-6 text-center">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-primary/20 shadow-lg">
                  <div className="text-3xl font-bold text-primary mb-2">+۱۰</div>
                  <div className="text-slate-600 text-sm">سال تجربه</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-500/20 shadow-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">+۱۰۰۰</div>
                  <div className="text-slate-600 text-sm">مشتری موفق</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-indigo-500/20 shadow-lg">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">۶</div>
                  <div className="text-slate-600 text-sm">کشور هدف</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border-2 border-emerald-500/20 shadow-lg">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">۱۰۰٪</div>
                  <div className="text-slate-600 text-sm">رضایت مشتری</div>
                </div>
              </div>
            </div>

            {/* Premium Contact Banner with enhanced styling */}
            <div className="contact-banner relative">
              <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-md rounded-3xl"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-white/50">
                <div className="absolute inset-4 border border-primary/20 rounded-2xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">تماس با ما</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="contact-item flex flex-col items-center gap-3 group">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Globe className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">وب‌سایت</div>
                        <div className="font-semibold text-slate-700">www.vista-consultants.com</div>
                      </div>
                    </div>
                    <div className="contact-item flex flex-col items-center gap-3 group">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Phone className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">تلفن تماس</div>
                        <div className="font-semibold text-slate-700">۰۲۰ ۷۹۴۶ ۰۹۵۸ +۴۴</div>
                      </div>
                    </div>
                    <div className="contact-item flex flex-col items-center gap-3 group">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">ایمیل</div>
                        <div className="font-semibold text-slate-700">info@vista-consultants.com</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Artistic Section Divider */}
        <div className="hidden print:block relative py-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4">
            <Star className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        {/* Enhanced Services Overview Section */}
        <section className="print-section relative py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50 print:bg-white print:py-8 print:page-break-before-always" data-section="خدمات">
          {/* Artistic Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-primary/8 to-blue-500/4 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-64 h-64 bg-gradient-to-tr from-indigo-500/6 to-purple-500/4 rounded-full blur-3xl"></div>
            
            {/* Geometric decorative elements */}
            <div className="absolute top-1/4 left-1/2 w-40 h-40 border border-primary/10 rounded-full transform -translate-x-1/2 rotate-45"></div>
            <div className="absolute bottom-1/4 right-1/3 w-32 h-32 border border-blue-500/10 rounded-full transform rotate-12"></div>
          </div>

          <div className="relative z-10">
            {/* Artistic Section Header */}
            <div className="text-center mb-20 print:mb-8">
              {/* Ornamental top border */}
              <div className="flex items-center justify-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary to-primary rounded-full"></div>
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <Star className="h-8 w-8 text-primary" />
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <div className="w-20 h-0.5 bg-gradient-to-l from-transparent via-primary to-primary rounded-full"></div>
                </div>
              </div>
              
              <h2 className="text-6xl font-bold bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8 print:text-4xl">
                خدمات جامع ویستا
              </h2>
              
              <div className="max-w-6xl mx-auto">
                <p className="text-2xl text-slate-600 leading-relaxed mb-8 print:text-lg print:leading-relaxed">
                  ویستا مشاوران با ارائه خدمات جامع و تخصصی در حوزه‌های مختلف، 
                  شریک معتمد شما در مسیر موفقیت بین‌المللی است
                </p>
                
                {/* Service categories preview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-primary/20">
                    <GraduationCap className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">تحصیل</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
                    <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">کسب‌وکار</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20">
                    <Target className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">سرمایه‌گذاری</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                    <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-700">مشاوره</div>
                  </div>
                </div>
              </div>
              
              <div className="w-32 h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500 mx-auto mt-8 rounded-full"></div>
            </div>

            <div className="container mx-auto px-8">
              {/* Enhanced Service Cards Grid */}
              <div className="services-grid grid md:grid-cols-2 lg:grid-cols-3 gap-10 print:gap-6">
                
                {/* Educational Services */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-blue-500/5 to-indigo-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-primary/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <GraduationCap className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">تحصیل در خارج</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-blue-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      مشاوره تخصصی برای پذیرش در دانشگاه‌های معتبر فرانسه، انگلستان، آمریکا، کانادا و ایتالیا. 
                      راهنمایی کامل از انتخاب رشته تا اخذ ویزا و استقرار
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">مشاوره انتخاب دانشگاه</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">تهیه مدارک ویزا</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Career Consultation */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-green-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-emerald-500/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <Briefcase className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">مشاوره شغلی</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      مشاوره اشتغال بین‌المللی، آماده‌سازی رزومه و مدارک حرفه‌ای، 
                      راهنمایی مصاحبه و ارزیابی صلاحیت‌های تحصیلی و کاری
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">ارزیابی مهارت‌ها</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">آماده‌سازی مصاحبه</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Investment Services */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-violet-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-purple-500/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-purple-500 rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <Target className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">سرمایه‌گذاری</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      مشاوره متخصصانه سرمایه‌گذاری در بازارهای مختلف، راهنمایی انتخاب بهترین گزینه‌ها 
                      و کسب اقامت از طریق سرمایه‌گذاری
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">تحلیل بازار</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">اقامت سرمایه‌گذاری</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Startup Services */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-amber-500/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-amber-500 rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <Building className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">استارتاپ</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      پشتیبانی جامع کسب‌وکارها در تمام مراحل، از ثبت و راه‌اندازی شرکت 
                      تا توسعه طرح تجاری و ورود به بازارهای بین‌المللی
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">ثبت شرکت</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">طرح تجاری</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Services */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-red-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-rose-500/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <Heart className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">امور مالی</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      مشاوره امور مالی بین‌المللی، افتتاح حساب بانکی، انتقال وجه 
                      و تهیه مدارک مالی مورد نیاز برای ویزا و اقامت
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">حساب بانکی</span>
                      </div>
                      <div className="flex items-center gap-2 text-rose-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">انتقال وجه</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Consulting */}
                <div className="service-card group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/50 group-hover:border-cyan-500/30 print:p-4">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-500 rounded-full opacity-60"></div>
                    <div className="flex items-center gap-4 mb-6 print:mb-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 print:w-12 print:h-12">
                        <Shield className="h-10 w-10 text-white print:h-6 print:w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 print:text-lg">کسب‌وکار</h3>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 mt-2 rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-4 print:text-sm">
                      مشاوره توسعه بین‌المللی کسب‌وکارها، راهنمایی مقررات مالیاتی، 
                      قوانین تجاری و تطبیق با استانداردهای بین‌المللی
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">قوانین تجاری</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">توسعه بین‌المللی</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Elegant Section Divider */}
        <div className="hidden print:block relative py-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Enhanced France Visa Services */}
        <section className="visa-services print-section relative py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 print:bg-white print:py-8 print:page-break-before-always" data-section="فرانسه">
          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/8 to-indigo-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-violet-500/6 to-purple-500/4 rounded-full blur-2xl"></div>
            
            {/* French-inspired geometric elements */}
            <div className="absolute top-1/3 right-1/4 w-64 h-64 border-2 border-blue-500/10 rounded-lg transform rotate-45"></div>
            <div className="absolute bottom-1/3 left-1/4 w-48 h-48 border border-indigo-500/10 rounded-full"></div>
          </div>

          <div className="relative z-10 container mx-auto px-8">
            {/* Artistic Section Header */}
            <div className="text-center mb-20 print:mb-8">
              {/* French flag inspired decorative element */}
              <div className="flex items-center justify-center mb-12">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
                  <div className="w-6 h-6 bg-white rounded-full border-2 border-blue-600"></div>
                  <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                </div>
              </div>
              
              <h2 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-8 print:text-4xl">
                خدمات ویزای فرانسه
              </h2>
              
              <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8 print:text-lg">
                راهی مطمئن به سرزمین هنر و فرهنگ با خدمات تخصصی ویزای فرانسه
              </p>
              
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 mx-auto rounded-full"></div>
            </div>

            {/* Enhanced Visa Cards */}
            <div className="space-y-16 print:space-y-8">
              
              {/* Visitor Visa - Comprehensive Section */}
              <div className="visa-section relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border-2 border-white/60 print:p-6">
                  
                  {/* Header */}
                  <div className="flex items-center gap-6 mb-10 print:mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg print:w-16 print:h-16">
                      <Globe className="h-12 w-12 text-white print:h-8 print:w-8" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-bold text-slate-900 mb-3 print:text-2xl">ویزای بلندمدت بازدید‌کننده فرانسه</h3>
                      <p className="text-lg text-blue-600 font-medium print:text-sm">(Visa de long séjour "visiteur")</p>
                      <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mt-3 rounded-full"></div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-12 print:gap-6">
                    
                    {/* Left Column - Description & Features */}
                    <div>
                      <div className="mb-8 print:mb-4">
                        <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">معرفی</h4>
                        <p className="text-slate-600 leading-relaxed mb-6 print:text-sm">
                          ویزای بلندمدت فرانسه ("Visa de long séjour visiteur") به اتباع غیر اتحادیه اروپا اجازه می‌دهد تا حداکثر به مدت یک سال در فرانسه اقامت داشته باشند بدون انجام فعالیت شغلی. این ویزا قابل تمدید سالانه است و در صورتی که متقاضی پس از ورود به فرانسه موفق به یافتن شغل و عقد قرارداد کاری شود، امکان تغییر آن به ویزای کاری طبق مقررات اداره مهاجرت فرانسه وجود دارد.
                        </p>
                      </div>

                      <div className="mb-8 print:mb-4">
                        <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">تغییر وضعیت به خوداشتغالی</h4>
                        <p className="text-slate-600 leading-relaxed text-sm print:text-xs">
                          دارنده ویزای بازدیدکننده در سال اول اجازه هیچ فعالیت شغلی، چه به صورت کارمندی و چه خوداشتغالی، ندارد. با این حال، در پایان سال اول و هنگام تمدید، امکان درخواست تغییر وضعیت به اقامت «حرفه آزاد (profession libérale)» برای شروع فعالیت خوداشتغالی یا ثبت‌نام به عنوان اتوانترپرونر وجود دارد.
                        </p>
                      </div>

                      {/* Key Features */}
                      <div className="grid grid-cols-2 gap-4 mb-8 print:mb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                          <span className="text-sm text-slate-600">قابل تمدید سالانه</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                          <span className="text-sm text-slate-600">تغییر وضعیت به کاری</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                          <span className="text-sm text-slate-600">اقامت تا یک سال</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                          <span className="text-sm text-slate-600">امکان خوداشتغالی</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Process & Pricing */}
                    <div>
                      <div className="mb-8 print:mb-4">
                        <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">مراحل درخواست ویزا</h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">1</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">مشاوره اولیه و بررسی شرایط</p>
                              <p className="text-xs text-slate-600">ارزیابی مدارک و شرایط مالی</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">2</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">آماده‌سازی پرونده</p>
                              <p className="text-xs text-slate-600">راهنمایی برای تهیه مدارک شامل منابع مالی، محل اقامت و بیمه درمانی</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">3</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">تکمیل و ارسال درخواست ویزا</p>
                              <p className="text-xs text-slate-600">از طریق کنسولگری فرانسه یا مرکز VFS</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">4</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">پیگیری روند بررسی</p>
                              <p className="text-xs text-slate-600">مشاوره و راهنمایی در مراحل پس از تأیید</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">5</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">امور اداری پس از ورود</p>
                              <p className="text-xs text-slate-600">ثبت و تأیید ویزا در اداره مهاجرت ظرف ۳ ماه</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Pricing Box */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                        <h5 className="text-lg font-bold text-slate-900 mb-4">هزینه خدمات ویزای بازدیدکننده</h5>
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 print:text-xl">
                          ۱٬۰۰۰ یورو
                        </div>
                        <p className="text-sm text-slate-600 mb-4">(به جز هزینه‌های جانبی)</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">پیش‌پرداخت:</span>
                            <span className="font-medium text-slate-900">۳۰۰ یورو</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">تکمیل مدارک:</span>
                            <span className="font-medium text-slate-900">۴۰۰ یورو</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ارسال به VFS:</span>
                            <span className="font-medium text-slate-900">۳۰۰ یورو</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Visa - Comprehensive Section */}
              <div className="visa-section relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border-2 border-white/60 print:p-6">
                  
                  {/* Header */}
                  <div className="flex items-center gap-6 mb-10 print:mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-lg print:w-16 print:h-16">
                      <GraduationCap className="h-12 w-12 text-white print:h-8 print:w-8" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-bold text-slate-900 mb-3 print:text-2xl">ویزای دانشجویی فرانسه</h3>
                      <p className="text-lg text-indigo-600 font-medium print:text-sm">(Visa de long séjour "étudiant")</p>
                      <div className="w-32 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 mt-3 rounded-full"></div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-12 print:gap-6">
                    
                    {/* Left Column - Description & Features */}
                    <div>
                      <div className="mb-8 print:mb-4">
                        <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">معرفی</h4>
                        <p className="text-slate-600 leading-relaxed mb-6 print:text-sm">
                          ویزای دانشجویی فرانسه برای تحصیل در دانشگاه‌ها یا مؤسسات آموزش عالی فرانسه صادر می‌شود و امکان کار پاره‌وقت دانشجویی را نیز فراهم می‌کند.
                        </p>
                      </div>

                      {/* Key Features */}
                      <div className="grid grid-cols-2 gap-4 mb-8 print:mb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm text-slate-600">کار پاره‌وقت مجاز</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm text-slate-600">Campus France</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm text-slate-600">انتخاب دانشگاه</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm text-slate-600">راهنمایی اسکان</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Process & Pricing */}
                    <div>
                      <div className="mb-8 print:mb-4">
                        <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">مراحل درخواست ویزای دانشجویی</h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-bold">1</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">پذیرش تحصیلی</p>
                              <p className="text-xs text-slate-600">جستجو، انتخاب و ثبت‌نام در دانشگاه یا مؤسسه آموزشی و اخذ نامه پذیرش</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-bold">2</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">آماده‌سازی پرونده و مدارک مالی</p>
                              <p className="text-xs text-slate-600">شامل منابع مالی، محل اقامت و بیمه درمانی</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-bold">3</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">ثبت‌نام در Campus France</p>
                              <p className="text-xs text-slate-600">تکمیل فرم‌ها و ارسال مدارک به سامانه رسمی</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-bold">4</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">رزرو وقت ملاقات ویزا</p>
                              <p className="text-xs text-slate-600">ارائه مدارک به کنسولگری یا مرکز VFS</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-bold">5</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">پیگیری تا صدور ویزا</p>
                              <p className="text-xs text-slate-600">همراهی در تمامی مراحل تا دریافت ویزا</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Pricing Box */}
                      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border-2 border-indigo-200">
                        <h5 className="text-lg font-bold text-slate-900 mb-4">هزینه خدمات ویزای دانشجویی</h5>
                        <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-4 print:text-xl">
                          ۱٬۲۰۰ یورو
                        </div>
                        <p className="text-sm text-slate-600 mb-4">(به جز هزینه‌های جانبی)</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">پیش‌پرداخت:</span>
                            <span className="font-medium text-slate-900">۴۰۰ یورو</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">تکمیل مدارک:</span>
                            <span className="font-medium text-slate-900">۴۰۰ یورو</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">پیگیری ویزا:</span>
                            <span className="font-medium text-slate-900">۴۰۰ یورو</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 print:p-4">
                <h4 className="text-xl font-bold text-slate-900 mb-4 print:text-lg">یادداشت‌های مهم</h4>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <p className="text-slate-600">
                      کلیه هزینه‌ها بدون احتساب هزینه‌های رسمی، بیمه، رزرو مسکن و شهریه دانشگاه است.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <p className="text-slate-600">
                      نتیجه نهایی منوط به پذیرش توسط نهادهای آموزشی و مقامات مهاجرت فرانسه است.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Section Divider */}
        <div className="hidden print:block relative py-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <Globe className="h-5 w-5 text-emerald-500" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Enhanced UK Visa Services */}
        <section className="print-section relative py-24 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 print:bg-white print:py-8 print:page-break-before-always" data-section="بریتانیا">
          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-500/8 to-green-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-teal-500/6 to-cyan-500/4 rounded-full blur-2xl"></div>
            
            {/* UK-inspired geometric elements */}
            <div className="absolute top-1/4 left-1/3 w-32 h-32 border-2 border-emerald-500/10 transform rotate-12"></div>
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 border border-green-500/10 rounded-lg transform -rotate-12"></div>
          </div>

          <div className="relative z-10 container mx-auto px-8">
            {/* Artistic Section Header */}
            <div className="text-center mb-20 print:mb-8">
              {/* UK flag inspired decorative element */}
              <div className="flex items-center justify-center mb-12">
                <div className="relative w-16 h-10">
                  <div className="absolute inset-0 bg-blue-800 rounded"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-white"></div>
                    <div className="absolute w-0.5 h-full bg-white"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500"></div>
                    <div className="absolute w-0.5 h-full bg-red-500"></div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-8 print:text-4xl">
                خدمات ویزای بریتانیا
              </h2>
              
              <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-8 print:text-lg">
                دروازه‌ای به فرصت‌های بی‌نظیر در قلب اروپا با خدمات جامع ویزای بریتانیا
              </p>
              
              <div className="w-32 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 mx-auto rounded-full"></div>
            </div>

            {/* Enhanced Visa Services - Comprehensive Grid */}
            <div className="space-y-16 print:space-y-8">
              
              {/* Professional Visas Row */}
              <div>
                <h3 className="text-3xl font-bold text-center text-slate-900 mb-10 print:text-2xl print:mb-6">ویزاهای حرفه‌ای و کسب‌وکار</h3>
                <div className="grid lg:grid-cols-3 gap-8 print:gap-4">
                  
                  {/* Skilled Worker Visa - Enhanced */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-emerald-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <Briefcase className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">ویزای نیروی کار ماهر</h4>
                        <p className="text-sm text-emerald-600 font-medium mb-4">Self-Sponsorship Skilled Worker</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          مناسب افرادی که می‌خواهند از طریق شرکت خود، برای خودشان یا نیروهای کلیدی ویزای کاری دریافت کنند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-slate-600">ثبت شرکت، افتتاح حساب بانکی</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-slate-600">اخذ مجوز اسپانسرشیپ</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-slate-600">پشتیبانی مالیاتی یک‌ساله</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۱۶٬۰۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">شامل کلیه خدمات</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Innovator Founder Visa - Enhanced */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-blue-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <Target className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">ویزای کارآفرین نوآور</h4>
                        <p className="text-sm text-blue-600 font-medium mb-4">Innovator Founder Visa</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          برای افرادی با ایده کسب‌وکار نوآورانه، قابل اجرا و مقیاس‌پذیر که می‌خواهند در بریتانیا بیزنس راه‌اندازی کنند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-600">توسعه ایده مناسب</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-600">تدوین بیزنس پلن حرفه‌ای</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-600">اخذ تأییدیه رسمی</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۱۰٬۵۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">شامل کلیه خدمات</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Representative of Overseas Business - Enhanced */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-pink-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-purple-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <Building className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">نماینده شرکت خارجی</h4>
                        <p className="text-sm text-purple-600 font-medium mb-4">Representative of Overseas Business</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          برای شرکت‌هایی که می‌خواهند اولین شعبه یا دفتر رسمی خود را در بریتانیا راه‌اندازی کنند و یک نماینده ارسال می‌کنند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-slate-600">تحلیل ساختار شرکت</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-slate-600">تهیه مدارک شرکتی</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-slate-600">استقرار کامل در بریتانیا</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۶٬۵۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">شامل کلیه خدمات</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational Visas Row */}
              <div>
                <h3 className="text-3xl font-bold text-center text-slate-900 mb-10 print:text-2xl print:mb-6">ویزاهای تحصیلی</h3>
                <div className="grid lg:grid-cols-3 gap-8 print:gap-4">
                  
                  {/* Adult Student Visa */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-orange-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <GraduationCap className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">ویزای دانشجویی</h4>
                        <p className="text-sm text-orange-600 font-medium mb-4">Student Visa (+16 سال)</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          ویزایی برای متقاضیان بالای ۱۶ سال که قصد تحصیل در دانشگاه‌ها یا مؤسسات آموزشی معتبر بریتانیا را دارند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-slate-600">انتخاب دانشگاه و رشته</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-slate-600">تهیه اقامتگاه</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-slate-600">خدمات پرداخت ارزی</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۳٬۰۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">+ خدمات رایگان</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Child Student Visa */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-red-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-pink-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <BookOpen className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">ویزای دانش‌آموز کودک</h4>
                        <p className="text-sm text-pink-600 font-medium mb-4">Child Student Visa (4-17 سال)</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          ویزایی برای کودکان ۴ تا ۱۷ سال که قصد تحصیل در مدارس خصوصی انگلستان را دارند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-pink-500" />
                            <span className="text-xs text-slate-600">ثبت‌نام در مدرسه مناسب</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-pink-500" />
                            <span className="text-xs text-slate-600">تهیه اقامتگاه ایمن</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-pink-500" />
                            <span className="text-xs text-slate-600">تحویل از فرودگاه</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۴٬۰۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">+ خدمات رایگان</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parent of Child Student Visa */}
                  <div className="visa-card group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-cyan-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-white/60 group-hover:border-indigo-500/30 print:p-6">
                      
                      {/* Header */}
                      <div className="text-center mb-8 print:mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 print:w-12 print:h-12 print:mb-3">
                          <Heart className="h-10 w-10 text-white print:h-6 print:w-6" />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2 print:text-lg">ویزای والد دانش‌آموز</h4>
                        <p className="text-sm text-indigo-600 font-medium mb-4">Parent of Child Student</p>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto rounded-full"></div>
                      </div>

                      <div className="space-y-6 print:space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          ویژه والدینی که تنها به‌منظور همراهی فرزند دانش‌آموز زیر ۱۲ سال وارد بریتانیا می‌شوند.
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs text-slate-600">تنظیم پرونده والد</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs text-slate-600">اقامتگاه مشترک</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs text-slate-600">پشتیبانی زندگی روزمره</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 border border-indigo-200">
                          <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2 print:text-lg">
                            از ۲٬۵۰۰ پوند
                          </div>
                          <p className="text-xs text-slate-500">+ خدمات رایگان</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Highlights */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl p-10 border-2 border-emerald-200 print:p-6">
                <h4 className="text-2xl font-bold text-center text-slate-900 mb-8 print:text-xl print:mb-4">مزایای خدمات ویستا برای بریتانیا</h4>
                <div className="grid md:grid-cols-3 gap-8 print:gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 print:w-12 print:h-12">
                      <Shield className="h-8 w-8 text-white print:h-6 print:w-6" />
                    </div>
                    <h5 className="text-lg font-bold text-slate-900 mb-2 print:text-base">تضمین کیفیت</h5>
                    <p className="text-sm text-slate-600">همه خدمات با ضمانت کیفیت و پشتیبانی مستمر ارائه می‌شود</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 print:w-12 print:h-12">
                      <Users className="h-8 w-8 text-white print:h-6 print:w-6" />
                    </div>
                    <h5 className="text-lg font-bold text-slate-900 mb-2 print:text-base">تیم متخصص</h5>
                    <p className="text-sm text-slate-600">کارشناسان مجرب و آشنا به قوانین جدید بریتانیا</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 print:w-12 print:h-12">
                      <Award className="h-8 w-8 text-white print:h-6 print:w-6" />
                    </div>
                    <h5 className="text-lg font-bold text-slate-900 mb-2 print:text-base">نرخ موفقیت بالا</h5>
                    <p className="text-sm text-slate-600">بیش از ۹۵٪ درخواست‌ها با موفقیت به نتیجه رسیده‌اند</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Artistic Section Divider */}
        <div className="hidden print:block relative py-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-6">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-amber-500" />
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <Users className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
        
        {/* Premium Experts Section */}
        <section className="print-section relative py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 print:bg-white print:py-8 print:page-break-before-always" data-section="متخصصان">
          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/8 to-orange-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-yellow-500/6 to-amber-500/4 rounded-full blur-2xl"></div>
          </div>

          <div className="relative z-10 container mx-auto px-8">
            {/* Section Header */}
            <div className="text-center mb-20 print:mb-8">
              <div className="inline-flex items-center gap-4 mb-8">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-amber-500 rounded-full"></div>
                <h2 className="text-6xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent print:text-4xl">
                  تیم متخصصان ما
                </h2>
                <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-amber-500 rounded-full"></div>
              </div>
              <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed print:text-lg">
                کارشناسان مجرب و متعهد ویستا با سال‌ها تجربه بین‌المللی، 
                راهنمایان اختصاصی شما در مسیر موفقیت هستند
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 mx-auto mt-8 rounded-full"></div>
            </div>

            <div className="experts-grid grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Expert 1 */}
              <div className="expert-card group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <img 
                      src="/images/Advisors/Vista Consulting Group (4)_edited_edited_edited.jpg" 
                      alt="کارشناس ویستا" 
                      className="w-full h-full object-cover rounded-full shadow-lg group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">دکتر امیر حسینی</h4>
                  <p className="title text-primary font-semibold mb-3">مدیر عامل و کارشناس ارشد مهاجرت</p>
                  <p className="desc text-gray-600 text-sm leading-relaxed">
                    ۱۵ سال تجربه در مشاوره مهاجرت و تحصیل در اروپا و آمریکا. 
                    متخصص ویزاهای کاری و سرمایه‌گذاری
                  </p>
                </div>
              </div>

              {/* Expert 2 */}
              <div className="expert-card group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <img 
                      src="/images/Advisors/IMG_7568 1 (1).jpg" 
                      alt="کارشناس ویستا" 
                      className="w-full h-full object-cover rounded-full shadow-lg group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">مهندس سارا محمدی</h4>
                  <p className="title text-blue-600 font-semibold mb-3">کارشناس ارشد تحصیلات بین‌المللی</p>
                  <p className="desc text-gray-600 text-sm leading-relaxed">
                    ۱۰ سال تجربه در مشاوره تحصیلی دانشگاه‌های اروپا. 
                    متخصص پذیرش دانشگاه‌های فرانسه و انگلستان
                  </p>
                </div>
              </div>

              {/* Expert 3 */}
              <div className="expert-card group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <img 
                      src="/images/Advisors/1cb746a0-1586-4ac1-ba5a-c12a055d1988 1 (1).jpg" 
                      alt="کارشناس ویستا" 
                      className="w-full h-full object-cover rounded-full shadow-lg group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">دکتر رضا کریمی</h4>
                  <p className="title text-green-600 font-semibold mb-3">مشاور حقوقی و کسب‌وکار</p>
                  <p className="desc text-gray-600 text-sm leading-relaxed">
                    ۱۲ سال تجربه در مشاوره حقوقی و ثبت شرکت‌ها. 
                    متخصص قوانین تجاری بین‌المللی و سرمایه‌گذاری
                  </p>
                </div>
              </div>

              {/* Expert 4 */}
              <div className="expert-card group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <img 
                      src="/images/Advisors/WhatsApp Image 2025-01-13 at 19_edited_edited_edited.jpg" 
                      alt="کارشناس ویستا" 
                      className="w-full h-full object-cover rounded-full shadow-lg group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">خانم لیلا احمدی</h4>
                  <p className="title text-purple-600 font-semibold mb-3">مشاور مالی و سرمایه‌گذاری</p>
                  <p className="desc text-gray-600 text-sm leading-relaxed">
                    ۸ سال تجربه در مشاوره مالی بین‌المللی. 
                    متخصص سرمایه‌گذاری املاک و کسب‌وکار در اروپا
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider - Print Only */}
        <div className="hidden print:block w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent my-8"></div>
        
        {/* Contact Information */}
        <section className="contact-section print-section py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white print:bg-white print:text-gray-900 print:py-8" data-section="تماس">
          <div className="container mx-auto px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-5xl font-bold mb-8">با ما تماس بگیرید</h2>
                <p className="text-xl text-gray-300 mb-12 leading-relaxed print:text-sm print:mb-6">
                  برای مشاوره رایگان ۳۰ دقیقه‌ای با متخصصان ویستا، همین امروز با ما تماس بگیرید. 
                  اولین قدم به سوی موفقیت با ویستا آغاز می‌شود.
                </p>

                <div className="contact-grid space-y-6">
                  <div className="contact-item flex items-center gap-4">
                    <div className="contact-icon w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="contact-details">
                      <h5 className="text-gray-300 text-sm">تلفن تماس</h5>
                      <p className="text-xl font-semibold">+44 (0) 20 7946 0958</p>
                    </div>
                  </div>

                  <div className="contact-item flex items-center gap-4">
                    <div className="contact-icon w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="contact-details">
                      <h5 className="text-gray-300 text-sm">ایمیل</h5>
                      <p className="text-xl font-semibold">info@vista-consultants.com</p>
                    </div>
                  </div>

                  <div className="contact-item flex items-center gap-4">
                    <div className="contact-icon w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div className="contact-details">
                      <h5 className="text-gray-300 text-sm">وب‌سایت</h5>
                      <p className="text-xl font-semibold">www.vista-consultants.com</p>
                    </div>
                  </div>

                  <div className="contact-item flex items-center gap-4">
                    <div className="contact-icon w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="contact-details">
                      <h5 className="text-gray-300 text-sm">آدرس</h5>
                      <p className="text-xl font-semibold">لندن، انگلستان</p>
                      <p className="text-gray-300">شرکت ثبت‌شده در بریتانیا</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-3xl blur-3xl"></div>
                <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <h3 className="text-3xl font-bold mb-6">رزرو مشاوره رایگان</h3>
                  <p className="text-gray-300 mb-8 leading-relaxed">
                    در ویستا، ما راه‌حل‌های شخصی‌سازی‌شده و تخصصی ارائه می‌دهیم تا به شما در 
                    دستیابی به اهداف تحصیلی، شغلی، مالی و تجاری‌تان کمک کنیم.
                  </p>
                  
                  <div className="space-y-4">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-lg rounded-xl">
                      رزرو مشاوره رایگان
                    </Button>
                    <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 py-4 text-lg rounded-xl">
                      درخواست تماس
                    </Button>
                  </div>

                  <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-center text-gray-300 mb-4">
                      دسترسی به دستیار هوشمند ویستا
                    </p>
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 py-3 rounded-xl">
                      app.vista-consultants.com
                    </Button>
                    <p className="text-center text-sm text-gray-400 mt-2">
                      (در حال حاضر برای دانشجویان)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Print Instructions - Only visible on screen */}
        <div className="print:hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mx-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Printer className="h-5 w-5" />
              <span className="font-semibold">راهنمای چاپ:</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                چاپ بروشور
              </Button>
              <Button
                onClick={handleSavePDF}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                ذخیره PDF
              </Button>
            </div>
          </div>
          <p className="text-blue-700 text-sm mt-2">
            برای بهترین نتیجه چاپ، در تنظیمات چاپ گزینه "چاپ پس‌زمینه" را فعال کنید. بروشور بهینه‌شده برای چاپ در ۴-۶ صفحه است.
          </p>
        </div>
        
        {/* Footer */}
        <footer className="bg-gray-900 py-12 border-t border-gray-800 print:bg-white print:text-gray-900 print:py-6 print:border-t-2 print:border-primary">
          <div className="container mx-auto px-8">
            <div className="footer-content flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-4 mb-6 md:mb-0">
                <img 
                  src="/vista_logo.png" 
                  alt="Vista Consultants" 
                  className="h-12 w-auto print:h-8"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">ویستا</h3>
                  <p className="text-gray-400 text-sm">شریک قابل اعتماد شما در موفقیت جهانی</p>
                </div>
              </div>
              
              <div className="text-center md:text-left">
                <p className="text-gray-400 text-sm">
                  © ۲۰۲۴ ویستا. تمامی حقوق محفوظ است.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  شرکت ثبت‌شده در بریتانیا | Vista Consultants Ltd.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Enhanced Print Styles */}
        <style jsx global>{`
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            
            @page {
              margin: 10mm;
              size: A4;
              @bottom-center {
                content: "ویستا مشاوران - شریک قابل اعتماد شما در موفقیت جهانی";
                font-size: 8pt;
                color: #6366f1 !important;
                border-top: 2px solid #6366f1 !important;
                padding-top: 3mm;
                font-family: Arial, sans-serif;
                font-weight: 600;
              }
              @bottom-right {
                content: "صفحه " counter(page, persian);
                font-size: 8pt;
                color: #6366f1 !important;
                font-family: Arial, sans-serif;
                font-weight: bold;
              }
            }
            
            body { 
              font-size: 10pt !important; 
              line-height: 1.4 !important;
              color: #1f2937 !important;
              background: white !important;
              font-family: 'Arial', 'Tahoma', sans-serif;
              margin: 0;
              padding: 0;
            }
            
            /* Hide non-essential elements */
            .print\:hidden {
              display: none !important;
            }
            
            /* Enhanced background fixes */
            .bg-gradient-to-br,
            .bg-gradient-to-b,
            .bg-gradient-to-r,
            .bg-gradient-to-l,
            .bg-gradient-to-t {
              background: white !important;
            }
            
            /* Text color fixes for all sections */
            .text-white {
              color: #1f2937 !important;
            }
            
            .text-gray-300 {
              color: #4b5563 !important;
            }
            
            .text-gray-400 {
              color: #6b7280 !important;
            }
            
            .text-slate-600 {
              color: #475569 !important;
            }
            
            .text-slate-700 {
              color: #334155 !important;
            }
            
            .text-slate-800 {
              color: #1e293b !important;
            }
            
            .text-slate-900 {
              color: #0f172a !important;
            }
            
            /* Enhanced background color fixes */
            .bg-gray-900,
            .bg-gray-800,
            .bg-slate-900,
            .bg-slate-800 {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
              border: 3px solid #6366f1 !important;
              border-radius: 12px !important;
            }
            
            /* ARTISTIC COVER PAGE - Enhanced */
            .brochure-cover {
              height: 100vh !important;
              page-break-after: always !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              border: 4px solid #6366f1 !important;
              border-radius: 20px !important;
              margin: 0 !important;
              padding: 2rem !important;
              background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #ddd6fe 100%) !important;
              position: relative !important;
            }
            
            .brochure-cover::before {
              content: '';
              position: absolute;
              top: 1.5rem;
              left: 1.5rem;
              right: 1.5rem;
              bottom: 1.5rem;
              border: 2px solid #c7d2fe;
              border-radius: 16px;
              z-index: 1;
            }
            
            .brochure-cover > div {
              z-index: 2 !important;
              position: relative !important;
            }
            
            /* Enhanced cover text */
            .brochure-cover h1 {
              font-size: 36pt !important;
              font-weight: bold !important;
              color: #6366f1 !important;
              text-align: center !important;
              margin-bottom: 1rem !important;
            }
            
            .brochure-cover h2 {
              font-size: 20pt !important;
              color: #1e293b !important;
              text-align: center !important;
              margin-bottom: 1rem !important;
            }
            
            .brochure-cover p {
              font-size: 12pt !important;
              color: #475569 !important;
              text-align: center !important;
              line-height: 1.6 !important;
            }
            
            /* ENHANCED SERVICES SECTION */
            section[data-section="خدمات"] {
              page-break-before: always !important;
              page-break-after: avoid !important;
              background: white !important;
              padding: 1.5rem !important;
              border: 3px solid #6366f1 !important;
              border-radius: 16px !important;
              margin: 1rem 0 !important;
            }
            
            section[data-section="خدمات"]::before {
              content: "خدمات جامع ویستا";
              display: block;
              font-size: 20pt !important;
              font-weight: bold;
              color: #6366f1 !important;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1rem;
              border: 2px solid #6366f1;
              border-radius: 12px;
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
            }
            
            section[data-section="خدمات"] .services-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr 1fr !important;
              gap: 1rem !important;
              margin-top: 1rem !important;
            }
            
            section[data-section="خدمات"] .service-card {
              border: 2px solid #e5e7eb !important;
              border-radius: 12px !important;
              padding: 1rem !important;
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%) !important;
              margin-bottom: 0 !important;
              min-height: 120px !important;
              break-inside: avoid !important;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            
            section[data-section="خدمات"] .service-card h3 {
              font-size: 11pt !important;
              margin-bottom: 0.75rem !important;
              color: #1f2937 !important;
              font-weight: bold;
            }
            
            section[data-section="خدمات"] .service-card p {
              font-size: 8pt !important;
              line-height: 1.4 !important;
              margin-bottom: 0.5rem !important;
              color: #374151 !important;
            }
            
            /* ENHANCED FRANCE SERVICES */
            section[data-section="فرانسه"] {
              page-break-before: always !important;
              page-break-after: avoid !important;
              background: white !important;
              padding: 1.5rem !important;
              border: 3px solid #3b82f6 !important;
              border-radius: 16px !important;
              margin: 1rem 0 !important;
            }
            
            section[data-section="فرانسه"]::before {
              content: "خدمات ویزای فرانسه";
              display: block;
              font-size: 18pt !important;
              font-weight: bold;
              color: #3b82f6 !important;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1rem;
              border: 2px solid #3b82f6;
              border-radius: 12px;
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
            }
            
            section[data-section="فرانسه"] .space-y-16,
            section[data-section="فرانسه"] .space-y-8 {
              display: grid !important;
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
            
            section[data-section="فرانسه"] .visa-section {
              border: 2px solid #3b82f6 !important;
              border-radius: 12px !important;
              padding: 1rem !important;
              background: linear-gradient(135deg, #f8faff 0%, #eff6ff 100%) !important;
              margin: 0 !important;
              break-inside: avoid !important;
            }
            
            section[data-section="فرانسه"] .visa-section h3 {
              font-size: 14pt !important;
              color: #1e40af !important;
              margin-bottom: 0.75rem !important;
            }
            
            section[data-section="فرانسه"] .visa-section p {
              font-size: 8pt !important;
              line-height: 1.3 !important;
              color: #374151 !important;
            }
            
            section[data-section="فرانسه"] .grid.lg\\:grid-cols-2 {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 1rem !important;
            }
            
            /* ENHANCED UK SERVICES */
            section[data-section="بریتانیا"] {
              page-break-before: always !important;
              page-break-after: avoid !important;
              background: white !important;
              padding: 1.5rem !important;
              border: 3px solid #059669 !important;
              border-radius: 16px !important;
              margin: 1rem 0 !important;
            }
            
            section[data-section="بریتانیا"]::before {
              content: "خدمات ویزای بریتانیا";
              display: block;
              font-size: 18pt !important;
              font-weight: bold;
              color: #059669 !important;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1rem;
              border: 2px solid #059669;
              border-radius: 12px;
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
            }
            
            section[data-section="بریتانیا"] .space-y-16,
            section[data-section="بریتانیا"] .space-y-8 {
              display: grid !important;
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
            
            section[data-section="بریتانیا"] .grid.lg\\:grid-cols-3 {
              display: grid !important;
              grid-template-columns: 1fr 1fr 1fr !important;
              gap: 0.75rem !important;
            }
            
            section[data-section="بریتانیا"] .visa-card {
              border: 2px solid #059669 !important;
              border-radius: 12px !important;
              padding: 1rem !important;
              background: linear-gradient(135deg, #f0fdf4 0%, #ecfccb 100%) !important;
              text-align: center !important;
              min-height: 140px !important;
              break-inside: avoid !important;
            }
            
            section[data-section="بریتانیا"] .visa-card h4 {
              font-size: 12pt !important;
              color: #065f46 !important;
              margin-bottom: 0.5rem !important;
              font-weight: bold;
            }
            
            section[data-section="بریتانیا"] .visa-card p {
              font-size: 8pt !important;
              line-height: 1.3 !important;
              color: #374151 !important;
            }
            
            /* ENHANCED EXPERTS SECTION */
            section[data-section="متخصصان"] {
              page-break-before: always !important;
              page-break-after: avoid !important;
              background: white !important;
              padding: 1.5rem !important;
              border: 3px solid #7c3aed !important;
              border-radius: 16px !important;
              margin: 1rem 0 !important;
            }
            
            section[data-section="متخصصان"]::before {
              content: "تیم متخصصان ما";
              display: block;
              font-size: 18pt !important;
              font-weight: bold;
              color: #7c3aed !important;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1rem;
              border: 2px solid #7c3aed;
              border-radius: 12px;
              background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%) !important;
            }
            
            section[data-section="متخصصان"] .experts-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 1rem !important;
            }
            
            section[data-section="متخصصان"] .expert-card {
              border: 2px solid #7c3aed !important;
              border-radius: 12px !important;
              padding: 1rem !important;
              background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%) !important;
              text-align: center !important;
              min-height: 160px !important;
              break-inside: avoid !important;
            }
            
            section[data-section="متخصصان"] .expert-card img {
              width: 50px !important;
              height: 50px !important;
              margin: 0 auto 0.75rem auto !important;
              border: 2px solid #7c3aed !important;
              border-radius: 50% !important;
            }
            
            section[data-section="متخصصان"] .expert-card h4 {
              font-size: 12pt !important;
              margin-bottom: 0.5rem !important;
              color: #1f2937 !important;
              font-weight: bold;
            }
            
            section[data-section="متخصصان"] .expert-card .title {
              font-size: 9pt !important;
              font-weight: bold;
              color: #7c3aed !important;
              margin-bottom: 0.75rem !important;
            }
            
            section[data-section="متخصصان"] .expert-card .desc {
              font-size: 8pt !important;
              line-height: 1.4 !important;
              color: #374151 !important;
              margin-bottom: 0;
            }
            
            /* ENHANCED CONTACT SECTION */
            section[data-section="تماس"] {
              page-break-before: always !important;
              background: white !important;
              padding: 1.5rem !important;
              border: 3px solid #dc2626 !important;
              border-radius: 16px !important;
              margin: 1rem 0 !important;
            }
            
            section[data-section="تماس"]::before {
              content: "اطلاعات تماس";
              display: block;
              font-size: 18pt !important;
              font-weight: bold;
              color: #dc2626 !important;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1rem;
              border: 2px solid #dc2626;
              border-radius: 12px;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
            }
            
            section[data-section="تماس"] .grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 1rem !important;
              margin-bottom: 1rem !important;
            }
            
            section[data-section="تماس"] .contact-item {
              display: flex !important;
              align-items: center !important;
              gap: 0.75rem !important;
              padding: 1rem !important;
              border: 2px solid #dc2626 !important;
              border-radius: 12px !important;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
            }
            
            section[data-section="تماس"] .relative {
              display: none !important;
            }
            
            /* General improvements */
            .visa-price {
              font-size: 14pt !important;
              font-weight: bold !important;
              color: #6366f1 !important;
            }
            
            .text-primary {
              color: #6366f1 !important;
            }
            
            /* Hide decorative elements in print */
            .absolute,
            .fixed {
              display: none !important;
            }
            
            /* Ensure proper spacing */
            .py-24,
            .py-20,
            .py-16,
            .py-12 {
              padding-top: 0 !important;
              padding-bottom: 0 !important;
            }
            
            .mb-20,
            .mb-16,
            .mb-12,
            .mb-8 {
              margin-bottom: 1rem !important;
            }
            
            /* Footer enhancement */
            footer {
              border-top: 3px solid #6366f1 !important;
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
              padding: 1rem !important;
              margin-top: 1rem !important;
              border-radius: 12px !important;
              break-inside: avoid !important;
            }
            
            /* Ensure clean page breaks */
            section {
              break-inside: avoid !important;
              orphans: 2 !important;
              widows: 2 !important;
            }
            
            /* Icons and decorative elements */
            .blur-3xl,
            .blur-2xl,
            .blur-xl,
            .backdrop-blur-sm {
              filter: none !important;
              backdrop-filter: none !important;
            }
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}