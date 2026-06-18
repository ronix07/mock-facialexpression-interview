import { useState } from 'react'
import './App.css'
import RegistrationForm from './assets/Components/RegistrationForm'
import DomainAndResume from './assets/Components/DomainAndResume'
import SplitScreen from './assets/Components/SplitScreen'
import FeedbackScreen from './assets/Components/FeedbackScreen'
import { resetTopics } from './services/cohereService'
import { saveEligibleCandidate } from './services/firestoreService'
import { sendSelectionEmail } from './services/emailService'

function App() {
  const [screen, setScreen] = useState('register');
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [domainData, setDomainData] = useState({ domain: '', resumeText: '' });
  const [scores, setScores] = useState(null);

  // Step 1 → Registration complete
  const handleRegistrationComplete = (profile) => {
    setCandidateProfile(profile);
    setScreen('domainResume');
  };

  // Step 2 → Domain & resume selected
  const handleDomainResumeNext = (domain, resumeText) => {
    resetTopics();
    setDomainData({ domain, resumeText });
    setScreen('interview');
  };

  // Step 3 → Interview complete, compute final score
  const handleInterviewComplete = async (interviewScores) => {
    const finalScores = interviewScores || {
      technicalSkills: 50,
      softSkills: 50,
      problemSolving: 50,
      technicalQuote: null,
      softSkillsQuote: null,
      problemSolvingQuote: null,
    };

    setScores(finalScores);

    // Calculate overall score
    const overall = Math.round(
      (finalScores.technicalSkills + finalScores.softSkills + finalScores.problemSolving) / 3
    );

    // Save to Firestore if score ≥ 50 AND send selection email automatically
    if (overall >= 50 && candidateProfile) {
      // Fire both in parallel — don't let one failure block the other
      const [firestoreResult, emailResult] = await Promise.allSettled([
        saveEligibleCandidate({
          ...candidateProfile,
          domain: domainData.domain,
          scores: finalScores,
          overallScore: overall,
          interviewDate: new Date().toISOString(),
        }),
        sendSelectionEmail({
          name: candidateProfile.name,
          email: candidateProfile.email,
          role: candidateProfile.role,
          domain: domainData.domain,
          overallScore: overall,
        }),
      ]);

      if (firestoreResult.status === 'fulfilled') {
        console.log('Eligible candidate saved to Firestore');
      } else {
        console.error('Firestore save failed:', firestoreResult.reason);
      }

      if (emailResult.status === 'fulfilled' && emailResult.value?.success) {
        console.log('Selection email sent to', candidateProfile.email);
      } else {
        console.error(
          'Email sending failed:',
          emailResult.reason || emailResult.value?.error
        );
      }
    }

    setScreen('feedback');
  };

  // Step 4 → Restart
  const handleFinish = () => {
    setCandidateProfile(null);
    setDomainData({ domain: '', resumeText: '' });
    setScores(null);
    setScreen('register');
  };

  return (
    <>
      {screen === 'register' && (
        <RegistrationForm onNext={handleRegistrationComplete} />
      )}
      {screen === 'domainResume' && (
        <DomainAndResume onNext={handleDomainResumeNext} />
      )}
      {screen === 'interview' && (
        <SplitScreen
          domain={domainData.domain}
          resumetext={domainData.resumeText}
          candidateProfile={candidateProfile}
          onComplete={handleInterviewComplete}
        />
      )}
      {screen === 'feedback' && (
        <FeedbackScreen
          scores={scores}
          domain={domainData.domain}
          candidateProfile={candidateProfile}
          onFinish={handleFinish}
        />
      )}
    </>
  );
}

export default App;