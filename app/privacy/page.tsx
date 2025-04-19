'use client';

import React from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
// @ts-ignore
import ReactMarkdown from 'react-markdown';

// Raw text content from docs/Privacy Notice.md
const privacyContent = `
Privacy Notice

Last updated: 24/01/2025

1. Introduction
Vista Ltd ("we", "us", "our") is committed to protecting and respecting your privacy. This privacy notice explains how we collect, use, and protect your personal data when you use our services or interact with us through our website, chatbot, email, or telephone.

2. Who We Are
Vista Ltd is a consultancy firm registered in the United Kingdom, providing immigration, business, finance, and legal services. We are registered as a data controller with the Information Commissioner's Office (ICO).

Contact details:
- Address: Flat 3, 1 Montenotte Road, Haringey, London, United Kingdom
- Email: Hello@vista-consultants.com
- Phone: 07943673501

3. Personal Data We Collect
We collect and process the following types of personal data:
3.1 Information you provide us:
- Name and contact details
- Nationality and immigration status
- Educational background
- Business and financial information
- Employment history
- Family information (where relevant to immigration applications)
- Communication preferences
- Any other information you choose to share with us through our services


3.2 Technical Data:
- IP address
- Browser type and version
- Device information
- Chat logs from our chatbot
- Time and date of service usage

4. How We Collect Your Data
We collect your personal data through:
- Direct interactions via our website
- Our chatbot service
- Email correspondence
- Telephone conversations
- Client registration forms
- Service enquiries

5. How We Use Your Data
We process your personal data for the following purposes:
- To provide tailored immigration, business, and legal advice
- To manage our relationship with you
- To improve our services
- To comply with legal obligations
- To maintain accurate records
- To communicate important service updates
- To provide requested information about our services

6. Legal Basis for Processing
We process your data under the following legal bases:
- Contract performance: To provide our professional services
- Legal obligation: To comply with UK immigration and business laws
- Legitimate interests: To provide and improve our services
- Consent: Where specifically requested for certain processing activities

7. Data Security
We implement appropriate technical and organizational measures to protect your personal data, including:
- Secure storage systems
- Access controls
- Regular security assessments
- Staff training on data protection
- Secure data backup systems

8. Data Retention
We retain your personal data only for as long as necessary to:
- Provide our services
- Comply with legal obligations
- Resolve disputes
- Enforce our agreements
Specific retention periods vary based on the type of data and applicable legal requirements.

9. Your Rights
Under UK GDPR, you have the right to:
- Access your personal data
- Rectify inaccurate data
- Request erasure of your data
- Restrict processing
- Data portability
- Object to processing
- Withdraw consent

To exercise these rights, please contact us at Hello@vista-consultants.com

10. International Transfers
We process and store data within the UK and European Economic Area (EEA). If any data transfer outside the UK/EEA becomes necessary, we ensure appropriate safeguards are in place.

11. Updates to This Notice
We may update this privacy notice periodically. Any significant changes will be communicated to you and the latest version will be available on our website.

12. Complaints
If you have concerns about our data processing, please contact us first. You also have the right to complain to the ICO (www.ico.org.uk).

13. Contact Us
For privacy-related queries, contact our Data Protection Officer:
- Email: Hello@vista-consultants.com
- Phone: 07943673501
- Address: Flat 3, 1 Montenotte Road, Haringey, London, United Kingdom
`;

export default function PrivacyPage() {
  return (
    <PageWrapper allowGuest={true}>
      <div className="flex flex-col items-center min-h-[80vh] bg-gradient-to-b from-background/80 to-background/95 py-10 px-2">
        <div className="bg-white/90 dark:bg-muted/80 rounded-2xl shadow-xl max-w-2xl w-full p-8 border border-border/30">
          <div className="flex flex-col items-center mb-6">
            <img src="/vista_logo.png" alt="Vista Logo" className="h-12 mb-2" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-primary mb-1 text-center">Privacy Notice</h1>
            <div className="w-16 h-1 bg-primary/30 rounded-full mb-2" />
            <span className="text-xs text-muted-foreground">Last updated: 24/01/2025</span>
          </div>
          <div className="prose prose-sm md:prose-base max-w-none text-foreground/90">
            <ReactMarkdown>{privacyContent.replace('Privacy Notice\n\nLast updated: 24/01/2025\n\n', '')}</ReactMarkdown>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
} 