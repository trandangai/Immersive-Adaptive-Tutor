import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-neutral-800 dark:text-neutral-200">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Application
        </button>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Last updated: October 14, 2026
        </span>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            Legal & Privacy
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            For <strong>Immersive Adaptive Tutor</strong> (accessible at{' '}
            <a href="https://aitechvibething.me" className="text-blue-600 dark:text-blue-400 underline">
              https://aitechvibething.me
            </a>
            )
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            1. Introduction
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            Welcome to <strong>Immersive Adaptive Tutor</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you access and use our web application at <strong>https://aitechvibething.me</strong>.
          </p>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            By using Immersive Adaptive Tutor, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with the terms of this policy, please do not use the service.
          </p>
        </section>

        {/* Data We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            2. Information We Collect
          </h2>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p><strong>A. Account & Profile Information:</strong> When you sign in using Google Sign-In, we receive basic authentication profile information from Google, including your unique user ID, full name, email address, and profile photo URL.</p>
            <p><strong>B. Learning & Session Data:</strong> To provide personalized cognitive tutoring, we store your learning roadmaps, study sessions, comprehension scores, knowledge mastery levels, and flashcard practice history in your private database account.</p>
            <p><strong>C. Study Materials & Audio Input:</strong> Study materials you paste, upload, or import, as well as your voice audio during interactive Socratic voice sessions, are processed in real time solely to generate explanations, answers, and adaptive learning feedback.</p>
          </div>
        </section>

        {/* Google User Data & Drive API Disclosure */}
        <section className="space-y-3 p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            3. Google User Data & Drive Integration (Limited Use)
          </h2>
          <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
            <p>
              Our application requests access to the <code>https://www.googleapis.com/auth/drive.readonly</code> scope to allow you to select and import your own educational documents (such as PDF files, Google Docs, or text notes) directly into the study environment.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Strict Read-Only Access:</strong> We only read the specific files that you explicitly select in the Google Drive picker modal. We never modify, overwrite, delete, or create files in your Google Drive.
              </li>
              <li>
                <strong>No Sharing or Sale of User Data:</strong> We do not sell, rent, or share Google user data or your Google Drive documents with any third-party advertisers, brokers, or data brokers.
              </li>
              <li>
                <strong>Ephemeral In-Memory Tokens:</strong> Google OAuth access tokens are kept in volatile browser memory only for the duration of your active session to fulfill user-initiated requests and are never stored in unencrypted persistent storage.
              </li>
              <li>
                <strong>Google API Services User Data Policy Compliance:</strong> Immersive Adaptive Tutor&apos;s use and transfer of information received from Google APIs adheres to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 font-medium underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </li>
            </ul>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            4. How We Use Information
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            <li>To authenticate you and maintain your authenticated session.</li>
            <li>To synthesize uploaded study materials into step-by-step learning roadmaps.</li>
            <li>To conduct live Socratic voice conversations and measure comprehension.</li>
            <li>To generate personalized flashcard decks and review summaries.</li>
            <li>To protect against unauthorized access, abuse, and technical faults.</li>
          </ul>
        </section>

        {/* Data Retention & Deletion */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            5. Data Retention & Deletion
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            We retain your study history and flashcards only for as long as your account remains active. You may request the deletion of your account and all associated study data at any time by contacting us at the email provided below. Upon receiving your request, all personal data linked to your account in our database will be permanently purged within 30 days.
          </p>
        </section>

        {/* Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            6. Data Security
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            We employ industry-standard technical and organizational security measures, including HTTPS encryption in transit and Google Cloud/Firebase security rules at rest, to safeguard your data against accidental loss, unauthorized access, alteration, or disclosure.
          </p>
        </section>

        {/* Contact Information */}
        <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            7. Contact Us
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact the developer:
          </p>
          <div className="text-sm bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-1">
            <p><strong>Application:</strong> Immersive Adaptive Tutor</p>
            <p><strong>Website:</strong> <a href="https://aitechvibething.me" className="text-blue-600 dark:text-blue-400 underline">https://aitechvibething.me</a></p>
            <p><strong>Email:</strong> <a href="mailto:trandangai@gmail.com" className="text-blue-600 dark:text-blue-400 underline">trandangai@gmail.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
};
