import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import ChatInterface from "./Screen2/ChatInterface";

export default function SplitScreen({ domain, resumetext, candidateProfile, onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [faceWarning, setFaceWarning] = useState("");
  const [attentionScore, setAttentionScore] = useState(100);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [lookingAway, setLookingAway] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);

  const latestScoresRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const alertCountRef = useRef(0);

  // ─── Webcam ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Webcam error:", error);
        setCameraError(true);
      }
    };
    startWebcam();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ─── Face Detection (with landmarks for gaze estimation) ──────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);

        detectionIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 4) return;

          try {
            const detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
              .withFaceLandmarks(true); // use tiny landmarks

            const count = detections.length;
            setFaceCount(count);

            let warning = "";
            let penalty = 0;
            let away = false;

            if (count === 0) {
              warning = "⚠️ Face not detected — please stay in frame";
              penalty = 3;
              away = true;
              alertCountRef.current += 1;
              addAlert("Face not in frame");
            } else if (count > 1) {
              warning = "⚠️ Multiple faces detected — please interview alone";
              penalty = 2;
              addAlert("Multiple faces detected");
            } else {
              // Single face — check gaze using eye landmarks
              const landmarks = detections[0].landmarks;
              const leftEye = landmarks.getLeftEye();
              const rightEye = landmarks.getRightEye();
              const nose = landmarks.getNose();

              // Simple gaze: compare horizontal center of eyes vs nose tip
              const eyeCenterX = (
                leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length +
                rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length
              ) / 2;
              const noseTipX = nose[3].x; // nose tip
              const gazeOffset = Math.abs(eyeCenterX - noseTipX);

              const box = detections[0].detection.box;
              const faceWidth = box.width;

              // If gaze offset > 25% of face width, candidate might be looking away
              if (gazeOffset > faceWidth * 0.25) {
                warning = "👀 Please look at the camera";
                penalty = 1;
                away = true;
              }
            }

            setFaceWarning(warning);
            setLookingAway(away);

            setAttentionScore((prev) => {
              if (penalty > 0) return Math.max(0, prev - penalty);
              return Math.min(100, prev + 0.5); // gradual recovery
            });

            // Draw overlay on canvas
            if (canvasRef.current && videoRef.current) {
              const canvas = canvasRef.current;
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (count === 1) {
                const box = detections[0].detection.box;
                ctx.strokeStyle = away ? "#f59e0b" : "#10b981";
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Draw landmarks dots
                const lms = detections[0].landmarks.positions;
                ctx.fillStyle = away ? "#f59e0b80" : "#10b98180";
                lms.forEach((pt) => {
                  ctx.beginPath();
                  ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
                  ctx.fill();
                });
              }
            }
          } catch {
            // silent — frame can fail
          }
        }, 2000); // Check every 2 seconds
      } catch (err) {
        console.warn("Face models failed to load:", err.message);
      }
    };

    loadModels();
    return () => clearInterval(detectionIntervalRef.current);
  }, []);

  const addAlert = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    setAlertHistory((prev) => [...prev.slice(-9), `${time}: ${msg}`]);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleMessageCountUpdate = (count, scores) => {
    setMessageCount(count);
    if (scores) latestScoresRef.current = scores;
    if (count >= 3 && !interviewComplete) setInterviewComplete(true);
  };

  const handleCompleteInterview = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    clearInterval(detectionIntervalRef.current);

    // Blend attention score into softSkills (20% weight)
    // Also apply a small penalty for too many face alerts
    const alertPenalty = Math.min(10, alertCountRef.current * 2);
    const adjustedAttention = Math.max(0, attentionScore - alertPenalty);

    const finalScores = latestScoresRef.current
      ? {
          ...latestScoresRef.current,
          softSkills: Math.round(
            latestScoresRef.current.softSkills * 0.8 + adjustedAttention * 0.2
          ),
        }
      : null;

    if (onComplete) onComplete(finalScores);
  };

  const getAttentionColor = () => {
    if (attentionScore >= 80) return "text-emerald-400";
    if (attentionScore >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getAttentionBg = () => {
    if (attentionScore >= 80) return "bg-emerald-500";
    if (attentionScore >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      {/* Top status bar */}
      <div className="bg-[#111] border-b border-gray-800 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Candidate:</span>
          <span className="text-white font-semibold">{candidateProfile?.name}</span>
          <span className="text-gray-600">·</span>
          <span className="text-indigo-300">{domain}</span>
        </div>
        {modelsLoaded && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Attention:</span>
              <span className={`font-bold ${getAttentionColor()}`}>{Math.round(attentionScore)}%</span>
              <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getAttentionBg()}`}
                  style={{ width: `${attentionScore}%` }}
                />
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
              faceCount === 1 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${faceCount === 1 ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
              {faceCount === 0 ? 'No face' : faceCount === 1 ? 'Face OK' : `${faceCount} faces`}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Left — Webcam */}
        <div className="w-1/2 bg-black flex items-center justify-center relative">
          {cameraError ? (
            <div className="text-center text-gray-400 p-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.862v6.276a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-white font-semibold mb-1">Camera unavailable</p>
              <p className="text-sm">Please allow camera access and reload</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {/* Canvas overlay for face landmarks */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none transform scale-x-[-1]"
                style={{ mixBlendMode: 'screen' }}
              />
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${messageCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-white text-sm">{messageCount > 0 ? 'Interview Active' : 'Ready'}</span>
          </div>

          {/* Face warning */}
          {faceWarning && (
            <div className="absolute bottom-4 left-4 right-4 bg-amber-950/90 border border-amber-500/50 text-amber-200 text-sm p-3 rounded-xl text-center font-medium backdrop-blur">
              {faceWarning}
            </div>
          )}

          {/* Alert log */}
          {alertHistory.length > 0 && (
            <div className="absolute top-14 left-4 right-4 bg-black/80 border border-gray-700 rounded-lg p-2 max-h-28 overflow-y-auto">
              <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Alert Log</p>
              {alertHistory.slice(-4).map((a, i) => (
                <p key={i} className="text-red-400 text-xs">{a}</p>
              ))}
            </div>
          )}
        </div>

        {/* Right — Chat */}
        <div className="w-1/2 overflow-hidden border-l border-gray-800">
          <ChatInterface
            domain={domain}
            resumeText={resumetext}
            candidateProfile={candidateProfile}
            onMessageCountUpdate={handleMessageCountUpdate}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#111] border-t border-gray-800 p-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {modelsLoaded
            ? '✅ Face tracking active — stay in frame and look at the camera'
            : '⏳ Loading face detection...'}
        </div>
        <button
          onClick={handleCompleteInterview}
          disabled={!interviewComplete}
          className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all duration-200 ${
            interviewComplete
              ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-gray-800 cursor-not-allowed opacity-50'
          }`}
        >
          {interviewComplete ? '✓ Complete Interview' : 'Answer more questions to finish'}
        </button>
      </div>
    </div>
  );
}