// DomainAndResume.jsx
// Allows candidate to confirm their domain and upload their resume PDF.
// The domain field is pre-filled from their registration profile.

import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

export default function DomainAndResume({ onNext, candidateProfile }) {
  const initialDomain = candidateProfile?.existingDomain || '';
  const [domain, setDomain] = useState(initialDomain);
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState(0);

  const DOMAINS = [
    'Artificial Intelligence', 'Web Development', 'Data Science',
    'Cybersecurity', 'Cloud Computing', 'Mobile Development',
    'DevOps', 'Blockchain', 'Game Development', 'Embedded Systems',
  ];

  const extractTextFromPDF = async (file) => {
    setIsExtracting(true);
    setError('');
    setExtractionDone(false);

    try {
      const buffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(buffer);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      setPageCount(pdf.numPages);

      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(' ') + '\n';
      }

      if (!text.trim()) {
        throw new Error('No extractable text found. Please use a text-based PDF (not a scanned image).');
      }

      setResumeText(text);
      setExtractionDone(true);
    } catch (err) {
      setError(err.message || 'Failed to extract text from PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5 MB. Please upload a smaller PDF.');
      return;
    }
    setResume(file);
    extractTextFromPDF(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!domain) { setError('Please select a domain.'); return; }
    if (!resumeText) { setError('Please upload a resume with extractable text.'); return; }
    onNext(domain, resumeText);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-700 rounded-full opacity-8 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-violet-700 rounded-full opacity-8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            Upload Your <span className="text-indigo-400">Resume</span>
          </h1>
          {candidateProfile && (
            <p className="text-gray-400">
              Welcome, <span className="text-white font-semibold">{candidateProfile.name}</span> —
              confirm your interview domain and upload your resume
            </p>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* Domain */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Interview Domain
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
              >
                <option value="" disabled>Select domain...</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d} className="bg-[#1a1a2e]">{d}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Questions will be tailored to this domain based on your resume
              </p>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Resume (PDF only, max 5 MB)
              </label>

              <label
                htmlFor="resume-upload"
                className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  resume
                    ? 'border-indigo-500/60 bg-indigo-950/20'
                    : 'border-gray-700 hover:border-indigo-500/40 hover:bg-white/3'
                }`}
              >
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isExtracting ? (
                  <div className="space-y-2">
                    <svg className="w-8 h-8 mx-auto text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-indigo-300 font-medium">Extracting text from PDF...</p>
                  </div>
                ) : extractionDone ? (
                  <div className="space-y-1">
                    <svg className="w-10 h-10 mx-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-emerald-300 font-semibold">{resume?.name}</p>
                    <p className="text-gray-500 text-sm">{pageCount} page(s) · {Math.round(resumeText.length / 5)} words extracted</p>
                    <p className="text-indigo-400 text-xs mt-1 underline">Click to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-10 h-10 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-300 font-medium">Drop your resume here or click to browse</p>
                    <p className="text-gray-600 text-sm">PDF files only</p>
                  </div>
                )}
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isExtracting || !extractionDone}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg flex items-center justify-center gap-2"
            >
              {isExtracting ? 'Processing resume...' : (
                <>
                  Start Interview
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          Your resume content is used only to generate personalised interview questions
        </p>
      </div>
    </div>
  );
}