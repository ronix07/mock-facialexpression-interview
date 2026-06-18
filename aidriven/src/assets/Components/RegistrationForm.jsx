import { useState } from 'react';

const DOMAINS = [
  'Artificial Intelligence',
  'Web Development',
  'Data Science',
  'Cybersecurity',
  'Cloud Computing',
  'Mobile Development',
  'DevOps',
  'Blockchain',
  'Game Development',
  'Embedded Systems',
];

const EXPERIENCE_LEVELS = [
  'Fresher (0 years)',
  '1-2 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

export default function RegistrationForm({ onNext }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    education: '',
    skills: '',
    experience: '',
    existingDomain: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Valid email is required';
    if (!form.role.trim()) errs.role = 'Job role is required';
    if (!form.education.trim()) errs.education = 'Education is required';
    if (!form.skills.trim()) errs.skills = 'At least one skill is required';
    if (!form.experience) errs.experience = 'Experience level is required';
    if (!form.existingDomain) errs.existingDomain = 'Select your domain';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    // Slight delay for UX
    setTimeout(() => {
      onNext({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role.trim(),
        education: form.education.trim(),
        skills: form.skills.trim(),
        experience: form.experience,
        existingDomain: form.existingDomain,
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center p-6">
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Interview Platform
          </div>
          <h1
            className="text-5xl font-black tracking-tight mb-2"
            style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.03em' }}
          >
            Dual<span className="text-indigo-400">Prep</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Fill in your details to begin your AI mock interview
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="Full Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Arjun Sharma"
              />
              <Field
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="arjun@gmail.com"
              />
            </div>

            {/* Role + Domain */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="Job Role Applying For"
                name="role"
                value={form.role}
                onChange={handleChange}
                error={errors.role}
                placeholder="Frontend Engineer"
              />
              <SelectField
                label="Your Primary Domain"
                name="existingDomain"
                value={form.existingDomain}
                onChange={handleChange}
                error={errors.existingDomain}
                options={DOMAINS}
                placeholder="Select domain..."
              />
            </div>

            {/* Education */}
            <Field
              label="Education"
              name="education"
              value={form.education}
              onChange={handleChange}
              error={errors.education}
              placeholder="B.Tech Computer Science — XYZ University (2024)"
            />

            {/* Skills */}
            <Field
              label="Key Skills"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              error={errors.skills}
              placeholder="React, Node.js, Python, SQL, AWS..."
              hint="Separate skills with commas"
            />

            {/* Experience */}
            <SelectField
              label="Years of Experience"
              name="experience"
              value={form.experience}
              onChange={handleChange}
              error={errors.experience}
              options={EXPERIENCE_LEVELS}
              placeholder="Select experience..."
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg tracking-wide flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Setting up your interview...
                </>
              ) : (
                <>
                  Begin Interview Setup
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Candidates scoring 60%+ are shortlisted for face-to-face interviews
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, name, type = 'text', value, onChange, error, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-red-500/70 focus:ring-red-500/40'
            : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50'
        }`}
      />
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, options, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1.5">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#1a1a2e] border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
          error
            ? 'border-red-500/70 focus:ring-red-500/40'
            : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50'
        }`}
      >
        <option value="" disabled className="text-gray-500">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-white bg-[#1a1a2e]">
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
