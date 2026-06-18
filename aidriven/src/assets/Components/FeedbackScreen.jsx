import { useMemo } from 'react';

export default function FeedbackScreen({ scores, domain, candidateProfile, onFinish }) {
  const finalScores = {
    technicalSkills: scores?.technicalSkills ?? 70,
    softSkills: scores?.softSkills ?? 70,
    problemSolving: scores?.problemSolving ?? 70,
    technicalQuote: scores?.technicalQuote ?? null,
    softSkillsQuote: scores?.softSkillsQuote ?? null,
    problemSolvingQuote: scores?.problemSolvingQuote ?? null,
  };

  const totalScore = Math.round(
    (finalScores.technicalSkills + finalScores.softSkills + finalScores.problemSolving) / 3
  );

  const isEligible = totalScore >= 50;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 70) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getFeedback = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 50) return 'Needs Improvement';
    return 'Insufficient';
  };

  const getDetailedFeedback = (skillType, score) => {
    const feedbackMap = {
      technicalSkills: {
        excellent: `Outstanding technical depth in ${domain} — accurate, well-structured answers.`,
        good: `Strong ${domain} knowledge demonstrated with correct terminology.`,
        satisfactory: `Adequate ${domain} understanding; some gaps in advanced topics.`,
        needsImprovement: `${domain} fundamentals need reinforcement.`,
        insufficient: `Technical knowledge in ${domain} doesn't meet minimum requirements.`,
      },
      softSkills: {
        excellent: 'Communication was exceptional — clear, confident, and professional.',
        good: 'Clear and professional communication throughout the interview.',
        satisfactory: 'Communication was adequate, though more structure would help.',
        needsImprovement: 'Work on clarity and professional articulation of ideas.',
        insufficient: 'Communication skills need significant improvement.',
      },
      problemSolving: {
        excellent: 'Exceptional analytical thinking with creative, efficient solutions.',
        good: 'Good problem-solving — approached challenges methodically.',
        satisfactory: 'Functional problem-solving, but more structure is needed.',
        needsImprovement: 'Develop a more analytical framework for technical challenges.',
        insufficient: 'Problem-solving skills need significant development.',
      },
    };

    const level =
      score >= 80 ? 'excellent'
      : score >= 70 ? 'good'
      : score >= 60 ? 'satisfactory'
      : score >= 50 ? 'needsImprovement'
      : 'insufficient';

    return feedbackMap[skillType][level];
  };

  const ProgressBar = ({ percentage, label, barColor, quoteText, quoteColor, quoteBorder }) => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold text-gray-200">{label}</span>
        <span className={`text-xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1.5 text-right text-gray-500 text-sm">{getFeedback(percentage)}</div>
      {quoteText && (
        <p className={`mt-2 italic text-sm border-l-2 pl-3 ${quoteColor} ${quoteBorder}`}>
          You said: &ldquo;{quoteText}&rdquo;
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#111] border-b border-gray-800 p-6">
        <h1 className="text-3xl font-black text-center tracking-tight">
          Interview <span className="text-indigo-400">Results</span>
        </h1>
        {candidateProfile && (
          <p className="text-gray-400 text-center mt-1">
            {candidateProfile.name} · {domain} Position
          </p>
        )}
      </header>

      <div className="flex-grow p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6">

        {/* Eligibility Banner */}
        {isEligible ? (
          <div className="bg-emerald-950 border border-emerald-500/40 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-emerald-300 font-bold text-xl">🎉 Congratulations, {candidateProfile?.name}!</h2>
              <p className="text-emerald-400/80 mt-0.5">
                You scored <strong>{totalScore}%</strong> and are eligible for a face-to-face interview.
                Our recruiter team will contact you at{' '}
                <strong>{candidateProfile?.email}</strong> shortly.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-red-300 font-bold text-xl">Not Shortlisted This Time</h2>
              <p className="text-red-400/80 mt-0.5">
                You scored <strong>{totalScore}%</strong>. A minimum of 50% is required for shortlisting.
                Review the feedback below and try again — you can do it!
              </p>
            </div>
          </div>
        )}

        {/* Overall Score */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Overall Score</p>
          <div className={`text-7xl font-black mb-2 ${getScoreColor(totalScore)}`}>
            {totalScore}%
          </div>
          <p className="text-gray-300 text-lg">{getFeedback(totalScore)}</p>
        </div>

        {/* Detailed Scores */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6">Detailed Assessment</h2>

          <ProgressBar
            percentage={finalScores.technicalSkills}
            label="Technical Skills"
            barColor="bg-blue-500"
            quoteText={finalScores.technicalQuote}
            quoteColor="text-blue-400"
            quoteBorder="border-blue-500"
          />
          <ProgressBar
            percentage={finalScores.softSkills}
            label="Communication Skills"
            barColor="bg-violet-500"
            quoteText={finalScores.softSkillsQuote}
            quoteColor="text-violet-400"
            quoteBorder="border-violet-500"
          />
          <ProgressBar
            percentage={finalScores.problemSolving}
            label="Problem Solving"
            barColor="bg-emerald-500"
            quoteText={finalScores.problemSolvingQuote}
            quoteColor="text-emerald-400"
            quoteBorder="border-emerald-500"
          />

          {/* Summary */}
          <div className="mt-6 p-5 bg-[#1a1a1a] rounded-xl border border-gray-700 space-y-3">
            <h3 className="text-lg font-semibold">Feedback Summary</h3>
            <p className="text-gray-300 text-sm">{getDetailedFeedback('technicalSkills', finalScores.technicalSkills)}</p>
            <p className="text-gray-300 text-sm">{getDetailedFeedback('softSkills', finalScores.softSkills)}</p>
            <p className="text-gray-300 text-sm">{getDetailedFeedback('problemSolving', finalScores.problemSolving)}</p>
          </div>
        </div>

        {/* Profile used */}
        {candidateProfile && (
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Interview Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                ['Role', candidateProfile.role],
                ['Domain', candidateProfile.existingDomain],
                ['Experience', candidateProfile.experience],
                ['Education', candidateProfile.education],
                ['Skills', candidateProfile.skills],
              ].map(([label, val]) => (
                <div key={label} className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-white font-medium">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-center pb-6">
          <button
            onClick={onFinish}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}