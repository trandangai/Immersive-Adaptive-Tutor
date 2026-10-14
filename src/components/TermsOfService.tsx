import React from 'react';
import { ArrowLeft, FileText, CheckSquare, AlertTriangle, Scale, Mail } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <FileText className="w-3.5 h-3.5" />
            Terms of Service
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            For <strong>Immersive Adaptive Tutor</strong> (accessible at{' '}
            <a href="https://aitechvibething.me" className="text-blue-600 dark:text-blue-400 underline">
              https://aitechvibething.me
            </a>
            )
          </p>
        </div>

        {/* Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" />
            1. Acceptance of Terms
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            By accessing or using <strong>Immersive Adaptive Tutor</strong> (&quot;the Service&quot;), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree to these Terms, you may not access or use the Service.
          </p>
        </section>

        {/* Description of Service */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            2. Description of the Service
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            Immersive Adaptive Tutor is an interactive AI-assisted educational platform that converts user-provided study materials, notes, or imported Google Drive documents into structured learning roadmaps, real-time Socratic voice tutoring sessions, and spaced repetition flashcard decks.
          </p>
        </section>

        {/* User Responsibilities & Acceptable Use */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            3. Acceptable Use & User Conduct
          </h2>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p>You agree to use the Service solely for lawful educational and personal study purposes. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Upload or transmit materials that infringe on copyright, intellectual property, or privacy rights of any third party.</li>
              <li>Upload harmful, abusive, harassing, defamatory, or unlawful content.</li>
              <li>Attempt to reverse engineer, decompile, disable, or disrupt the integrity or security of the Service or its underlying infrastructure.</li>
              <li>Use automated scripts or bots to overload or abuse the platform&apos;s AI endpoints.</li>
            </ul>
          </div>
        </section>

        {/* Third-Party Integrations & Google Services */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            4. Third-Party Services & Google Drive
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            The Service offers optional integration with Google Sign-In and Google Drive. When you choose to link or authorize your Google account, you grant the Service permission to authenticate your credentials and access the specific files you select via Google Drive Picker, strictly in conformance with our Privacy Policy and Google&apos;s API Services User Data Policy.
          </p>
        </section>

        {/* AI Content Disclaimer */}
        <section className="space-y-3 p-5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            5. AI-Generated Content Disclaimer
          </h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            Tutoring explanations, conversational voice responses, roadmap recommendations, and flashcard content are generated using artificial intelligence models. While we strive to provide helpful and accurate educational guidance, AI responses may occasionally contain inaccuracies or errors. The Service is an educational aid and does not constitute formal academic certification or certified professional advice.
          </p>
        </section>

        {/* Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            6. Intellectual Property
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            You retain full ownership of all documents, notes, and study materials you upload to the Service. The Service, its branding, user interface, software code, and distinctive design remain the intellectual property of the developer and its licensors.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            7. Limitation of Liability
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            To the maximum extent permitted by applicable law, the Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. In no event shall the developer or service providers be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        {/* Changes to Terms */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            8. Modifications to Terms
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            We reserve the right to revise or update these Terms of Service at any time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of the Service after changes indicates acceptance of the updated terms.
          </p>
        </section>

        {/* Contact Information */}
        <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            9. Contact Information
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            For questions or inquiries regarding these Terms of Service, please reach out to:
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
